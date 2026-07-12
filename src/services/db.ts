import { ITALY_DESTINATION } from '../data/initialData';
import type {
  AppSettings,
  Destination,
  DestinationInput,
  JournalExport,
  PhotoMetadataUpdate,
  VacationPhoto,
} from '../types';
import { createId, slugify } from '../utils/helpers';
import { blobToDataUrl, dataUrlToBlob, processImageFile } from '../utils/imageProcessing';

const DB_NAME = 'dianas-vacation-journal';
const DB_VERSION = 1;

const STORE_DESTINATIONS = 'destinations';
const STORE_PHOTOS = 'photos';
const STORE_SETTINGS = 'settings';

export class IndexedDbUnavailableError extends Error {
  constructor(message = 'IndexedDB is unavailable in this browser.') {
    super(message);
    this.name = 'IndexedDbUnavailableError';
  }
}

function requireIndexedDb(): IDBFactory {
  if (typeof indexedDB === 'undefined') {
    throw new IndexedDbUnavailableError();
  }
  return indexedDB;
}

function openDatabase(): Promise<IDBDatabase> {
  const idb = requireIndexedDb();

  return new Promise((resolve, reject) => {
    const request = idb.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_DESTINATIONS)) {
        const store = db.createObjectStore(STORE_DESTINATIONS, { keyPath: 'id' });
        store.createIndex('slug', 'slug', { unique: true });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
        const store = db.createObjectStore(STORE_PHOTOS, { keyPath: 'id' });
        store.createIndex('destinationId', 'destinationId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        request.error ??
          new IndexedDbUnavailableError('Failed to open IndexedDB.'),
      );
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await openDatabase();
  try {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = await work(store);
    await transactionDone(tx);
    return result;
  } finally {
    db.close();
  }
}

async function ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  const destinations = await getAllDestinations();
  let slug = baseSlug;
  let counter = 2;
  while (destinations.some((d) => d.slug === slug && d.id !== excludeId)) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
  return slug;
}

export async function isIndexedDbAvailable(): Promise<boolean> {
  try {
    requireIndexedDb();
    const db = await openDatabase();
    db.close();
    return true;
  } catch {
    return false;
  }
}

export async function getSettings(): Promise<AppSettings | undefined> {
  return withStore(STORE_SETTINGS, 'readonly', (store) =>
    requestToPromise(store.get('app') as IDBRequest<AppSettings | undefined>),
  );
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await withStore(STORE_SETTINGS, 'readwrite', (store) => {
    store.put(settings);
  });
}

