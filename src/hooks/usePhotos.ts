import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Photo, PhotoMetadataUpdate, PhotoSortOption } from '../types';
import {
  deletePhoto,
  listPhotos,
  updatePhoto,
  uploadPhotosForDestination,
} from '../services/journal';

export function usePhotos(destinationId: number | undefined) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<PhotoSortOption>('newest');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });

  const refresh = useCallback(async () => {
    if (destinationId === undefined) {
      setPhotos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await listPhotos(destinationId);
      setPhotos(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load photos.');
    } finally {
      setLoading(false);
    }
  }, [destinationId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const upload = useCallback(
    async (files: File[]) => {
      if (destinationId === undefined || files.length === 0) return [];
      setUploading(true);
      setUploadProgress({ done: 0, total: files.length });
      try {
        const created = await uploadPhotosForDestination(
          destinationId,
          files,
          (done, total) => setUploadProgress({ done, total }),
        );
        await refresh();
        return created;
      } finally {
        setUploading(false);
        setUploadProgress({ done: 0, total: 0 });
      }
    },
    [destinationId, refresh],
  );

  const updateMeta = useCallback(
    async (id: number, updates: PhotoMetadataUpdate) => {
      const updated = await updatePhoto(id, updates);
      setPhotos((prev) =>
        prev.map((photo) =>
          photo.id === id
            ? { ...updated, signed_url: photo.signed_url }
            : photo,
        ),
      );
      return updated;
    },
    [],
  );

  const remove = useCallback(async (id: number) => {
    await deletePhoto(id);
    setPhotos((prev) => prev.filter((photo) => photo.id !== id));
  }, []);

  const visiblePhotos = useMemo(() => {
    let list = [...photos];
    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter((photo) =>
        (photo.caption ?? '').toLowerCase().includes(query),
      );
    }

    if (sort === 'oldest') {
      list.sort(
        (a, b) =>
          new Date(a.date_taken || a.created_at).getTime() -
          new Date(b.date_taken || b.created_at).getTime(),
      );
    } else if (sort === 'upload') {
      list.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    } else {
      list.sort(
        (a, b) =>
          new Date(b.date_taken || b.created_at).getTime() -
          new Date(a.date_taken || a.created_at).getTime(),
      );
    }

    return list;
  }, [photos, search, sort]);

  return {
    photos,
    visiblePhotos,
    loading,
    error,
    sort,
    setSort,
    search,
    setSearch,
    uploading,
    uploadProgress,
    upload,
    updateMeta,
    remove,
    refresh,
  };
}
