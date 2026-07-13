import { PHOTOS_BUCKET } from '../data/initialData';
import type {
  AppSettings,
  AppSettingsRow,
  Destination,
  DestinationInput,
  DestinationRow,
  JournalExport,
  PhotoMetadataUpdate,
  PhotoRow,
  VacationPhoto,
} from '../types';
import { processImageFile, safeStorageFileName } from '../utils/imageProcessing';
import { supabase } from '../utils/supabase';
import { ITALY_SEED } from '../data/initialData';

function mapDestination(row: DestinationRow): Destination {
  return {
    id: row.id,
    name: row.name,
    flag: row.flag,
    description: row.description,
    createdAt: row.created_at,
  };
}

function publicImageUrl(imagePath: string): string {
  const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(imagePath);
  return data.publicUrl;
}

function mapPhoto(row: PhotoRow): VacationPhoto {
  return {
    id: row.id,
    destinationId: row.destination_id,
    imagePath: row.image_path,
    imageUrl: publicImageUrl(row.image_path),
    caption: row.caption,
    dateTaken: row.date_taken,
    createdAt: row.created_at,
  };
}

function throwIfError(error: { message: string } | null, fallback: string): void {
  if (error) throw new Error(error.message || fallback);
}

export async function getAppSettings(): Promise<AppSettings | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  throwIfError(error, 'Failed to load app settings.');
  if (!data) return null;

  const row = data as AppSettingsRow;
  return {
    id: row.id,
    username: row.username,
    password: row.password,
    createdAt: row.created_at,
  };
}

export async function validateCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  const settings = await getAppSettings();
  if (!settings) {
    throw new Error('Journal login is not configured in the database.');
  }
  return (
    settings.username === username.trim() && settings.password === password
  );
}

export async function seedInitialData(): Promise<void> {
  const { count, error } = await supabase
    .from('destinations')
    .select('*', { count: 'exact', head: true });

  throwIfError(error, 'Failed to check destinations.');
  if ((count ?? 0) > 0) return;

  const { error: insertError } = await supabase.from('destinations').insert({
    name: ITALY_SEED.name,
    flag: ITALY_SEED.flag,
    description: ITALY_SEED.description,
  });
  throwIfError(insertError, 'Failed to seed Italy destination.');
}

export async function getAllDestinations(): Promise<Destination[]> {
  const { data, error } = await supabase
    .from('destinations')
    .select('*')
    .order('created_at', { ascending: true });

  throwIfError(error, 'Failed to load destinations.');
  return ((data ?? []) as DestinationRow[]).map(mapDestination);
}

export async function getDestinationById(
  id: number,
): Promise<Destination | undefined> {
  const { data, error } = await supabase
    .from('destinations')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  throwIfError(error, 'Failed to load destination.');
  return data ? mapDestination(data as DestinationRow) : undefined;
}

export async function createDestination(
  input: DestinationInput,
): Promise<Destination> {
  const { data, error } = await supabase
    .from('destinations')
    .insert({
      name: input.name.trim(),
      flag: input.flag?.trim() || null,
      description: input.description?.trim() || null,
    })
    .select('*')
    .single();

  throwIfError(error, 'Failed to create destination.');
  return mapDestination(data as DestinationRow);
}

export async function updateDestination(
  id: number,
  input: DestinationInput,
): Promise<Destination> {
  const { data, error } = await supabase
    .from('destinations')
    .update({
      name: input.name.trim(),
      flag: input.flag?.trim() || null,
      description: input.description?.trim() || null,
    })
    .eq('id', id)
    .select('*')
    .single();

  throwIfError(error, 'Failed to update destination.');
  return mapDestination(data as DestinationRow);
}

export async function deleteDestination(id: number): Promise<void> {
  const photos = await getPhotosByDestination(id);

  if (photos.length > 0) {
    const paths = photos.map((photo) => photo.imagePath);
    const { error: storageError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .remove(paths);
    throwIfError(storageError, 'Failed to delete destination photos from storage.');

    const { error: photosError } = await supabase
      .from('photos')
      .delete()
      .eq('destination_id', id);
    throwIfError(photosError, 'Failed to delete destination photos.');
  }

  const { error } = await supabase.from('destinations').delete().eq('id', id);
  throwIfError(error, 'Failed to delete destination.');
}

export async function getPhotosByDestination(
  destinationId: number,
): Promise<VacationPhoto[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('destination_id', destinationId)
    .order('created_at', { ascending: true });

  throwIfError(error, 'Failed to load photos.');
  return ((data ?? []) as PhotoRow[]).map(mapPhoto);
}

export async function getAllPhotos(): Promise<VacationPhoto[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .order('created_at', { ascending: true });

  throwIfError(error, 'Failed to load photos.');
  return ((data ?? []) as PhotoRow[]).map(mapPhoto);
}

export async function getPhotoCountMap(): Promise<Record<number, number>> {
  const photos = await getAllPhotos();
  return photos.reduce<Record<number, number>>((acc, photo) => {
    acc[photo.destinationId] = (acc[photo.destinationId] ?? 0) + 1;
    return acc;
  }, {});
}

export async function getCoverUrlForDestination(
  destinationId: number,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('photos')
    .select('image_path')
    .eq('destination_id', destinationId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  throwIfError(error, 'Failed to load cover photo.');
  if (!data) return null;
  return publicImageUrl((data as { image_path: string }).image_path);
}

export async function addPhotos(
  destinationId: number,
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<VacationPhoto[]> {
  const created: VacationPhoto[] = [];
  let done = 0;

  for (const file of files) {
    const processed = await processImageFile(file);
    const path = `${destinationId}/${Date.now()}-${safeStorageFileName(processed.fileName)}`;

    const { error: uploadError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .upload(path, processed.imageBlob, {
        contentType: processed.mimeType,
        upsert: false,
      });
    throwIfError(uploadError, `Failed to upload ${file.name}.`);

    const { data, error } = await supabase
      .from('photos')
      .insert({
        destination_id: destinationId,
        image_path: path,
        caption: null,
        date_taken: null,
      })
      .select('*')
      .single();

    if (error) {
      await supabase.storage.from(PHOTOS_BUCKET).remove([path]);
      throw new Error(error.message || `Failed to save ${file.name}.`);
    }

    created.push(mapPhoto(data as PhotoRow));
    done += 1;
    onProgress?.(done, files.length);
  }

  return created;
}

export async function updatePhotoMetadata(
  id: number,
  updates: PhotoMetadataUpdate,
): Promise<VacationPhoto> {
  const payload: Record<string, string | null> = {};
  if (updates.caption !== undefined) {
    payload.caption = updates.caption?.trim() || null;
  }
  if (updates.dateTaken !== undefined) {
    payload.date_taken = updates.dateTaken || null;
  }

  const { data, error } = await supabase
    .from('photos')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  throwIfError(error, 'Failed to update photo.');
  return mapPhoto(data as PhotoRow);
}

export async function deletePhoto(id: number): Promise<void> {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  throwIfError(error, 'Failed to find photo.');
  if (!data) return;

  const row = data as PhotoRow;
  const { error: storageError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .remove([row.image_path]);
  throwIfError(storageError, 'Failed to delete photo file.');

  const { error: deleteError } = await supabase
    .from('photos')
    .delete()
    .eq('id', id);
  throwIfError(deleteError, 'Failed to delete photo.');
}

export async function exportJournal(): Promise<JournalExport> {
  const [destinations, photos] = await Promise.all([
    getAllDestinations(),
    getAllPhotos(),
  ]);

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    destinations,
    photos: photos.map(({ imageUrl: _url, ...rest }) => rest),
  };
}
