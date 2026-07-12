import { useCallback, useEffect, useState } from 'react';
import type { Destination, DestinationInput } from '../types';
import {
  createDestination,
  deleteDestination,
  getAllDestinations,
  getDestinationBySlug,
  getPhotoCountMap,
  IndexedDbUnavailableError,
  isIndexedDbAvailable,
  seedInitialData,
  updateDestination,
} from '../services/db';

interface UseDestinationsResult {
  destinations: Destination[];
  photoCounts: Record<string, number>;
  loading: boolean;
  error: string | null;
  dbAvailable: boolean;
  refresh: () => Promise<void>;
  addDestination: (input: DestinationInput) => Promise<Destination>;
  editDestination: (
    id: string,
    input: DestinationInput,
    options?: { clearCover?: boolean },
  ) => Promise<Destination>;
  removeDestination: (id: string) => Promise<void>;
}

export function useDestinations(): UseDestinationsResult {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [photoCounts, setPhotoCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbAvailable, setDbAvailable] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const available = await isIndexedDbAvailable();
      setDbAvailable(available);
      if (!available) {
        throw new IndexedDbUnavailableError();
      }
      await seedInitialData();
      const [list, counts] = await Promise.all([
        getAllDestinations(),
        getPhotoCountMap(),
      ]);
      setDestinations(list);
      setPhotoCounts(counts);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load destinations.';
      setError(message);
      setDbAvailable(!(err instanceof IndexedDbUnavailableError));
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
    async (
      id: string,
      input: DestinationInput,
      options?: { clearCover?: boolean },
    ) => {
      const updated = await updateDestination(id, input, options);
      await refresh();
      return updated;
    },
    [refresh],
  );

  const removeDestination = useCallback(
    async (id: string) => {
      await deleteDestination(id);
      await refresh();
    },
    [refresh],
  );

  return {
    destinations,
    photoCounts,
    loading,
    error,
    dbAvailable,
    refresh,
    addDestination,
    editDestination,
    removeDestination,
  };
}

export function useDestination(slug: string | undefined) {
  const [destination, setDestination] = useState<Destination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!slug) {
      setDestination(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const found = await getDestinationBySlug(slug);
      setDestination(found ?? null);
      if (!found) setError('Destination not found.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load destination.');
      setDestination(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { destination, loading, error, refresh, setDestination };
}
