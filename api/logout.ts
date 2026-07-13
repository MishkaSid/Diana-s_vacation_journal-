import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildClearedSessionCookie } from '../lib/auth';
import { methodNotAllowed, withErrorHandling } from '../lib/http';

function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  res.setHeader('Set-Cookie', buildClearedSessionCookie());
  res.status(200).json({ ok: true });
}

export default withErrorHandling(handler);
