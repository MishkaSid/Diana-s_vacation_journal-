const { requireAuth } = require('../../../lib/auth');
const {
  methodNotAllowed,
  parseId,
  serverError,
  withErrorHandling,
} = require('../../../lib/http');
const {
  getSupabaseAdmin,
  PHOTOS_BUCKET,
  SIGNED_URL_EXPIRES_IN,
} = require('../../../lib/supabaseAdmin');

async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  const id = parseId(req.query.id);
  if (!id) {
    res.status(400).json({ error: 'Invalid photo id' });
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data: photo, error } = await supabase
    .from('photos')
    .select('id, image_path')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    serverError(res, 'Unable to create photo URL');
    return;
  }
  if (!photo) {
    res.status(404).json({ error: 'Photo not found' });
    return;
  }

  const { data, error: signedError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrl(photo.image_path, SIGNED_URL_EXPIRES_IN);

  if (signedError || !data?.signedUrl) {
    serverError(res, 'Unable to create photo URL');
    return;
  }

  res.status(200).json({
    url: data.signedUrl,
    expires_in: SIGNED_URL_EXPIRES_IN,
  });
}

module.exports = withErrorHandling(handler);
