import type { Photo } from '../types';
import styles from './PhotoGallery.module.css';

function GalleryItem({
  photo,
  onOpen,
}: {
  photo: Photo;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.item}
      onClick={onOpen}
      aria-label={photo.caption || `Open photo ${photo.id}`}
    >
      {photo.signed_url ? (
        <img
          src={photo.signed_url}
          alt={photo.caption || `Photo ${photo.id}`}
          loading="lazy"
        />
      ) : (
        <div style={{ aspectRatio: '4/3', background: 'var(--beige)' }} />
      )}
      {photo.caption ? <div className={styles.caption}>{photo.caption}</div> : null}
    </button>
  );
}

interface PhotoGalleryProps {
  photos: Photo[];
  onOpen: (index: number) => void;
}

export function PhotoGallery({ photos, onOpen }: PhotoGalleryProps) {
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
