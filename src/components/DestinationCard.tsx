import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PLACEHOLDER_COVER } from '../data/initialData';
import { useObjectUrl } from '../hooks/useObjectUrl';
import { getPhotoById } from '../services/db';
import type { Destination } from '../types';
import styles from './DestinationCard.module.css';

interface DestinationCardProps {
  destination: Destination;
  photoCount: number;
}

export function DestinationCard({ destination, photoCount }: DestinationCardProps) {
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const coverUrl = useObjectUrl(coverBlob);

  useEffect(() => {
    let cancelled = false;
    async function loadCover() {
      if (!destination.coverPhotoId) {
        setCoverBlob(null);
        return;
      }
      const photo = await getPhotoById(destination.coverPhotoId);
      if (!cancelled) {
        setCoverBlob(photo?.thumbnailBlob ?? photo?.imageBlob ?? null);
      }
    }
    void loadCover();
    return () => {
      cancelled = true;
    };
  }, [destination.coverPhotoId]);

  const imageSrc =
    coverUrl || destination.coverPublicPath || PLACEHOLDER_COVER;
  const countLabel = photoCount === 1 ? '1 photo' : `${photoCount} photos`;

  return (
    <Link
      to={`/destination/${destination.slug}`}
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
