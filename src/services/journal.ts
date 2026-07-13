import { apiFetch } from './api';
import type { Destination, DestinationInput, Photo, PhotoMetadataUpdate } from '../types';
import { processImageFile } from '../utils/imageProcessing';
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

export async function createDestination(
  input: DestinationInput,
): Promise<Destination> {
  const data = await apiFetch<{ destination: Destination }>(
    '/api/destinations',
    {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        flag: input.flag ?? null,
        description: input.description ?? null,
      }),
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
      body: JSON.stringify({
        name: input.name,
        flag: input.flag ?? null,
        description: input.description ?? null,
      }),
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

interface SignedUpload {
  path: string;
  token: string;
  signedUrl: string;
  maxBytes: number;
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

    const upload = await apiFetch<SignedUpload>('/api/uploads/create', {
      method: 'POST',
      body: JSON.stringify({
        destinationId,
        fileName: processed.fileName,
        mimeType: processed.mimeType,
      }),
    });

    const putResponse = await fetch(upload.signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': processed.mimeType,
      },
      body: processed.imageBlob,
    });

    if (!putResponse.ok) {
      throw new Error(`Unable to upload ${file.name}`);
    }

    try {
      const data = await apiFetch<{ photo: Photo }>('/api/photos', {
        method: 'POST',
        body: JSON.stringify({
          destination_id: destinationId,
          image_path: upload.path,
          caption: null,
          date_taken: null,
        }),
      });
      created.push(data.photo);
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error('Unable to save photo metadata');
    }

    done += 1;
    onProgress?.(done, files.length);
  }

  return created;
}
