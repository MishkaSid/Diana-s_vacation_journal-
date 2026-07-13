import { useCallback, useEffect, useState } from 'react';
import type { Destination, DestinationInput } from '../types';
import {
  createDestination,
  deleteDestination,
  listDestinations,
  listPhotos,
  updateDestination,
} from '../services/journal';

export function useDestinations() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [photoCounts, setPhotoCounts] = useState<Record<number, number>>({});
  const [coverUrls, setCoverUrls] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listDestinations();
      setDestinations(list);

      const counts: Record<number, number> = {};
      const covers: Record<number, string> = {};
      await Promise.all(
        list.map(async (destination) => {
          const photos = await listPhotos(destination.id);
          counts[destination.id] = photos.length;
          if (photos.length > 0) {
            const earliest = [...photos].sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
            )[0];
            if (earliest?.signed_url) {
              covers[destination.id] = earliest.signed_url;
            }
          }
        }),
      );
      setPhotoCounts(counts);
      setCoverUrls(covers);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load destinations.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addDestination = useCallback(
    async (input: DestinationInput) => {
      const created = await createDestination(input);
      await refresh();
      return created;
    },
    [refresh],
  );

  const editDestination = useCallback(
    async (id: number, input: DestinationInput) => {
      const updated = await updateDestination(id, input);
      await refresh();
      return updated;
    },
    [refresh],
  );

  const removeDestination = useCallback(
    async (id: number) => {
      await deleteDestination(id);
      await refresh();
    },
    [refresh],
  );

  return {
    destinations,
    photoCounts,
    coverUrls,
    loading,
    error,
    refresh,
    addDestination,
    editDestination,
    removeDestination,
  };
}

export function useDestination(idParam: string | undefined) {
  const [destination, setDestination] = useState<Destination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const id = Number(idParam);
    if (!idParam || Number.isNaN(id)) {
      setDestination(null);
      setError('Destination not found.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const list = await listDestinations();
      const found = list.find((item) => item.id === id) ?? null;
      setDestination(found);
      if (!found) setError('Destination not found.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load destination.',
      );
      setDestination(null);
    } finally {
      setLoading(false);
    }
  }, [idParam]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { destination, loading, error, refresh, setDestination };
}
