import type { PhotoFilterOption, PhotoSortOption } from '../types';
import styles from './GalleryControls.module.css';

interface GalleryControlsProps {
  filter: PhotoFilterOption;
  sort: PhotoSortOption;
  search: string;
  onFilterChange: (value: PhotoFilterOption) => void;
  onSortChange: (value: PhotoSortOption) => void;
  onSearchChange: (value: string) => void;
}

export function GalleryControls({
  filter,
  sort,
  search,
  onFilterChange,
  onSortChange,
  onSearchChange,
}: GalleryControlsProps) {
  return (
    <div className={styles.controls}>
      <div className={styles.group}>
        <label htmlFor="photo-filter">Show</label>
        <select
          id="photo-filter"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value as PhotoFilterOption)}
        >
          <option value="all">All photos</option>
          <option value="favourites">Favourites</option>
        </select>
      </div>
      <div className={styles.group}>
        <label htmlFor="photo-sort">Sort</label>
        <select
          id="photo-sort"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as PhotoSortOption)}
        >
          <option value="upload">Upload order</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>
      <div className={`${styles.group} ${styles.search}`}>
        <label htmlFor="photo-search">Search</label>
        <input
          id="photo-search"
          type="search"
          placeholder="Captions, locations, notes…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}
