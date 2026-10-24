import { z } from 'zod';
import { filtersSchema } from './search';

export const researchSearchInputSchema = z.object({
  query: z.string().trim().max(160).default(''),
  filters: filtersSchema.default({
    label: '',
    artist: '',
    year: '',
    genre: [],
    style: [],
    title: '',
  }),
  page: z.number().int().min(1).max(200).default(1),
});
