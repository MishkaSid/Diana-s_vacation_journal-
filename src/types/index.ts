/** Matches public.destinations */
export interface Destination {
  id: number;
  name: string;
  flag: string | null;
  description: string | null;
  createdAt: string;
}

/** Matches public.photos (+ resolved public URL for display) */
export interface VacationPhoto {
  id: number;
  destinationId: number;
  imagePath: string;
  imageUrl: string;
  caption: string | null;
  dateTaken: string | null;
  createdAt: string;
}

/** Matches public.app_settings */
export interface AppSettings {
  id: number;
  username: string;
  password: string;
  createdAt: string;
}

export type PhotoSortOption = 'newest' | 'oldest' | 'upload';

export interface PhotoMetadataUpdate {
  caption?: string | null;
  dateTaken?: string | null;
}

export interface DestinationInput {
  name: string;
  flag?: string;
  description?: string;
}

export interface JournalExport {
  version: 2;
  exportedAt: string;
  destinations: Destination[];
  photos: Array<Omit<VacationPhoto, 'imageUrl'>>;
}

/** Row shapes returned by Supabase (snake_case). */
export interface DestinationRow {
  id: number;
  name: string;
  flag: string | null;
  description: string | null;
  created_at: string;
}

export interface PhotoRow {
  id: number;
  destination_id: number;
  image_path: string;
  caption: string | null;
  date_taken: string | null;
  created_at: string;
}

export interface AppSettingsRow {
  id: number;
  username: string;
  password: string;
  created_at: string;
}
