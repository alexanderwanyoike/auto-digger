import { z } from 'zod';

const text = z.string().trim().max(160).default('');
const selection = z
  .array(
    z
      .string()
      .trim()
      .min(1)
      .max(160)
      .regex(/^[^|]+$/),
  )
  .max(1000)
  .default([])
  .transform((values) => [...new Set(values)].sort());
export const filtersSchema = z.object({
  label: text,
  artist: text,
  year: z
    .string()
    .trim()
    .regex(/^(|[0-9]{4}(-[0-9]{4})?)$/)
    .refine(
      (value) => !value.includes('-') || value.slice(0, 4) <= value.slice(5),
      'The starting year must come before the ending year.',
    )
    .default(''),
  genre: selection,
  style: selection,
  format: selection,
  title: text,
});
export type DigFilters = z.infer<typeof filtersSchema>;
export const searchInputSchema = z.object({
  filters: filtersSchema,
  page: z.number().int().min(1).max(200),
});
export const searchPageSchema = z.object({
  page: z.number().int().positive(),
  pages: z.number().int().nonnegative(),
  perPage: z.number().int().min(1).max(100),
  items: z.number().int().nonnegative(),
  releases: z.array(
    z.object({
      id: z.number().int().positive(),
      title: z.string(),
      year: z.string(),
      labels: z.array(z.string()),
      formats: z.array(z.string()),
      artworkUrl: z.string().nullable().default(null),
    }),
  ),
});
export type SearchPage = z.infer<typeof searchPageSchema>;
