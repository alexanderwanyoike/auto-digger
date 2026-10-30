import { expect, test, vi } from 'vitest';
import { releaseResponse } from '../../../tests/discogs-fixtures';
import { createCosineService } from './service';

function store() {
  return {
    load: vi.fn().mockResolvedValue({ ok: true, value: 'private-key' }),
    save: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    clear: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
  };
}
const recommendation = {
  id: '2',
  artist: 'Low Tide',
  title: 'Quiet Orbit',
  youtubeUrl: 'https://www.youtube.com/watch?v=lmnopqrstuv',
  releaseId: 12,
};

test('requests lookup then similar tracks, preserves mix names and deduplicates IDs and uploads', async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json({
        success: true,
        data: [{ id: '1', artist: 'Low Tide', track: 'Quiet Orbit' }],
      }),
    )
    .mockResolvedValueOnce(
      Response.json({
        success: true,
        data: {
          similar_tracks: [
            {
              id: '2',
              artist: 'Still Waters',
              track: 'Later Orbit (Club Mix)',
              external_link: 'https://www.discogs.com/release/13-Later-EP',
              video_uri: 'https://youtu.be/lmnopqrstuv',
            },
            {
              id: '2',
              artist: 'Still Waters',
              track: 'duplicate',
              video_uri: 'https://youtu.be/lmnopqrstuv',
            },
            {
              id: '3',
              artist: 'Still Waters',
              track: 'same upload',
              video_uri: 'https://www.youtube.com/watch?v=lmnopqrstuv',
            },
            {
              id: '4',
              artist: 'Still Waters',
              track: 'Later Orbit (Dub Mix)',
              external_link: 'https://discogs.com.evil.example/release/14',
              video_uri: 'https://youtu.be/zzzzzzzzzzz',
            },
          ],
        },
      }),
    );
  const api = createCosineService(store(), request);
  const result = await api.similar({
    url: 'https://youtu.be/abcdefghijk',
    fromYear: 2000,
    toYear: 2010,
  });
  expect(result).toMatchObject({
    ok: true,
    value: {
      tracks: [
        {
          id: '2',
          title: 'Later Orbit (Club Mix)',
          releaseId: 13,
          youtubeUrl: 'https://www.youtube.com/watch?v=lmnopqrstuv',
        },
        { id: '4', title: 'Later Orbit (Dub Mix)', releaseId: null },
      ],
    },
  });
  expect(request.mock.calls[0]?.[0]).toContain('/tracks/lookup?url=');
  expect(request.mock.calls[1]?.[0]).toContain('/tracks/1/similar?');
  expect(request.mock.calls[1]?.[0]).toContain('start_year=2000');
  expect(new Headers(request.mock.calls[0]?.[1]?.headers).get('Authorization')).toBe(
    'Bearer private-key',
  );
});

test.each([401, 403, 404, 429])('returns a deliberate safe failure for HTTP %s', async (status) => {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ secret: 'private-key' }, { status }));
  const result = await createCosineService(store(), request).similar({
    url: 'https://youtu.be/abcdefghijk',
  });
  expect(result.ok).toBe(false);
  expect(JSON.stringify(result)).not.toContain('private-key');
});

test('rejects malformed and ambiguous successes and unconfigured or invalid requests', async () => {
  const request = vi.fn<typeof fetch>().mockResolvedValue(
    Response.json({
      success: true,
      data: [
        { id: '1', artist: 'A', track: 'Mix A' },
        { id: '2', artist: 'B', track: 'Mix B' },
      ],
    }),
  );
  expect(
    await createCosineService(store(), request).similar({ url: 'https://youtu.be/abcdefghijk' }),
  ).toMatchObject({ ok: false, error: { code: 'ambiguous' } });
  const empty = store();
  empty.load.mockResolvedValue({ ok: true, value: null });
  expect(
    await createCosineService(empty, request).similar({ url: 'https://youtu.be/abcdefghijk' }),
  ).toMatchObject({ ok: false, error: { code: 'not-configured' } });
  request.mockClear();
  expect(
    (await createCosineService(store(), request).similar({ url: 'http://127.0.0.1/private' })).ok,
  ).toBe(false);
  expect(request).not.toHaveBeenCalled();
});

test('resolves a verified pressing, preserves the candidate upload and leaves ambiguous versions unassigned', async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockImplementation(() => Promise.resolve(Response.json(releaseResponse)));
  const api = createCosineService(store(), request);
  const exact = await api.resolve(recommendation);
  expect(exact).toMatchObject({
    ok: true,
    value: {
      videoIndex: 1,
      trackIndex: 0,
      release: { id: 12, videos: [expect.anything(), { cosineTrackIndex: 0 }] },
    },
  });
  expect(new Headers(request.mock.calls[0]?.[1]?.headers).has('Authorization')).toBe(false);
  expect(await api.resolve({ ...recommendation, title: 'Quiet Orbit (Dub Mix)' })).toMatchObject({
    ok: true,
    value: {
      trackIndex: null,
      release: { videos: [expect.anything(), { cosineTrackIndex: null }] },
    },
  });
  request.mockResolvedValueOnce(Response.json({ ...releaseResponse, id: 99 }));
  expect((await api.resolve(recommendation)).ok).toBe(false);
});

test('refuses ambiguous track identities even when Cosine attaches them to the same upload', async () => {
  const request = vi.fn<typeof fetch>().mockResolvedValue(
    Response.json({
      success: true,
      data: [
        {
          id: '1',
          artist: 'Low Tide',
          track: 'Quiet Orbit (Club Mix)',
          video_uri: 'https://youtu.be/abcdefghijk',
        },
        {
          id: '2',
          artist: 'Low Tide',
          track: 'Quiet Orbit (Dub Mix)',
          video_uri: 'https://youtu.be/abcdefghijk',
        },
      ],
    }),
  );
  expect(
    await createCosineService(store(), request).similar({ url: 'https://youtu.be/abcdefghijk' }),
  ).toMatchObject({ ok: false, error: { code: 'ambiguous' } });
  expect(request).toHaveBeenCalledTimes(1);
});
