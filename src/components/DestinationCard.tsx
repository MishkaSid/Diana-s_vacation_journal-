import { Link } from 'react-router-dom';
import { PLACEHOLDER_COVER } from '../data/initialData';
import type { Destination } from '../types';
import styles from './DestinationCard.module.css';

interface DestinationCardProps {
  destination: Destination;
  photoCount: number;
  coverUrl?: string | null;
}

export function DestinationCard({
  destination,
  photoCount,
  coverUrl,
}: DestinationCardProps) {
  const countLabel = photoCount === 1 ? '1 photo' : `${photoCount} photos`;
  const imageSrc =
    coverUrl || destination.cover_signed_url || PLACEHOLDER_COVER;

  return (
    <Link
      to={`/destination/${destination.id}`}
      className={styles.card}
      aria-label={`Open ${destination.name} journal`}
    >
      <div className={styles.cover}>
        <img src={imageSrc} alt={`${destination.name} cover`} />
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
