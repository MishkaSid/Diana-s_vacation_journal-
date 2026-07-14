export interface Destination {
  id: number;
  name: string;
  flag: string | null;
  description: string | null;
  cover_image_path?: string | null;
  cover_signed_url?: string | null;
  created_at: string;
}

export interface Photo {
  id: number;
  destination_id: number;
  image_path: string;
  caption: string | null;
  date_taken: string | null;
  created_at: string;
  signed_url?: string | null;
}

export type PhotoSortOption = 'newest' | 'oldest' | 'upload';

export interface PhotoMetadataUpdate {
  caption?: string | null;
  date_taken?: string | null;
}

export interface DestinationInput {
  name: string;
  flag?: string;
  description?: string;
  coverFile?: File | null;
  clearCover?: boolean;
}

export interface ApiErrorBody {
  error?: string;
}
