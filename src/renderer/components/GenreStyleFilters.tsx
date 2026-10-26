import { genres } from 'discogs-dataset-genres-styles';
import { mappedStyles, stylesForGenres } from '../../shared/genre-styles';
import { TaxonomySelect } from './TaxonomySelect';

export function GenreStyleFilters({
  disabled,
  genre,
  style,
  onChange,
}: {
  disabled: boolean;
  genre: string[];
  style: string[];
  onChange: (selection: { genre: string[]; style: string[] }) => void;
}) {
  return (
    <>
      <TaxonomySelect
        name="genre"
        label="Genre"
        options={genres}
        value={genre}
        onChange={(values) => {
          const allowed = stylesForGenres(values);
          onChange({
            genre: values,
            style: style.filter((item) => allowed.includes(item) || !mappedStyles.includes(item)),
          });
        }}
        disabled={disabled}
      />
      <TaxonomySelect
        name="style"
        label="Style"
        options={stylesForGenres(genre)}
        knownOptions={mappedStyles}
        value={style}
        onChange={(values) => {
          onChange({ genre, style: values });
        }}
        disabled={disabled}
      />
    </>
  );
}
