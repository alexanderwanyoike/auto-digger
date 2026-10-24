import { z } from 'zod';
import { downloadStage } from '../../shared/downloadJobs';
import type { DownloadProgress } from '../../shared/downloadJobs';

const measure = z.number().finite().nonnegative().nullable().optional();
const progressSchema = z.object({
  downloaded_bytes: measure,
  total_bytes: measure,
  total_bytes_estimate: measure,
  speed: measure,
  eta: measure,
});
export function parseDownloadProgress(line: string): DownloadProgress | null {
  try {
    if (line.startsWith('AD_POSTPROCESS:')) {
      const status: unknown = JSON.parse(line.slice('AD_POSTPROCESS:'.length));
      return ['started', 'processing', 'finished'].includes(
        typeof status === 'string' ? status : '',
      )
        ? downloadStage('converting')
        : null;
    }
    if (!line.startsWith('AD_PROGRESS:')) return null;
    const data: unknown = JSON.parse(line.slice('AD_PROGRESS:'.length));
    const parsed = progressSchema.safeParse(data);
    if (
      !parsed.success ||
      parsed.data.downloaded_bytes === undefined ||
      parsed.data.downloaded_bytes === null
    )
      return null;
    const bytes = parsed.data.downloaded_bytes;
    const totalBytes = parsed.data.total_bytes ?? parsed.data.total_bytes_estimate ?? null;
    return {
      stage: 'downloading',
      bytes,
      totalBytes,
      percent: totalBytes && totalBytes > 0 ? Math.min(100, (bytes / totalBytes) * 100) : null,
      speed: parsed.data.speed ?? null,
      eta: parsed.data.eta ?? null,
    };
  } catch {
    return null;
  }
}
