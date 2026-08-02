export type AlbumSource = 'itunes' | 'musicbrainz' | 'manual';

export interface Track {
  trackNumber: number;
  title: string;
  durationMs?: number;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  coverUrl?: string;
  releaseYear?: string;
  source: AlbumSource;
  genre?: string;
  trackCount?: number;
  mbid?: string;
  dateAdded?: string;
  tracks?: Track[];
}

export interface SearchOptions {
  enableBroadSearch?: boolean;
}
