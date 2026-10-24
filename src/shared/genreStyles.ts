import { styles } from 'discogs-dataset-genres-styles';
import genreStyles from './discogsGenreStyles.json';

const byGenre: Readonly<Record<string, readonly string[]>> = genreStyles;

export const mappedStyles = [...new Set(Object.values(byGenre).flat())].sort();

export function stylesForGenres(selected: readonly string[]): readonly string[] {
  if (!selected.length) return styles;
  return [...new Set(selected.flatMap((genre) => byGenre[genre] ?? []))].sort();
}
