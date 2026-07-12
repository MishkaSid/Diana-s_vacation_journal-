export interface Destination {
  id: string;
  slug: string;
  name: string;
  flag?: string;
  tripTitle?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  coverPhotoId?: string;
  /** Public path for default/seed cover images (e.g. /photos/italy-cover.svg) */
  coverPublicPath?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VacationPhoto {
  id: string;
  destinationId: string;
  fileName: string;
  mimeType: string;
  imageBlob: Blob;
  thumbnailBlob?: Blob;
  caption?: string;
  dateTaken?: string;
  location?: string;
  notes?: string;
  isFavourite: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AppSettings {
  id: string;
  seeded: boolean;
}

export type PhotoSortOption = 'newest' | 'oldest' | 'upload';
export type PhotoFilterOption = 'all' | 'favourites';

export interface PhotoMetadataUpdate {
  caption?: string;
  dateTaken?: string;
  location?: string;
  notes?: string;
  isFavourite?: boolean;
}

export interface DestinationInput {
  name: string;
  flag?: string;
  tripTitle?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  coverFile?: File | null;
}

/** Serialisable export shape (blobs become base64). */
export interface ExportedPhoto {
  id: string;
  destinationId: string;
  fileName: string;
  mimeType: string;
  imageBase64: string;
  thumbnailBase64?: string;
  caption?: string;
  dateTaken?: string;
  location?: string;
  notes?: string;
  isFavourite: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface JournalExport {
  version: 1;
  exportedAt: string;
  destinations: Destination[];
  photos: ExportedPhoto[];
}
