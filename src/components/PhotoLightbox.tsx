import { useEffect, useState } from 'react';
import type { Photo } from '../types';
import { formatDisplayDate } from '../utils/helpers';
import { ConfirmDialog } from './ConfirmDialog';
import styles from './PhotoLightbox.module.css';

interface PhotoLightboxProps {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onUpdate: (
    id: number,
    updates: {
      caption?: string | null;
      date_taken?: string | null;
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
    date_taken: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!photo) return;
    setDraft({
      caption: photo.caption ?? '',
      date_taken: photo.date_taken ?? '',
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
            {photo.signed_url ? (
              <a
                className="btn btnSecondary"
                href={photo.signed_url}
                target="_blank"
                rel="noreferrer"
              >
                Download
              </a>
            ) : null}
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
          {photo.signed_url ? (
            <img
              src={photo.signed_url}
              alt={photo.caption || `Photo ${photo.id}`}
            />
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
            <strong>{photo.caption || `Photo ${photo.id}`}</strong>
            {photo.date_taken ? (
              <p>Taken {formatDisplayDate(photo.date_taken)}</p>
            ) : null}
          </div>
        </div>

        {editing ? (
          <form
            className={styles.editPanel}
            onSubmit={(event) => {
              event.preventDefault();
              setSaving(true);
              void onUpdate(photo.id, {
                caption: draft.caption,
                date_taken: draft.date_taken,
              })
                .then(() => setEditing(false))
                .finally(() => setSaving(false));
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
                value={draft.date_taken}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, date_taken: e.target.value }))
                }
              />
            </label>
            <button type="submit" className="btn btnPrimary" disabled={saving}>
              {saving ? 'Saving…' : 'Save photo details'}
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
