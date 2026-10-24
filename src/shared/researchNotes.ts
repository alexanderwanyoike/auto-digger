import { z } from 'zod';

export const researchUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password;
    } catch {
      return false;
    }
  }, 'Use a public HTTPS source link without credentials.');
const fields = {
  crateId: z.string().min(1).max(100),
  releaseId: z.number().int().positive().nullable().default(null),
  trackKey: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .nullable()
    .default(null),
  title: z.string().trim().min(1).max(500),
  artist: z.string().trim().max(500).default(''),
  mixUrl: researchUrlSchema,
  sourceUrls: z.array(researchUrlSchema).max(10).default([]),
  trackNumber: z.number().int().positive().nullable().default(null),
  timestamp: z.string().trim().min(1).max(80).nullable().default(null),
  certainty: z.enum(['confirmed', 'candidate', 'unresolved']),
  notes: z.string().trim().max(4000).default(''),
};
function validReference(note: {
  certainty: string;
  releaseId: number | null;
  trackKey: string | null;
}) {
  return (
    (note.trackKey === null || note.releaseId !== null) &&
    (note.certainty !== 'confirmed' || (note.releaseId !== null && note.trackKey !== null))
  );
}
export const researchNoteInputSchema = z
  .object({ ...fields, id: z.uuid().optional() })
  .strict()
  .refine(validReference, 'Confirmed matches need a saved release and track.');
export const researchNoteSchema = z.object({ ...fields, id: z.uuid() }).refine(validReference);
export type ResearchNote = z.infer<typeof researchNoteSchema>;
