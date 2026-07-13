import type { VercelRequest, VercelResponse } from '@vercel/node';

export function methodNotAllowed(
  res: VercelResponse,
  allowed: string[],
): void {
  res.setHeader('Allow', allowed.join(', '));
  res.status(405).json({ error: 'Method not allowed' });
}

export function serverError(res: VercelResponse, fallback: string): void {
  res.status(500).json({ error: fallback });
}

export async function readJsonBody<T>(
  req: VercelRequest,
): Promise<T | null> {
  if (req.body && typeof req.body === 'object') {
    return req.body as T;
  }

  if (typeof req.body === 'string' && req.body.length > 0) {
    try {
      return JSON.parse(req.body) as T;
    } catch {
      return null;
    }
  }

  return null;
}

export function parseId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
}
