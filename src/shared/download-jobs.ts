import { z } from 'zod';
import { audioErrorSchema, localTrackSchema, trackIdSchema } from './audio';
import type { AudioResult, DownloadInput } from './audio';

export const downloadStageSchema = z.enum([
  'queued',
  'preparing',
  'downloading',
  'converting',
  'tagging',
  'complete',
  'failed',
  'cancelled',
  'cancelling',
]);
const measured = z.number().nonnegative().nullable();
export const downloadProgressSchema = z.object({
  stage: downloadStageSchema,
  bytes: measured,
  totalBytes: measured,
  percent: measured.refine((value) => value === null || value <= 100),
  speed: measured,
  eta: measured,
});
export type DownloadProgress = z.infer<typeof downloadProgressSchema>;
export const downloadJobSchema = downloadProgressSchema
  .extend({
    id: z.uuid(),
    title: z.string(),
    releaseId: z.number().int().positive(),
    videoIndex: z.number().int().nonnegative().optional(),
    sourceId: trackIdSchema.optional(),
    artist: z.string().optional(),
    album: z.string().optional(),
    artworkUrl: z.string().nullable().optional(),
    track: localTrackSchema.nullable(),
    error: audioErrorSchema.nullable(),
  })
  .refine(
    (job) =>
      job.stage !== 'complete' ||
      (job.track !== null && job.error === null && job.track.releaseId === job.releaseId),
  );
export type DownloadJob = z.infer<typeof downloadJobSchema>;
export function downloadStage(stage: DownloadProgress['stage']): DownloadProgress {
  return { stage, bytes: null, totalBytes: null, percent: null, speed: null, eta: null };
}
export interface DownloadJobsBridge {
  list: () => Promise<AudioResult<DownloadJob[]>>;
  start: (input: DownloadInput[]) => Promise<AudioResult<DownloadJob[]>>;
  cancel: (id: string) => Promise<AudioResult<DownloadJob>>;
  retry: (id: string) => Promise<AudioResult<DownloadJob>>;
}
