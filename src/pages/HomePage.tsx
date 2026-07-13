import { useState } from 'react';
import { AddDestinationCard } from '../components/AddDestinationCard';
import { DestinationCard } from '../components/DestinationCard';
import { DestinationForm } from '../components/DestinationForm';
import { Header } from '../components/Header';
import { useDestinations } from '../hooks/useDestinations';
import type { DestinationInput } from '../types';
import styles from './HomePage.module.css';

interface HomePageProps {
  onLogout: () => void;
}

export function HomePage({ onLogout }: HomePageProps) {
  const { destinations, photoCounts, coverUrls, loading, error, addDestination } =
    useDestinations();
  const [formOpen, setFormOpen] = useState(false);

  const handleCreate = async (input: DestinationInput) => {
    await addDestination(input);
  };

  return (
    <div className="app-shell">
      <Header onLogout={onLogout} />
      <main className="page">
        <section className={styles.hero}>
          <h1>Diana&apos;s Vacation Journal</h1>
          <p>Memories from around the world</p>
        </section>

        {error ? (
          <div className={`errorState cardSurface ${styles.banner}`} role="alert">
            {error}
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
                coverUrl={coverUrls[destination.id]}
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
