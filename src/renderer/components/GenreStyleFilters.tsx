import { useState } from 'react';
import { genres, styles } from 'discogs-dataset-genres-styles';
import { stylesForGenres } from '../../shared/genreStyles';
import { TaxonomySelect } from './TaxonomySelect';

export function GenreStyleFilters({ disabled }: { disabled: boolean }) {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  return (
    <>
      <TaxonomySelect
        name="genre"
        label="Genre"
        options={genres}
        value={selectedGenres}
        onChange={setSelectedGenres}
        disabled={disabled}
      />
      <TaxonomySelect
        name="style"
        label="Style"
        options={stylesForGenres(selectedGenres)}
        knownOptions={styles}
        disabled={disabled}
      />
    </>
  );
}
