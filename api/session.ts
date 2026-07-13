import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAuthenticated } from '../lib/auth';
import { methodNotAllowed, withErrorHandling } from '../lib/http';

function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  res.status(200).json({ authenticated: isAuthenticated(req) });
}

export default withErrorHandling(handler);
