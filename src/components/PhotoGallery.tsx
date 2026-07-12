import { useEffect, useState } from 'react';
import { useObjectUrl } from '../hooks/useObjectUrl';
import type { VacationPhoto } from '../types';
import styles from './PhotoGallery.module.css';

function GalleryItem({
  photo,
  onOpen,
}: {
  photo: VacationPhoto;
  onOpen: () => void;
}) {
  const url = useObjectUrl(photo.imageBlob);

  return (
    <button
      type="button"
      className={styles.item}
      onClick={onOpen}
      aria-label={photo.caption || `Open photo ${photo.fileName}`}
    >
      {url ? (
        <img src={url} alt={photo.caption || photo.fileName} loading="lazy" />
      ) : (
        <div style={{ aspectRatio: '4/3', background: 'var(--beige)' }} />
      )}
      {photo.isFavourite ? (
        <span className={styles.heart} aria-hidden="true">
          ♥
        </span>
      ) : null}
      {photo.caption ? <div className={styles.caption}>{photo.caption}</div> : null}
    </button>
  );
}

interface PhotoGalleryProps {
  photos: VacationPhoto[];
  onOpen: (index: number) => void;
}

export function PhotoGallery({ photos, onOpen }: PhotoGalleryProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="loadingState">Preparing gallery…</div>;
  }

  if (photos.length === 0) {
    return (
      <div className="emptyState cardSurface">
        <h3 style={{ marginBottom: '0.4rem' }}>No photos yet</h3>
        <p>Upload a few memories to begin this chapter of the journal.</p>
      </div>
    );
  }

  return (
    <div className={styles.gallery}>
      {photos.map((photo, index) => (
        <GalleryItem
          key={photo.id}
          photo={photo}
          onOpen={() => onOpen(index)}
        />
      ))}
    </div>
  );
}
