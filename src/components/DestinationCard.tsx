import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PLACEHOLDER_COVER } from '../data/initialData';
import { getCoverUrlForDestination } from '../services/db';
import type { Destination } from '../types';
import styles from './DestinationCard.module.css';

interface DestinationCardProps {
  destination: Destination;
  photoCount: number;
}

export function DestinationCard({ destination, photoCount }: DestinationCardProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getCoverUrlForDestination(destination.id)
      .then((url) => {
        if (!cancelled) setCoverUrl(url);
      })
      .catch(() => {
        if (!cancelled) setCoverUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [destination.id, photoCount]);

  const countLabel = photoCount === 1 ? '1 photo' : `${photoCount} photos`;

  return (
    <Link
      to={`/destination/${destination.id}`}
      className={styles.card}
      aria-label={`Open ${destination.name} journal`}
    >
      <div className={styles.cover}>
        <img
          src={coverUrl || PLACEHOLDER_COVER}
          alt={`${destination.name} cover`}
        />
      </div>
      <div className={styles.body}>
        <div className={styles.titleRow}>
          {destination.flag ? (
            <span className={styles.flag} aria-hidden="true">
              {destination.flag}
            </span>
          ) : null}
          <h2 className={styles.name}>{destination.name}</h2>
        </div>
        <p className={styles.meta}>{countLabel}</p>
        <span className={styles.cta}>Open journal →</span>
      </div>
    </Link>
  );
}
