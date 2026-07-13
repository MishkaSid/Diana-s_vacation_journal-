import { useCallback, useEffect, useState } from 'react';
import type { Destination, DestinationInput } from '../types';
import {
  createDestination,
  deleteDestination,
  getAllDestinations,
  getDestinationById,
  getPhotoCountMap,
  seedInitialData,
  updateDestination,
} from '../services/db';

interface UseDestinationsResult {
  destinations: Destination[];
  photoCounts: Record<number, number>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addDestination: (input: DestinationInput) => Promise<Destination>;
  editDestination: (
    id: number,
    input: DestinationInput,
  ) => Promise<Destination>;
  removeDestination: (id: number) => Promise<void>;
}

export function useDestinations(): UseDestinationsResult {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [photoCounts, setPhotoCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await seedInitialData();
      const [list, counts] = await Promise.all([
        getAllDestinations(),
        getPhotoCountMap(),
      ]);
      setDestinations(list);
      setPhotoCounts(counts);
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
      const found = await getDestinationById(id);
      setDestination(found ?? null);
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
