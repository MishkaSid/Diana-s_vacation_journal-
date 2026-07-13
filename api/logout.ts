import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildClearedSessionCookie } from '../_lib/auth';
import { methodNotAllowed } from '../_lib/http';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  res.setHeader('Set-Cookie', buildClearedSessionCookie());
  res.status(200).json({ ok: true });
}
