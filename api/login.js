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

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (error) {
    serverError(
      res,
      'Server configuration error. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on Vercel.',
    );
    return;
  }

  const { data, error } = await supabase
    .from('app_settings')
    .select('username, password')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('[login] app_settings query failed', error.message);
    serverError(
      res,
      'Unable to verify credentials. Check database access and app_settings row.',
    );
    return;
  }

  if (!data) {
    serverError(
      res,
      'Journal login is not configured. Insert a row into app_settings.',
    );
    return;
  }

  const storedHash =
    typeof data.password === 'string' ? data.password.trim() : '';
  const passwordLooksHashed = /^\$2[aby]?\$/.test(storedHash);

  if (!passwordLooksHashed) {
    res.status(500).json({
      error:
        'Password is not hashed. Run: npm run hash-password with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    });
    return;
  }

  let passwordMatches = false;
  try {
    passwordMatches = bcrypt.compareSync(password, storedHash);
  } catch (error) {
    console.error('[login] bcrypt compare failed', error);
    serverError(
      res,
      'Stored password hash is invalid. Re-run the password hash script.',
    );
    return;
  }

  const usernameMatches = data.username === username;

  if (!usernameMatches || !passwordMatches) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  let token;
  try {
    token = createSessionToken();
  } catch {
    serverError(
      res,
      'Server configuration error. Check SESSION_SECRET on Vercel.',
    );
    return;
  }

  res.setHeader('Set-Cookie', buildSessionCookie(token));
  res.status(200).json({ ok: true });
}

module.exports = withErrorHandling(handler);
