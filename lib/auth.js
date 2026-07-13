const { createHmac, timingSafeEqual } = require('crypto');

const SESSION_COOKIE = 'dj_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    return null;
  }
  return secret;
}

function encodePart(value) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodePart(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(body, secret) {
  return createHmac('sha256', secret).update(body).digest('base64url');
}

function createSessionToken() {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error('SESSION_SECRET is missing or too short');
  }

  const payload = {
    sub: 'journal',
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = encodePart(JSON.stringify(payload));
  return `${body}.${sign(body, secret)}`;
}

function verifySessionToken(token) {
  if (!token) return false;

  const secret = getSessionSecret();
  if (!secret) return false;

  const [body, signature] = token.split('.');
  if (!body || !signature) return false;

  try {
    const expected = sign(body, secret);
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      return false;
    }

    const payload = JSON.parse(decodePart(body));
    if (payload.sub !== 'journal') return false;
    if (typeof payload.exp !== 'number') return false;
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return undefined;
  const parts = header.split(';');
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (rawKey === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return undefined;
}

function isAuthenticated(req) {
  try {
    return verifySessionToken(readCookie(req, SESSION_COOKIE));
  } catch {
    return false;
  }
}

function requireAuth(req, res) {
  if (isAuthenticated(req)) return true;
  res.status(401).json({ error: 'Unauthorized' });
  return false;
}

function isSecureCookie() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
}

function buildSessionCookie(token) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (isSecureCookie()) parts.push('Secure');
  return parts.join('; ');
}

function buildClearedSessionCookie() {
  const parts = [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (isSecureCookie()) parts.push('Secure');
  return parts.join('; ');
}

module.exports = {
  SESSION_COOKIE,
  createSessionToken,
  verifySessionToken,
  readCookie,
  isAuthenticated,
  requireAuth,
  buildSessionCookie,
  buildClearedSessionCookie,
};
