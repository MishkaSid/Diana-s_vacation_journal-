import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DestinationForm } from '../components/DestinationForm';
import { GalleryControls } from '../components/GalleryControls';
import { Header } from '../components/Header';
import { PhotoGallery } from '../components/PhotoGallery';
import { PhotoLightbox } from '../components/PhotoLightbox';
import { PhotoUpload } from '../components/PhotoUpload';
import { PLACEHOLDER_COVER } from '../data/initialData';
import { useDestination } from '../hooks/useDestinations';
import { useObjectUrl } from '../hooks/useObjectUrl';
import { usePhotos } from '../hooks/usePhotos';
import {
  deleteDestination,
  getPhotoById,
  updateDestination,
} from '../services/db';
import type { DestinationInput } from '../types';
import { formatDateRange } from '../utils/helpers';
import styles from './DestinationPage.module.css';

interface DestinationPageProps {
  onLogout: () => void;
}

export function DestinationPage({ onLogout }: DestinationPageProps) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { destination, loading, error, refresh, setDestination } =
    useDestination(slug);
  const {
    photos,
    visiblePhotos,
    loading: photosLoading,
    error: photosError,
    filter,
    setFilter,
    sort,
    setSort,
    search,
    setSearch,
    uploading,
    uploadProgress,
    upload,
    updateMeta,
    remove,
    refresh: refreshPhotos,
  } = usePhotos(destination?.id);

  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const coverUrl = useObjectUrl(coverBlob);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadCover() {
      if (!destination?.coverPhotoId) {
        setCoverBlob(null);
        return;
      }
      const photo = await getPhotoById(destination.coverPhotoId);
      if (!cancelled) {
        setCoverBlob(photo?.imageBlob ?? null);
      }
    }
    void loadCover();
    return () => {
      cancelled = true;
    };
  }, [destination?.coverPhotoId]);

  const handleEdit = async (input: DestinationInput) => {
    if (!destination) return;
    const updated = await updateDestination(destination.id, input);
    setDestination(updated);
    await refresh();
    await refreshPhotos();
  };

  const handleDelete = async () => {
    if (!destination) return;
    await deleteDestination(destination.id);
    navigate('/', { replace: true });
  };

  const imageSrc =
    coverUrl || destination?.coverPublicPath || PLACEHOLDER_COVER;
  const dateLabel = formatDateRange(
    destination?.startDate,
    destination?.endDate,
  );

  return (
    <div className="app-shell">
      <Header onLogout={onLogout} />
      <main className="page">
        <div className={styles.top}>
          <Link to="/" className="btn btnSecondary">
            ← Back
          </Link>
        </div>

        {loading ? (
          <div className="loadingState">
            <div className="loadingSpinner" aria-hidden="true" />
            Opening destination…
          </div>
        ) : null}

        {error && !destination ? (
          <div className="errorState cardSurface" role="alert">
            <p>{error}</p>
            <Link to="/" className="btn btnPrimary" style={{ marginTop: '1rem' }}>
              Return home
            </Link>
          </div>
        ) : null}

        {destination ? (
          <>
            <section className={styles.hero}>
              <div className={styles.cover}>
                <img
                  src={imageSrc}
                  alt={`${destination.name} cover`}
                />
              </div>
              <div className={`cardSurface ${styles.details}`}>
                <div className={styles.titleRow}>
                  {destination.flag ? (
                    <span className={styles.flag} aria-hidden="true">
                      {destination.flag}
                    </span>
                  ) : null}
                  <h1>{destination.name}</h1>
                </div>
                {destination.tripTitle ? (
                  <p className={styles.tripTitle}>{destination.tripTitle}</p>
                ) : null}
                {dateLabel ? <p className={styles.meta}>{dateLabel}</p> : null}
                <p className={styles.meta}>
                  {photos.length === 1 ? '1 photo' : `${photos.length} photos`}
                  {visiblePhotos.length !== photos.length
                    ? ` · ${visiblePhotos.length} shown`
                    : null}
                </p>
                {destination.description ? (
                  <p className={styles.description}>{destination.description}</p>
                ) : null}
                <div className={styles.actions}>
                  <button
                    type="button"
                    className="btn btnSecondary"
                    onClick={() => setEditOpen(true)}
                  >
                    Edit destination
                  </button>
                  <button
                    type="button"
                    className="btn btnDanger"
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete destination
                  </button>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <PhotoUpload
                uploading={uploading}
                progress={uploadProgress}
                onUpload={upload}
              />

              <GalleryControls
                filter={filter}
                sort={sort}
                search={search}
                onFilterChange={setFilter}
                onSortChange={setSort}
                onSearchChange={setSearch}
              />

              {photosError ? (
                <div className="errorState cardSurface" role="alert">
                  {photosError}
                </div>
              ) : null}

              {photosLoading ? (
                <div className="loadingState">
                  <div className="loadingSpinner" aria-hidden="true" />
                  Loading photos…
                </div>
              ) : (
                <PhotoGallery
                  photos={visiblePhotos}
                  onOpen={(index) => setLightboxIndex(index)}
                />
              )}
            </section>
          </>
        ) : null}
      </main>

      <DestinationForm
        open={editOpen}
        initial={destination}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEdit}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete destination?"
        message="This will permanently delete the destination and all of its photos from this device."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          void handleDelete();
        }}
      />

      {lightboxIndex !== null ? (
        <PhotoLightbox
          photos={visiblePhotos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
          onUpdate={updateMeta}
          onDelete={async (id) => {
            await remove(id);
            if (destination?.coverPhotoId === id) {
              await refresh();
            }
          }}
        />
      ) : null}
    </div>
  );
}
