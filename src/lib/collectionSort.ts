import type { Album } from '@/types/album';

export type SortKey =
  | 'dateAddedDesc'
  | 'dateAddedAsc'
  | 'titleAsc'
  | 'artistAsc'
  | 'yearDesc'
  | 'yearAsc';

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'dateAddedDesc', label: 'RECENTLY ADDED' },
  { key: 'dateAddedAsc', label: 'OLDEST ADDED' },
  { key: 'titleAsc', label: 'TITLE A-Z' },
  { key: 'artistAsc', label: 'ARTIST A-Z' },
  { key: 'yearDesc', label: 'YEAR: NEWEST' },
  { key: 'yearAsc', label: 'YEAR: OLDEST' },
];

export function sortAlbums(albums: Album[], sortKey: SortKey): Album[] {
  const list = [...albums];

  switch (sortKey) {
    case 'dateAddedAsc':
      return list.sort((a, b) => (a.dateAdded || '').localeCompare(b.dateAdded || ''));
    case 'titleAsc':
      return list.sort((a, b) => a.title.localeCompare(b.title));
    case 'artistAsc':
      return list.sort((a, b) => a.artist.localeCompare(b.artist));
    case 'yearDesc':
      return list.sort((a, b) => (b.releaseYear || '0') .localeCompare(a.releaseYear || '0'));
    case 'yearAsc':
      return list.sort((a, b) => (a.releaseYear || '9999').localeCompare(b.releaseYear || '9999'));
    case 'dateAddedDesc':
    default:
      return list.sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || ''));
  }
}
