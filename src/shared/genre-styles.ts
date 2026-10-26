import { styles } from 'discogs-dataset-genres-styles';
import genreStyles from './discogs-genre-styles.json';

const byGenre: Readonly<Record<string, readonly string[]>> = genreStyles;

export const mappedStyles = [...new Set(Object.values(byGenre).flat())].sort();
const allStyles = [...new Set([...styles, ...mappedStyles])].sort();

export function stylesForGenres(selected: readonly string[]): readonly string[] {
  if (!selected.length) return allStyles;
  return [
    ...new Set(
      selected.flatMap((genre) => (Object.hasOwn(byGenre, genre) ? (byGenre[genre] ?? []) : [])),
    ),
  ].sort();
}
