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

  const destinationId = parseId(req.query.id);
  if (!destinationId) {
    res.status(400).json({ error: 'Invalid destination id' });
    return;
  }

  const supabase = getSupabaseAdmin();

  const { data: destination, error: destinationError } = await supabase
    .from('destinations')
    .select('id')
    .eq('id', destinationId)
    .maybeSingle();

  if (destinationError) {
    serverError(res, 'Unable to load photos');
    return;
  }
  if (!destination) {
    res.status(404).json({ error: 'Destination not found' });
    return;
  }

  const { data, error } = await supabase
    .from('photos')
    .select('id, destination_id, image_path, caption, date_taken, created_at')
    .eq('destination_id', destinationId)
    .order('created_at', { ascending: false });

  if (error) {
    serverError(res, 'Unable to load photos');
    return;
  }

  const photos = await Promise.all(
    (data ?? []).map(async (photo) => {
      const { data: signed, error: signedError } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .createSignedUrl(photo.image_path, SIGNED_URL_EXPIRES_IN);

      return {
        ...photo,
        signed_url: signedError ? null : (signed?.signedUrl ?? null),
      };
    }),
  );

  res.status(200).json({ photos });
}

module.exports = withErrorHandling(handler);
