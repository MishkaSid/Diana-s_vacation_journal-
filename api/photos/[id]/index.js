const { requireAuth } = require('../../../lib/auth');
const {
  methodNotAllowed,
  parseId,
  readJsonBody,
  serverError,
  withErrorHandling,
} = require('../../../lib/http');
const { getSupabaseAdmin, PHOTOS_BUCKET } = require('../../../lib/supabaseAdmin');

async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  const id = parseId(req.query.id);
  if (!id) {
    res.status(400).json({ error: 'Invalid photo id' });
    return;
  }

  const supabase = getSupabaseAdmin();

  if (req.method === 'PATCH') {
    const body = await readJsonBody(req);
    const payload = {};
    if (body && Object.prototype.hasOwnProperty.call(body, 'caption')) {
      payload.caption = body.caption?.trim() || null;
    }
    if (body && Object.prototype.hasOwnProperty.call(body, 'date_taken')) {
      payload.date_taken = body.date_taken || null;
    }

    const { data, error } = await supabase
      .from('photos')
      .update(payload)
      .eq('id', id)
      .select('id, destination_id, image_path, caption, date_taken, created_at')
      .maybeSingle();

    if (error) {
      serverError(res, 'Unable to update photo');
      return;
    }
    if (!data) {
      res.status(404).json({ error: 'Photo not found' });
      return;
    }

    res.status(200).json({ photo: data });
    return;
  }

  if (req.method === 'DELETE') {
    const { data: photo, error: loadError } = await supabase
      .from('photos')
      .select('id, image_path')
      .eq('id', id)
      .maybeSingle();

    if (loadError) {
      serverError(res, 'Unable to delete photo');
      return;
    }
    if (!photo) {
      res.status(404).json({ error: 'Photo not found' });
      return;
    }

    const { error: storageError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .remove([photo.image_path]);

    if (storageError) {
      serverError(res, 'Unable to delete photo file from storage');
      return;
    }

    const { error: deleteError } = await supabase
      .from('photos')
      .delete()
      .eq('id', id);

    if (deleteError) {
      serverError(res, 'Unable to delete photo');
      return;
    }

    res.status(200).json({ ok: true });
    return;
  }

  methodNotAllowed(res, ['PATCH', 'DELETE']);
}

module.exports = withErrorHandling(handler);
