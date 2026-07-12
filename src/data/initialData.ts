import type { Destination } from '../types';

/** Seeded on first visit when IndexedDB has no destinations. */
export const ITALY_DESTINATION: Omit<Destination, 'id' | 'createdAt'> = {
  slug: 'italy',
  name: 'Italy',
  flag: '🇮🇹',
  tripTitle: 'Italy Vacation',
  description:
    'A dreamy journey through cobblestone streets, sunlit piazzas, and timeless coastlines. Edit this description to capture your own Italian memories.',
  coverPublicPath: '/photos/italy-cover.svg',
};

export const PLACEHOLDER_COVER = '/photos/placeholder-cover.svg';

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

export const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;

/** Warn when an original file exceeds this size (bytes) before compression. */
export const LARGE_FILE_WARNING_BYTES = 8 * 1024 * 1024;

/** Longest side after browser-side resize. */
export const MAX_IMAGE_DIMENSION = 1920;

export const THUMBNAIL_DIMENSION = 480;