export async function getAllDestinations(): Promise<Destination[]> {
  const items = await withStore(STORE_DESTINATIONS, 'readonly', (store) =>
    requestToPromise(store.getAll() as IDBRequest<Destination[]>),
  );
  return items.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export async function getDestinationBySlug(
  slug: string,
): Promise<Destination | undefined> {
  return withStore(STORE_DESTINATIONS, 'readonly', async (store) => {
    const index = store.index('slug');
    return requestToPromise(index.get(slug) as IDBRequest<Destination | undefined>);
  });
}

export async function getDestinationById(
  id: string,
): Promise<Destination | undefined> {
  return withStore(STORE_DESTINATIONS, 'readonly', (store) =>
    requestToPromise(store.get(id) as IDBRequest<Destination | undefined>),
  );
}

export async function saveDestination(destination: Destination): Promise<void> {
  await withStore(STORE_DESTINATIONS, 'readwrite', (store) => {
    store.put(destination);
  });
}

export async function deleteDestination(id: string): Promise<void> {
  const photos = await getPhotosByDestination(id);
  const db = await openDatabase();
  try {
    const tx = db.transaction([STORE_DESTINATIONS, STORE_PHOTOS], 'readwrite');
    tx.objectStore(STORE_DESTINATIONS).delete(id);
    const photoStore = tx.objectStore(STORE_PHOTOS);
    for (const photo of photos) {
      photoStore.delete(photo.id);
    }
    await transactionDone(tx);
  } finally {
    db.close();
  }
}

export async function createDestination(
  input: DestinationInput,
): Promise<Destination> {
  const now = new Date().toISOString();
  const slug = await ensureUniqueSlug(slugify(input.name));
  const destination: Destination = {
    id: createId(),
    slug,
    name: input.name.trim(),
    flag: input.flag?.trim() || undefined,
    tripTitle: input.tripTitle?.trim() || undefined,
    startDate: input.startDate || undefined,
    endDate: input.endDate || undefined,
    description: input.description?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  if (input.coverFile) {
    const processed = await processImageFile(input.coverFile);
    const photo: VacationPhoto = {
      id: createId(),
      destinationId: destination.id,
      fileName: processed.fileName,
      mimeType: processed.mimeType,
      imageBlob: processed.imageBlob,
      thumbnailBlob: processed.thumbnailBlob,
      isFavourite: false,
      createdAt: now,
    };
    destination.coverPhotoId = photo.id;
    const db = await openDatabase();
    try {
      const tx = db.transaction([STORE_DESTINATIONS, STORE_PHOTOS], 'readwrite');
      tx.objectStore(STORE_DESTINATIONS).put(destination);
      tx.objectStore(STORE_PHOTOS).put(photo);
      await transactionDone(tx);
    } finally {
      db.close();
    }
    return destination;
  }

  await saveDestination(destination);
  return destination;
}

export async function updateDestination(
  id: string,
  input: DestinationInput,
  options?: { clearCover?: boolean },
): Promise<Destination> {
  const existing = await getDestinationById(id);
  if (!existing) throw new Error('Destination not found');

  const slug = await ensureUniqueSlug(slugify(input.name), id);
  const updated: Destination = {
    ...existing,
    slug,
    name: input.name.trim(),
    flag: input.flag?.trim() || undefined,
    tripTitle: input.tripTitle?.trim() || undefined,
    startDate: input.startDate || undefined,
    endDate: input.endDate || undefined,
    description: input.description?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };

  if (options?.clearCover) {
    updated.coverPhotoId = undefined;
    updated.coverPublicPath = undefined;
  }

  if (input.coverFile) {
    const processed = await processImageFile(input.coverFile);
    const photo: VacationPhoto = {
      id: createId(),
      destinationId: updated.id,
      fileName: processed.fileName,
      mimeType: processed.mimeType,
      imageBlob: processed.imageBlob,
      thumbnailBlob: processed.thumbnailBlob,
      isFavourite: false,
      createdAt: new Date().toISOString(),
    };
    updated.coverPhotoId = photo.id;
    updated.coverPublicPath = undefined;

    const db = await openDatabase();
    try {
      const tx = db.transaction([STORE_DESTINATIONS, STORE_PHOTOS], 'readwrite');
      tx.objectStore(STORE_DESTINATIONS).put(updated);
      tx.objectStore(STORE_PHOTOS).put(photo);
      await transactionDone(tx);
    } finally {
      db.close();
    }
    return updated;
  }

  await saveDestination(updated);
  return updated;
}

export async function getPhotosByDestination(
  destinationId: string,
): Promise<VacationPhoto[]> {
  const photos = await withStore(STORE_PHOTOS, 'readonly', async (store) => {
    const index = store.index('destinationId');
    return requestToPromise(
      index.getAll(destinationId) as IDBRequest<VacationPhoto[]>,
    );
  });
  return photos.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export async function getPhotoById(id: string): Promise<VacationPhoto | undefined> {
  return withStore(STORE_PHOTOS, 'readonly', (store) =>
    requestToPromise(store.get(id) as IDBRequest<VacationPhoto | undefined>),
  );
}

export async function getAllPhotos(): Promise<VacationPhoto[]> {
  return withStore(STORE_PHOTOS, 'readonly', (store) =>
    requestToPromise(store.getAll() as IDBRequest<VacationPhoto[]>),
  );
}

export async function addPhotos(
  destinationId: string,
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<VacationPhoto[]> {
  const created: VacationPhoto[] = [];
  let done = 0;

  for (const file of files) {
    const processed = await processImageFile(file);
    const photo: VacationPhoto = {
      id: createId(),
      destinationId,
      fileName: processed.fileName,
      mimeType: processed.mimeType,
      imageBlob: processed.imageBlob,
      thumbnailBlob: processed.thumbnailBlob,
      isFavourite: false,
      createdAt: new Date().toISOString(),
    };
    await withStore(STORE_PHOTOS, 'readwrite', (store) => {
      store.put(photo);
    });
    created.push(photo);
    done += 1;
    onProgress?.(done, files.length);
  }

  return created;
}

export async function updatePhotoMetadata(
  id: string,
  updates: PhotoMetadataUpdate,
): Promise<VacationPhoto> {
  const existing = await getPhotoById(id);
  if (!existing) throw new Error('Photo not found');

  const updated: VacationPhoto = {
    ...existing,
    caption: updates.caption !== undefined ? updates.caption : existing.caption,
    dateTaken:
      updates.dateTaken !== undefined ? updates.dateTaken || undefined : existing.dateTaken,
    location:
      updates.location !== undefined ? updates.location || undefined : existing.location,
    notes: updates.notes !== undefined ? updates.notes || undefined : existing.notes,
    isFavourite:
      updates.isFavourite !== undefined ? updates.isFavourite : existing.isFavourite,
    updatedAt: new Date().toISOString(),
  };

  await withStore(STORE_PHOTOS, 'readwrite', (store) => {
    store.put(updated);
  });
  return updated;
}

export async function deletePhoto(id: string): Promise<void> {
  const destinations = await getAllDestinations();
  const covering = destinations.filter((d) => d.coverPhotoId === id);

  const db = await openDatabase();
  try {
    const tx = db.transaction([STORE_PHOTOS, STORE_DESTINATIONS], 'readwrite');
    tx.objectStore(STORE_PHOTOS).delete(id);
    for (const destination of covering) {
      tx.objectStore(STORE_DESTINATIONS).put({
        ...destination,
        coverPhotoId: undefined,
        updatedAt: new Date().toISOString(),
      });
    }
    await transactionDone(tx);
  } finally {
    db.close();
  }
}

export async function setDestinationCover(
  destinationId: string,
  photoId: string | undefined,
): Promise<Destination> {
  const destination = await getDestinationById(destinationId);
  if (!destination) throw new Error('Destination not found');

  const updated: Destination = {
    ...destination,
    coverPhotoId: photoId,
    coverPublicPath: photoId ? undefined : destination.coverPublicPath,
    updatedAt: new Date().toISOString(),
  };
  await saveDestination(updated);
  return updated;
}

export async function seedInitialData(): Promise<void> {
  const settings = await getSettings();
  if (settings?.seeded) return;

  const existing = await getAllDestinations();
  if (existing.length === 0) {
    const now = new Date().toISOString();
    const italy: Destination = {
      id: createId(),
      ...ITALY_DESTINATION,
      createdAt: now,
      updatedAt: now,
    };
    await saveDestination(italy);
  }

  await saveSettings({ id: 'app', seeded: true });
}

export async function exportJournal(): Promise<JournalExport> {
  const [destinations, photos] = await Promise.all([
    getAllDestinations(),
    getAllPhotos(),
  ]);

  const exportedPhotos = await Promise.all(
    photos.map(async (photo) => {
      const imageBase64 = await blobToDataUrl(photo.imageBlob);
      const thumbnailBase64 = photo.thumbnailBlob
        ? await blobToDataUrl(photo.thumbnailBlob)
        : undefined;
      return {
        id: photo.id,
        destinationId: photo.destinationId,
        fileName: photo.fileName,
        mimeType: photo.mimeType,
        imageBase64,
        thumbnailBase64,
        caption: photo.caption,
        dateTaken: photo.dateTaken,
        location: photo.location,
        notes: photo.notes,
        isFavourite: photo.isFavourite,
        createdAt: photo.createdAt,
        updatedAt: photo.updatedAt,
      };
    }),
  );

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    destinations,
    photos: exportedPhotos,
  };
}

export async function importJournal(data: JournalExport): Promise<void> {
  if (!data || data.version !== 1 || !Array.isArray(data.destinations)) {
    throw new Error('Invalid journal backup file.');
  }

  const photos: VacationPhoto[] = await Promise.all(
    (data.photos ?? []).map(async (entry) => ({
      id: entry.id,
      destinationId: entry.destinationId,
      fileName: entry.fileName,
      mimeType: entry.mimeType,
      imageBlob: await dataUrlToBlob(entry.imageBase64),
      thumbnailBlob: entry.thumbnailBase64
        ? await dataUrlToBlob(entry.thumbnailBase64)
        : undefined,
      caption: entry.caption,
      dateTaken: entry.dateTaken,
      location: entry.location,
      notes: entry.notes,
      isFavourite: Boolean(entry.isFavourite),
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    })),
  );

  const db = await openDatabase();
  try {
    const tx = db.transaction(
      [STORE_DESTINATIONS, STORE_PHOTOS, STORE_SETTINGS],
      'readwrite',
    );

    const destStore = tx.objectStore(STORE_DESTINATIONS);
    const photoStore = tx.objectStore(STORE_PHOTOS);
    const settingsStore = tx.objectStore(STORE_SETTINGS);

    const existingDests = await requestToPromise(
      destStore.getAll() as IDBRequest<Destination[]>,
    );
    const existingPhotos = await requestToPromise(
      photoStore.getAll() as IDBRequest<VacationPhoto[]>,
    );

    for (const item of existingDests) destStore.delete(item.id);
    for (const item of existingPhotos) photoStore.delete(item.id);

    for (const destination of data.destinations) {
      destStore.put(destination);
    }
    for (const photo of photos) {
      photoStore.put(photo);
    }
    settingsStore.put({ id: 'app', seeded: true } satisfies AppSettings);

    await transactionDone(tx);
  } finally {
    db.close();
  }
}

export async function getPhotoCountMap(): Promise<Record<string, number>> {
  const photos = await getAllPhotos();
  return photos.reduce<Record<string, number>>((acc, photo) => {
    acc[photo.destinationId] = (acc[photo.destinationId] ?? 0) + 1;
    return acc;
  }, {});
}
