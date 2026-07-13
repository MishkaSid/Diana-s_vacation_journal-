function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  res.status(405).json({ error: 'Method not allowed' });
}

function serverError(res, fallback) {
  if (!res.headersSent) {
    res.status(500).json({ error: fallback });
  }
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  if (typeof req.body === 'string' && req.body.length > 0) {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }

  return null;
}

function parseId(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

function extensionForMime(mimeType) {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
}

function withErrorHandling(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      const message =
        error instanceof Error &&
        (error.message.includes('Missing SUPABASE') ||
          error.message.includes('SESSION_SECRET'))
          ? 'Server configuration error'
          : 'Internal server error';
      console.error('[api]', error);
      serverError(res, message);
    }
  };
}

module.exports = {
  methodNotAllowed,
  serverError,
  readJsonBody,
  parseId,
  extensionForMime,
  withErrorHandling,
};
