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
  ensurePhotosBucket,
  getSupabaseAdmin,
  MAX_UPLOAD_BYTES,
  PHOTOS_BUCKET,
  SIGNED_URL_EXPIRES_IN,
} = require('../../lib/supabaseAdmin');

function decodeBase64Image(imageBase64) {
  const raw = String(imageBase64 || '');
  const cleaned = raw.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
  return Buffer.from(cleaned, 'base64');
}

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
  const imageBase64 = body?.imageBase64;

  if (!Number.isInteger(destinationId) || destinationId <= 0) {
    res.status(400).json({ error: 'destinationId is required' });
    return;
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    res.status(400).json({ error: 'Unsupported file type' });
    return;
  }

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    res.status(400).json({ error: 'imageBase64 is required' });
    return;
  }

  let buffer;
  try {
    buffer = decodeBase64Image(imageBase64);
  } catch {
    res.status(400).json({ error: 'Invalid image data' });
    return;
  }

  if (!buffer.length) {
    res.status(400).json({ error: 'Invalid image data' });
    return;
  }

  if (buffer.length > MAX_UPLOAD_BYTES) {
    res.status(400).json({ error: 'Image is too large after compression' });
    return;
  }

  const supabase = getSupabaseAdmin();

  const { data: destination, error: destinationError } = await supabase
    .from('destinations')
    .select('id')
    .eq('id', destinationId)
    .maybeSingle();

  if (destinationError) {
    serverError(res, 'Unable to upload photo');
    return;
  }
  if (!destination) {
    res.status(404).json({ error: 'Destination not found' });
    return;
  }

  await ensurePhotosBucket(supabase);

  const path = `${destinationId}/${randomUUID()}-${fileName
    .replace(/[^\w.\-]+/g, '_')
    .slice(0, 80)}.${extensionForMime(mimeType)}`;

  const { error: uploadError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    console.error('[photos/upload] storage upload failed', uploadError.message);
    serverError(
      res,
      uploadError.message?.includes('Bucket not found')
        ? 'Storage bucket "vacation-photos" was not found. Create it in Supabase Storage (private).'
        : 'Unable to upload photo to storage',
    );
    return;
  }

  const { data, error } = await supabase
    .from('photos')
    .insert({
      destination_id: destinationId,
      image_path: path,
      caption: body?.caption?.trim() || null,
      date_taken: body?.date_taken || null,
    })
    .select('id, destination_id, image_path, caption, date_taken, created_at')
    .single();

  if (error || !data) {
    await supabase.storage.from(PHOTOS_BUCKET).remove([path]);
    console.error('[photos/upload] db insert failed', error?.message);
    serverError(res, 'Unable to save photo metadata');
    return;
  }

  const { data: signed } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRES_IN);

  res.status(201).json({
    photo: {
      ...data,
      signed_url: signed?.signedUrl ?? null,
    },
  });
}

module.exports = withErrorHandling(handler);
