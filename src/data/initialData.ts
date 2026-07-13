export const PLACEHOLDER_COVER = '/photos/placeholder-cover.svg';

export const PHOTOS_BUCKET = 'photos';

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

/** Warn when an original file exceeds this size (bytes) before compression. */
export const LARGE_FILE_WARNING_BYTES = 8 * 1024 * 1024;

/** Longest side after browser-side resize. */
export const MAX_IMAGE_DIMENSION = 1920;

/** Seeded when the destinations table is empty. */
export const ITALY_SEED = {
  name: 'Italy',
  flag: '🇮🇹',
  description:
    'A dreamy journey through cobblestone streets, sunlit piazzas, and timeless coastlines. Edit this description to capture your own Italian memories.',
} as const;
