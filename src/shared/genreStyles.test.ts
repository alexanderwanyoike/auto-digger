import { expect, test } from 'vitest';
import { stylesForGenres } from './genreStyles';

test.each(['constructor', 'toString', '__proto__'])(
  'treats unknown genre %s as an unmapped name rather than an object property',
  (genre) => {
    expect(stylesForGenres([genre])).toEqual([]);
  },
);
