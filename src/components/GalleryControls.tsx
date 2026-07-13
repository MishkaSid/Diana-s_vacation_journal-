import type { PhotoSortOption } from '../types';
import styles from './GalleryControls.module.css';

interface GalleryControlsProps {
  sort: PhotoSortOption;
  search: string;
  onSortChange: (value: PhotoSortOption) => void;
  onSearchChange: (value: string) => void;
}

export function GalleryControls({
  sort,
  search,
  onSortChange,
  onSearchChange,
}: GalleryControlsProps) {
  return (
    <div className={styles.controls}>
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
          placeholder="Search captions…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}
