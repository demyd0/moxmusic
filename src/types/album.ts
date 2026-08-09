export type AlbumSource = 'itunes' | 'musicbrainz' | 'manual';

export interface Track {
  trackNumber: number;
  title: string;
  durationMs?: number;
  previewUrl?: string;
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
  /** 'track' for an individually-liked song (e.g. from a library import);
   *  absent/'album' for a full album. Kept on the same Album shape rather
   *  than a separate type so liked/toListen storage and card components
   *  don't need a second parallel model. */
  kind?: 'album' | 'track';
  /** Only set when kind === 'track': the album this song belongs to, so
   *  the UI can show "from {albumTitle}" instead of nothing. */
  albumTitle?: string;
}

export interface SearchOptions {
  enableBroadSearch?: boolean;
}
