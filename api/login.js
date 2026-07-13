const bcrypt = require('bcryptjs');
const {
  buildSessionCookie,
  createSessionToken,
} = require('../lib/auth');
const {
  methodNotAllowed,
  readJsonBody,
  serverError,
  withErrorHandling,
} = require('../lib/http');
const { getSupabaseAdmin } = require('../lib/supabaseAdmin');

async function handler(req, res) {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const body = await readJsonBody(req);
  const username = body?.username?.trim() ?? '';
  const password = body?.password ?? '';

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('app_settings')
    .select('username, password')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) {
    serverError(res, 'Unable to verify credentials');
    return;
  }

  const usernameMatches = data.username === username;
  const passwordLooksHashed =
    typeof data.password === 'string' && data.password.startsWith('$2');

  if (!passwordLooksHashed) {
    res.status(500).json({
      error:
        'Password is not hashed. Run the password migration before logging in.',
    });
    return;
  }

  const passwordMatches = bcrypt.compareSync(password, data.password);

  if (!usernameMatches || !passwordMatches) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  const token = createSessionToken();
  res.setHeader('Set-Cookie', buildSessionCookie(token));
  res.status(200).json({ ok: true });
}

module.exports = withErrorHandling(handler);
