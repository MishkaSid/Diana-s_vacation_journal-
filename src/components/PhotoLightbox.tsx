import { useEffect, useState } from 'react';
import type { VacationPhoto } from '../types';
import { formatDisplayDate } from '../utils/helpers';
import { ConfirmDialog } from './ConfirmDialog';
import styles from './PhotoLightbox.module.css';

interface PhotoLightboxProps {
  photos: VacationPhoto[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onUpdate: (
    id: number,
    updates: {
      caption?: string | null;
      dateTaken?: string | null;
    },
  ) => Promise<unknown>;
  onDelete: (id: number) => Promise<void>;
}

export function PhotoLightbox({
  photos,
  index,
  onClose,
  onIndexChange,
  onUpdate,
  onDelete,
}: PhotoLightboxProps) {
  const photo = photos[index];
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState({
    caption: '',
    dateTaken: '',
  });

  useEffect(() => {
    if (!photo) return;
    setDraft({
      caption: photo.caption ?? '',
      dateTaken: photo.dateTaken ?? '',
    });
    setEditing(false);
  }, [photo]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1);
      if (event.key === 'ArrowRight' && index < photos.length - 1) {
        onIndexChange(index + 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [index, photos.length, onClose, onIndexChange]);

  if (!photo) return null;

  return (
    <>
      <div
        className={styles.overlay}
        role="dialog"
        aria-modal="true"
        aria-label="Photo lightbox"
      >
        <div className={styles.topBar}>
          <span>
            {index + 1} / {photos.length}
          </span>
          <div className={styles.actions}>
            <button
              type="button"
              className="btn btnSecondary"
              onClick={() => setEditing((value) => !value)}
            >
              {editing ? 'Close editor' : 'Edit details'}
            </button>
            <a
              className="btn btnSecondary"
              href={photo.imageUrl}
              download
              target="_blank"
              rel="noreferrer"
            >
              Download
            </a>
            <button
              type="button"
              className="btn btnDanger"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </button>
            <button
              type="button"
              className="btnIcon"
              aria-label="Close lightbox"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        <div className={styles.stage}>
          {index > 0 ? (
            <button
              type="button"
              className={`${styles.nav} ${styles.prev}`}
              aria-label="Previous photo"
              onClick={() => onIndexChange(index - 1)}
            >
              ‹
            </button>
          ) : null}
          <img src={photo.imageUrl} alt={photo.caption || `Photo ${photo.id}`} />
          {index < photos.length - 1 ? (
            <button
              type="button"
              className={`${styles.nav} ${styles.next}`}
              aria-label="Next photo"
              onClick={() => onIndexChange(index + 1)}
            >
              ›
            </button>
          ) : null}
        </div>

        <div className={styles.bottomBar}>
          <div className={styles.meta}>
            <strong>{photo.caption || `Photo ${photo.id}`}</strong>
            {photo.dateTaken ? (
              <p>Taken {formatDisplayDate(photo.dateTaken)}</p>
            ) : null}
          </div>
        </div>

        {editing ? (
          <form
            className={styles.editPanel}
            onSubmit={(event) => {
              event.preventDefault();
              void onUpdate(photo.id, {
                caption: draft.caption,
                dateTaken: draft.dateTaken,
              }).then(() => setEditing(false));
            }}
          >
            <label>
              Caption
              <input
                value={draft.caption}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, caption: e.target.value }))
                }
              />
            </label>
            <label>
              Date taken
              <input
                type="date"
                value={draft.dateTaken}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, dateTaken: e.target.value }))
                }
              />
            </label>
            <button type="submit" className="btn btnPrimary">
              Save photo details
            </button>
          </form>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete photo?"
        message="This photo will be permanently removed from the journal."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          void onDelete(photo.id).then(() => {
            if (photos.length <= 1) onClose();
            else onIndexChange(Math.max(0, index - 1));
          });
        }}
      />
    </>
  );
}
