const { buildClearedSessionCookie } = require('../lib/auth');
const { methodNotAllowed, withErrorHandling } = require('../lib/http');

function handler(req, res) {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  res.setHeader('Set-Cookie', buildClearedSessionCookie());
  res.status(200).json({ ok: true });
}

module.exports = withErrorHandling(handler);
