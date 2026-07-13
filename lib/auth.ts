import { createHmac, timingSafeEqual } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const SESSION_COOKIE = 'dj_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

interface SessionPayload {
  sub: 'journal';
  exp: number;
}

function getSessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    return null;
  }
  return secret;
}

function encodePart(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodePart(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url');
}

export function createSessionToken(): string {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error('SESSION_SECRET is missing or too short');
  }

  const payload: SessionPayload = {
    sub: 'journal',
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = encodePart(JSON.stringify(payload));
  return `${body}.${sign(body, secret)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
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

    const payload = JSON.parse(decodePart(body)) as SessionPayload;
    if (payload.sub !== 'journal') return false;
    if (typeof payload.exp !== 'number') return false;
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

export function readCookie(
  req: VercelRequest,
  name: string,
): string | undefined {
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

export function isAuthenticated(req: VercelRequest): boolean {
  try {
    return verifySessionToken(readCookie(req, SESSION_COOKIE));
  } catch {
    return false;
  }
}

export function requireAuth(
  req: VercelRequest,
  res: VercelResponse,
): boolean {
  if (isAuthenticated(req)) return true;
  res.status(401).json({ error: 'Unauthorized' });
  return false;
}

function isSecureCookie(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
}

export function buildSessionCookie(token: string): string {
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

export function buildClearedSessionCookie(): string {
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
