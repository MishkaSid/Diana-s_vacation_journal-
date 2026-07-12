import { useEffect, useState } from 'react';
import { useObjectUrl } from '../hooks/useObjectUrl';
import type { VacationPhoto } from '../types';
import { formatDisplayDate } from '../utils/helpers';
import { downloadBlob } from '../utils/imageProcessing';
import { ConfirmDialog } from './ConfirmDialog';
import styles from './PhotoLightbox.module.css';

interface PhotoLightboxProps {
  photos: VacationPhoto[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onUpdate: (
    id: string,
    updates: {
      caption?: string;
      dateTaken?: string;
      location?: string;
      notes?: string;
      isFavourite?: boolean;
    },
  ) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
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
  const url = useObjectUrl(photo?.imageBlob);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState({
    caption: '',
    dateTaken: '',
    location: '',
    notes: '',
  });

  useEffect(() => {
    if (!photo) return;
    setDraft({
      caption: photo.caption ?? '',
      dateTaken: photo.dateTaken ?? '',
      location: photo.location ?? '',
      notes: photo.notes ?? '',
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
      <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Photo lightbox">
        <div className={styles.topBar}>
          <span>
            {index + 1} / {photos.length}
          </span>
          <div className={styles.actions}>
            <button
              type="button"
              className="btn btnSecondary"
              onClick={() =>
                void onUpdate(photo.id, { isFavourite: !photo.isFavourite })
              }
            >
              {photo.isFavourite ? '♥ Favourited' : '♡ Favourite'}
            </button>
            <button
              type="button"
              className="btn btnSecondary"
              onClick={() => setEditing((value) => !value)}
            >
              {editing ? 'Close editor' : 'Edit details'}
            </button>
            <button
              type="button"
              className="btn btnSecondary"
              onClick={() => downloadBlob(photo.imageBlob, photo.fileName)}
            >
              Download
            </button>
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
          {url ? (
            <img src={url} alt={photo.caption || photo.fileName} />
          ) : null}
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
            <strong>{photo.caption || photo.fileName}</strong>
            {photo.dateTaken ? (
              <p>Taken {formatDisplayDate(photo.dateTaken)}</p>
            ) : null}
            {photo.location ? <p>{photo.location}</p> : null}
            {photo.notes ? <p>{photo.notes}</p> : null}
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
                location: draft.location,
                notes: draft.notes,
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
            <label>
              Location
              <input
                value={draft.location}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, location: e.target.value }))
                }
              />
            </label>
            <label>
              Notes
              <textarea
                value={draft.notes}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, notes: e.target.value }))
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
        message="This photo will be permanently removed from this device."
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
