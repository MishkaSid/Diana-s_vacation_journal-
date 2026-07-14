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
  createSignedUrlSafe,
  ensurePhotosBucket,
  getSupabaseAdmin,
  MAX_UPLOAD_BYTES,
  PHOTOS_BUCKET,
} = require('../../lib/supabaseAdmin');

function decodeBase64Image(imageBase64) {
  const raw = String(imageBase64 || '');
  const cleaned = raw.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
  return Buffer.from(cleaned, 'base64');
}

async function uploadCoverImage(supabase, destinationId, mimeType, fileName, imageBase64) {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error('Unsupported cover image type');
  }

  const buffer = decodeBase64Image(imageBase64);
  if (!buffer.length) throw new Error('Invalid cover image data');
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error('Cover image is too large after compression');
  }

  await ensurePhotosBucket(supabase);

  const path = `covers/${destinationId}/${randomUUID()}.${extensionForMime(mimeType)}`;
  const { error: uploadError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: false });

  if (uploadError) {
    throw new Error(
      uploadError.message?.includes('Bucket not found')
        ? 'Storage bucket "vacation-photos" was not found. Create it in Supabase Storage (private).'
        : 'Unable to upload cover image',
    );
  }

  return path;
}

async function attachCoverUrls(supabase, destinations) {
  return Promise.all(
    (destinations || []).map(async (destination) => ({
      ...destination,
      cover_signed_url: await createSignedUrlSafe(
        supabase,
        destination.cover_image_path,
      ),
    })),
  );
}

async function ensureItalySeed() {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from('destinations')
    .select('*', { count: 'exact', head: true });

  if (error) throw error;
  if ((count ?? 0) > 0) return;

  const { error: insertError } = await supabase.from('destinations').insert({
    name: 'Italy',
    flag: '🇮🇹',
    description:
      'A dreamy journey through cobblestone streets, sunlit piazzas, and timeless coastlines.',
  });
  if (insertError) throw insertError;
}

async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    await ensureItalySeed();
    const { data, error } = await supabase
      .from('destinations')
      .select('id, name, flag, description, cover_image_path, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      // Older DBs without cover_image_path still work.
      if (/cover_image_path/i.test(error.message || '')) {
        const fallback = await supabase
          .from('destinations')
          .select('id, name, flag, description, created_at')
          .order('created_at', { ascending: true });
        if (fallback.error) {
          serverError(res, 'Unable to load destinations');
          return;
        }
        res.status(200).json({
          destinations: (fallback.data || []).map((d) => ({
            ...d,
            cover_image_path: null,
            cover_signed_url: null,
          })),
        });
        return;
      }
      serverError(res, 'Unable to load destinations');
      return;
    }

    const destinations = await attachCoverUrls(supabase, data);
    res.status(200).json({ destinations });
    return;
  }

  if (req.method === 'POST') {
    const body = await readJsonBody(req);
    const name = body?.name?.trim() ?? '';
    if (!name) {
      res.status(400).json({ error: 'Destination name is required' });
      return;
    }

    const payload = {
      name,
      flag: body?.flag?.trim() || null,
      description: body?.description?.trim() || null,
    };

    const { data, error } = await supabase
      .from('destinations')
      .insert(payload)
      .select('id, name, flag, description, cover_image_path, created_at')
      .single();

    if (error || !data) {
      if (error && /cover_image_path/i.test(error.message || '')) {
        const fallback = await supabase
          .from('destinations')
          .insert({
            name: payload.name,
            flag: payload.flag,
            description: payload.description,
          })
          .select('id, name, flag, description, created_at')
          .single();
        if (fallback.error || !fallback.data) {
          serverError(res, 'Unable to create destination');
          return;
        }
        res.status(201).json({
          destination: {
            ...fallback.data,
            cover_image_path: null,
            cover_signed_url: null,
          },
        });
        return;
      }
      serverError(res, 'Unable to create destination');
      return;
    }

    let destination = data;

    if (body?.coverImageBase64 && body?.coverMimeType) {
      try {
        const coverPath = await uploadCoverImage(
          supabase,
          destination.id,
          body.coverMimeType,
          body.coverFileName || 'cover',
          body.coverImageBase64,
        );
        const { data: updated, error: updateError } = await supabase
          .from('destinations')
          .update({ cover_image_path: coverPath })
          .eq('id', destination.id)
          .select('id, name, flag, description, cover_image_path, created_at')
          .single();
        if (!updateError && updated) destination = updated;
      } catch (coverError) {
        console.error('[destinations] cover upload failed', coverError);
      }
    }

    res.status(201).json({
      destination: {
        ...destination,
        cover_signed_url: await createSignedUrlSafe(
          supabase,
          destination.cover_image_path,
        ),
      },
    });
    return;
  }

  methodNotAllowed(res, ['GET', 'POST']);
}

module.exports = withErrorHandling(handler);
