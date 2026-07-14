import { apiFetch } from './api';
import type { Destination, DestinationInput, Photo, PhotoMetadataUpdate } from '../types';
import { blobToBase64, processImageFile } from '../utils/imageProcessing';
import { MAX_UPLOAD_BYTES } from '../data/initialData';

export async function fetchSession(): Promise<boolean> {
  const data = await apiFetch<{ authenticated: boolean }>('/api/session');
  return Boolean(data.authenticated);
}

export async function loginRequest(
  username: string,
  password: string,
): Promise<void> {
  await apiFetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function logoutRequest(): Promise<void> {
  await apiFetch('/api/logout', { method: 'POST' });
}

export async function listDestinations(): Promise<Destination[]> {
  const data = await apiFetch<{ destinations: Destination[] }>(
    '/api/destinations',
  );
  return data.destinations;
}

async function buildDestinationPayload(input: DestinationInput) {
  const payload: Record<string, unknown> = {
    name: input.name,
    flag: input.flag ?? null,
    description: input.description ?? null,
  };

  if (input.clearCover) {
    payload.clearCover = true;
  }

  if (input.coverFile) {
    const processed = await processImageFile(input.coverFile);
    if (processed.imageBlob.size > MAX_UPLOAD_BYTES) {
      throw new Error('Cover image is too large after compression.');
    }
    payload.coverImageBase64 = await blobToBase64(processed.imageBlob);
    payload.coverMimeType = processed.mimeType;
    payload.coverFileName = processed.fileName;
  }

  return payload;
}

export async function createDestination(
  input: DestinationInput,
): Promise<Destination> {
  const data = await apiFetch<{ destination: Destination }>(
    '/api/destinations',
    {
      method: 'POST',
      body: JSON.stringify(await buildDestinationPayload(input)),
    },
  );
  return data.destination;
}

export async function updateDestination(
  id: number,
  input: DestinationInput,
): Promise<Destination> {
  const data = await apiFetch<{ destination: Destination }>(
    `/api/destinations/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(await buildDestinationPayload(input)),
    },
  );
  return data.destination;
}

export async function deleteDestination(id: number): Promise<void> {
  await apiFetch(`/api/destinations/${id}`, { method: 'DELETE' });
}

export async function listPhotos(destinationId: number): Promise<Photo[]> {
  const data = await apiFetch<{ photos: Photo[] }>(
    `/api/destinations/${destinationId}/photos`,
  );
  return data.photos;
}

export async function updatePhoto(
  id: number,
  updates: PhotoMetadataUpdate,
): Promise<Photo> {
  const data = await apiFetch<{ photo: Photo }>(`/api/photos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return data.photo;
}

export async function deletePhoto(id: number): Promise<void> {
  await apiFetch(`/api/photos/${id}`, { method: 'DELETE' });
}

export async function uploadPhotosForDestination(
  destinationId: number,
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<Photo[]> {
  const created: Photo[] = [];
  let done = 0;

  for (const file of files) {
    const processed = await processImageFile(file);
    if (processed.imageBlob.size > MAX_UPLOAD_BYTES) {
      throw new Error(`${file.name} is too large after compression.`);
    }

    const imageBase64 = await blobToBase64(processed.imageBlob);
    const data = await apiFetch<{ photo: Photo }>('/api/photos/upload', {
      method: 'POST',
      body: JSON.stringify({
        destinationId,
        fileName: processed.fileName,
        mimeType: processed.mimeType,
        imageBase64,
      }),
    });

    created.push(data.photo);
    done += 1;
    onProgress?.(done, files.length);
  }

  return created;
}
