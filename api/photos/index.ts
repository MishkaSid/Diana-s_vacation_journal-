import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import {
  methodNotAllowed,
  readJsonBody,
  serverError,
  withErrorHandling,
} from '../../lib/http';
import {
  getSupabaseAdmin,
  PHOTOS_BUCKET,
  SIGNED_URL_EXPIRES_IN,
} from '../../lib/supabaseAdmin';

interface CreatePhotoBody {
  destination_id?: number;
  image_path?: string;
  caption?: string | null;
  date_taken?: string | null;
}

async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res)) return;

  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const body = await readJsonBody<CreatePhotoBody>(req);
  const destinationId = Number(body?.destination_id);
  const imagePath = body?.image_path?.trim() ?? '';

  if (!Number.isInteger(destinationId) || destinationId <= 0 || !imagePath) {
    res.status(400).json({ error: 'destination_id and image_path are required' });
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

  const { data, error } = await supabase
    .from('photos')
    .insert({
      destination_id: destinationId,
      image_path: imagePath,
      caption: body?.caption?.trim() || null,
      date_taken: body?.date_taken || null,
    })
    .select('id, destination_id, image_path, caption, date_taken, created_at')
    .single();

  if (error || !data) {
    await supabase.storage.from(PHOTOS_BUCKET).remove([imagePath]);
    serverError(res, 'Unable to upload photo');
    return;
  }

  const { data: signed } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrl(imagePath, SIGNED_URL_EXPIRES_IN);

  res.status(201).json({
    photo: {
      ...data,
      signed_url: signed?.signedUrl ?? null,
    },
  });
}

export default withErrorHandling(handler);
