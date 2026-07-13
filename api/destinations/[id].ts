import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../_lib/auth';
import {
  methodNotAllowed,
  parseId,
  readJsonBody,
  serverError,
} from '../../_lib/http';
import { getSupabaseAdmin, PHOTOS_BUCKET } from '../../_lib/supabaseAdmin';

interface UpdateBody {
  name?: string;
  flag?: string | null;
  description?: string | null;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (!requireAuth(req, res)) return;

  const id = parseId(req.query.id);
  if (!id) {
    res.status(400).json({ error: 'Invalid destination id' });
    return;
  }

  try {
    const supabase = getSupabaseAdmin();

    if (req.method === 'PATCH') {
      const body = await readJsonBody<UpdateBody>(req);
      const name = body?.name?.trim() ?? '';
      if (!name) {
        res.status(400).json({ error: 'Destination name is required' });
        return;
      }

      const { data, error } = await supabase
        .from('destinations')
        .update({
          name,
          flag: body?.flag?.trim() || null,
          description: body?.description?.trim() || null,
        })
        .eq('id', id)
        .select('id, name, flag, description, created_at')
        .maybeSingle();

      if (error) {
        serverError(res, 'Unable to update destination');
        return;
      }
      if (!data) {
        res.status(404).json({ error: 'Destination not found' });
        return;
      }

      res.status(200).json({ destination: data });
      return;
    }

    if (req.method === 'DELETE') {
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
  } catch {
    serverError(res, 'Unable to process destination request');
  }
}
