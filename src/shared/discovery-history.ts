import { z } from 'zod';

export const historyRecordSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  artist: z.string(),
  artworkUrl: z.string().nullable(),
  activity: z.enum(['opened', 'played']),
});
export type HistoryRecord = z.infer<typeof historyRecordSchema>;

export const historyEntrySchema = historyRecordSchema
  .extend({
    played: z.boolean(),
  })
  .omit({ activity: true });

export type HistoryEntry = z.infer<typeof historyEntrySchema>;
