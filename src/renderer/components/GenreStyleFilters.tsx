import { useState } from 'react';
import { genres } from 'discogs-dataset-genres-styles';
import { mappedStyles, stylesForGenres } from '../../shared/genreStyles';
import { TaxonomySelect } from './TaxonomySelect';

export function GenreStyleFilters({ disabled }: { disabled: boolean }) {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  return (
    <>
      <TaxonomySelect
        name="genre"
        label="Genre"
        options={genres}
        value={selectedGenres}
        onChange={(values) => {
          setSelectedGenres(values);
          const allowed = stylesForGenres(values);
          setSelectedStyles((current) =>
            current.filter((style) => allowed.includes(style) || !mappedStyles.includes(style)),
          );
        }}
        disabled={disabled}
      />
      <TaxonomySelect
        name="style"
        label="Style"
        options={stylesForGenres(selectedGenres)}
        knownOptions={mappedStyles}
        value={selectedStyles}
        onChange={setSelectedStyles}
        disabled={disabled}
      />
    </>
  );
}
