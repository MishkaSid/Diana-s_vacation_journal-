const { randomUUID } = require('crypto');
const { requireAuth } = require('../../../lib/auth');
const {
  extensionForMime,
  methodNotAllowed,
  parseId,
  readJsonBody,
  serverError,
  withErrorHandling,
} = require('../../../lib/http');
const {
  ALLOWED_MIME_TYPES,
  createSignedUrlSafe,
  ensurePhotosBucket,
  getSupabaseAdmin,
  MAX_UPLOAD_BYTES,
  PHOTOS_BUCKET,
} = require('../../../lib/supabaseAdmin');

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

async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  const id = parseId(req.query.id);
  if (!id) {
    res.status(400).json({ error: 'Invalid destination id' });
    return;
  }

  const supabase = getSupabaseAdmin();

  if (req.method === 'PATCH') {
    const body = await readJsonBody(req);
    const name = body?.name?.trim() ?? '';
    if (!name) {
      res.status(400).json({ error: 'Destination name is required' });
      return;
    }

    const { data: existing } = await supabase
      .from('destinations')
      .select('id, cover_image_path')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      res.status(404).json({ error: 'Destination not found' });
      return;
    }

    const payload = {
      name,
      flag: body?.flag?.trim() || null,
      description: body?.description?.trim() || null,
    };

    if (body?.clearCover) {
      payload.cover_image_path = null;
      if (existing.cover_image_path) {
        await supabase.storage
          .from(PHOTOS_BUCKET)
          .remove([existing.cover_image_path]);
      }
    }

    if (body?.coverImageBase64 && body?.coverMimeType) {
      try {
        const coverPath = await uploadCoverImage(
          supabase,
          id,
          body.coverMimeType,
          body.coverFileName || 'cover',
          body.coverImageBase64,
        );
        if (existing.cover_image_path) {
          await supabase.storage
            .from(PHOTOS_BUCKET)
            .remove([existing.cover_image_path]);
        }
        payload.cover_image_path = coverPath;
      } catch (coverError) {
        res.status(400).json({
          error:
            coverError instanceof Error
              ? coverError.message
              : 'Unable to upload cover image',
        });
        return;
      }
    }

    const { data, error } = await supabase
      .from('destinations')
      .update(payload)
      .eq('id', id)
      .select('id, name, flag, description, cover_image_path, created_at')
      .maybeSingle();

    if (error) {
      if (/cover_image_path/i.test(error.message || '')) {
        const { cover_image_path: _ignored, ...withoutCover } = payload;
        const fallback = await supabase
          .from('destinations')
          .update(withoutCover)
          .eq('id', id)
          .select('id, name, flag, description, created_at')
          .maybeSingle();
        if (fallback.error || !fallback.data) {
          serverError(res, 'Unable to update destination. Run migration 003_destination_cover.sql');
          return;
        }
        res.status(200).json({
          destination: {
            ...fallback.data,
            cover_image_path: null,
            cover_signed_url: null,
          },
        });
        return;
      }
      serverError(res, 'Unable to update destination');
      return;
    }
    if (!data) {
      res.status(404).json({ error: 'Destination not found' });
      return;
    }

    res.status(200).json({
      destination: {
        ...data,
        cover_signed_url: await createSignedUrlSafe(supabase, data.cover_image_path),
      },
    });
    return;
  }

  if (req.method === 'DELETE') {
    const { data: existing } = await supabase
      .from('destinations')
      .select('id, cover_image_path')
      .eq('id', id)
      .maybeSingle();

    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('id, image_path')
      .eq('destination_id', id);

    if (photosError) {
      serverError(res, 'Unable to delete destination');
      return;
    }

    const paths = (photos ?? [])
      .map((photo) => photo.image_path)
      .filter(Boolean);

    if (existing?.cover_image_path) {
      paths.push(existing.cover_image_path);
    }

    if (paths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .remove(paths);
      if (storageError) {
        serverError(res, 'Unable to delete destination photos from storage');
        return;
      }

      const { error: deletePhotosError } = await supabase
        .from('photos')
        .delete()
        .eq('destination_id', id);
      if (deletePhotosError) {
        serverError(res, 'Unable to delete destination photos');
        return;
      }
    }

    const { data: deleted, error } = await supabase
      .from('destinations')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      serverError(res, 'Unable to delete destination');
      return;
    }
    if (!deleted) {
      res.status(404).json({ error: 'Destination not found' });
      return;
    }

    res.status(200).json({ ok: true });
    return;
  }

  methodNotAllowed(res, ['PATCH', 'DELETE']);
}

module.exports = withErrorHandling(handler);
