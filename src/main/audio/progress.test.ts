import { expect, test } from 'vitest';
import { parseDownloadProgress } from './progress';

test('reads structured yt-dlp progress without guessing conversion percentages', () => {
  expect(
    parseDownloadProgress(
      'AD_PROGRESS:{"downloaded_bytes":25,"total_bytes":100,"speed":5,"eta":15}',
    ),
  ).toEqual({ stage: 'downloading', bytes: 25, totalBytes: 100, percent: 25, speed: 5, eta: 15 });
  expect(parseDownloadProgress('AD_POSTPROCESS:"started"')).toEqual({
    stage: 'converting',
    bytes: null,
    totalBytes: null,
    percent: null,
    speed: null,
    eta: null,
  });
  expect(
    parseDownloadProgress(
      'AD_PROGRESS:{"downloaded_bytes":25,"total_bytes":null,"total_bytes_estimate":200}',
    ),
  ).toMatchObject({ percent: 12.5, totalBytes: 200 });
  expect(
    parseDownloadProgress(
      'AD_PROGRESS:{"downloaded_bytes":25,"total_bytes":"NA","speed":"NA","eta":"NA"}',
    ),
  ).toMatchObject({ bytes: 25, percent: null, speed: null });
  expect(parseDownloadProgress('download 20%')).toBeNull();
  expect(parseDownloadProgress('AD_PROGRESS:{"downloaded_bytes":-1}')).toBeNull();
  expect(parseDownloadProgress('AD_PROGRESS:broken')).toBeNull();
});
