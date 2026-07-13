const { randomUUID } = require('crypto');
const { requireAuth } = require('../../lib/auth');
const {
  extensionForMime,
  methodNotAllowed,
  readJsonBody,
  serverError,
  withErrorHandling,
} = require('../../lib/http');
const {
  ALLOWED_MIME_TYPES,
  getSupabaseAdmin,
  MAX_UPLOAD_BYTES,
  PHOTOS_BUCKET,
} = require('../../lib/supabaseAdmin');

async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const body = await readJsonBody(req);
  const destinationId = Number(body?.destinationId);
  const mimeType = body?.mimeType?.trim() ?? '';
  const fileName = body?.fileName?.trim() ?? 'photo';

  if (!Number.isInteger(destinationId) || destinationId <= 0) {
    res.status(400).json({ error: 'destinationId is required' });
    return;
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    res.status(400).json({ error: 'Unsupported file type' });
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data: destination, error: destinationError } = await supabase
    .from('destinations')
    .select('id')
    .eq('id', destinationId)
    .maybeSingle();

  if (destinationError) {
    serverError(res, 'Unable to prepare upload');
    return;
  }
  if (!destination) {
    res.status(404).json({ error: 'Destination not found' });
    return;
  }

  const path = `${destinationId}/${randomUUID()}-${fileName
    .replace(/[^\w.\-]+/g, '_')
    .slice(0, 80)}.${extensionForMime(mimeType)}`;

  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    serverError(res, 'Unable to prepare upload');
    return;
  }

  res.status(200).json({
    path: data.path,
    token: data.token,
    signedUrl: data.signedUrl,
    maxBytes: MAX_UPLOAD_BYTES,
  });
}

module.exports = withErrorHandling(handler);
