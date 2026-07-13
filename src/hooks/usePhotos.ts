import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  PhotoMetadataUpdate,
  PhotoSortOption,
  VacationPhoto,
} from '../types';
import {
  addPhotos,
  deletePhoto,
  getPhotosByDestination,
  updatePhotoMetadata,
} from '../services/db';

export function usePhotos(destinationId: number | undefined) {
  const [photos, setPhotos] = useState<VacationPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<PhotoSortOption>('upload');
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
      const list = await getPhotosByDestination(destinationId);
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
        const created = await addPhotos(destinationId, files, (done, total) => {
          setUploadProgress({ done, total });
        });
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
      const updated = await updatePhotoMetadata(id, updates);
      setPhotos((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    },
    [],
  );

  const remove = useCallback(async (id: number) => {
    await deletePhoto(id);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const visiblePhotos = useMemo(() => {
    let list = [...photos];

    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter((p) =>
        (p.caption ?? '').toLowerCase().includes(query),
      );
    }

    if (sort === 'newest') {
      list.sort((a, b) => {
        const aDate = a.dateTaken || a.createdAt;
        const bDate = b.dateTaken || b.createdAt;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
    } else if (sort === 'oldest') {
      list.sort((a, b) => {
        const aDate = a.dateTaken || a.createdAt;
        const bDate = b.dateTaken || b.createdAt;
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      });
    } else {
      list.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    }

    return list;
  }, [photos, sort, search]);

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
