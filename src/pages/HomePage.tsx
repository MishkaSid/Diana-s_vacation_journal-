import { useState } from 'react';
import { AddDestinationCard } from '../components/AddDestinationCard';
import { DestinationCard } from '../components/DestinationCard';
import { DestinationForm } from '../components/DestinationForm';
import { Header } from '../components/Header';
import { useDestinations } from '../hooks/useDestinations';
import type { DestinationInput } from '../types';
import { downloadBlob } from '../utils/imageProcessing';
import { exportJournal } from '../services/db';
import styles from './HomePage.module.css';

interface HomePageProps {
  onLogout: () => void;
}

export function HomePage({ onLogout }: HomePageProps) {
  const {
    destinations,
    photoCounts,
    loading,
    error,
    addDestination,
  } = useDestinations();
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleCreate = async (input: DestinationInput) => {
    await addDestination(input);
  };

  const handleExport = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const data = await exportJournal();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      downloadBlob(blob, `dianas-vacation-journal-${Date.now()}.json`);
      setStatus('Journal metadata exported successfully.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-shell">
      <Header onLogout={onLogout} />
      <main className="page">
        <section className={styles.hero}>
          <h1>Diana&apos;s Vacation Journal</h1>
          <p>Memories from around the world</p>
          <div className={styles.backupActions}>
            <button
              type="button"
              className="btn btnGhost"
              onClick={() => void handleExport()}
              disabled={busy}
            >
              Export
            </button>
          </div>
        </section>

        {error ? (
          <div className={`errorState cardSurface ${styles.banner}`} role="alert">
            {error}
          </div>
        ) : null}

        {status ? (
          <div className={`notice ${styles.banner}`} role="status">
            {status}
          </div>
        ) : null}

        {loading ? (
          <div className="loadingState">
            <div className="loadingSpinner" aria-hidden="true" />
            Loading destinations…
          </div>
        ) : (
          <section className={styles.grid} aria-label="Destinations">
            {destinations.map((destination) => (
              <DestinationCard
                key={destination.id}
                destination={destination}
                photoCount={photoCounts[destination.id] ?? 0}
              />
            ))}
            <AddDestinationCard onClick={() => setFormOpen(true)} />
          </section>
        )}
      </main>

      <DestinationForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
