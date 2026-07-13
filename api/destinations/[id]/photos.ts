import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../_lib/auth';
import { methodNotAllowed, parseId, serverError } from '../../../_lib/http';
import {
  getSupabaseAdmin,
  PHOTOS_BUCKET,
  SIGNED_URL_EXPIRES_IN,
} from '../../../_lib/supabaseAdmin';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
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

  try {
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
  } catch {
    serverError(res, 'Unable to load photos');
  }
}
