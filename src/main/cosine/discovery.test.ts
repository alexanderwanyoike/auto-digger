import { expect, test, vi } from 'vitest';
import { createCosineService } from './service';

function credentials() {
  return {
    load: vi.fn().mockResolvedValue({ ok: true, value: 'private-key' }),
    save: vi.fn(),
    clear: vi.fn(),
  };
}

test('searches artist and full title before YouTube and recommends from a confirmed name match when the upload is unindexed', async () => {
  const request = vi.fn<typeof fetch>().mockImplementation((input) => {
    const url = new URL(
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
    );
    if (url.pathname === '/api/v1/search')
      return Promise.resolve(
        Response.json({
          success: true,
          data: [
            { id: '1', artist: 'Low Tide', track: 'Quiet Orbit (Dub)' },
            { id: '99', artist: 'Low Tide', track: 'Quiet Orbit (Original Mix)' },
          ],
        }),
      );
    if (url.pathname === '/api/v1/tracks/lookup')
      return Promise.resolve(Response.json({}, { status: 404 }));
    return Promise.resolve(
      Response.json({
        success: true,
        data: {
          similar_tracks: [
            {
              id: '2',
              artist: 'Still Waters',
              track: 'Later Orbit (Club Mix)',
              video_uri: 'https://youtu.be/lmnopqrstuv',
            },
          ],
        },
      }),
    );
  });
  const result = await createCosineService(credentials(), request).similar({
    url: 'https://youtu.be/abcdefghijk',
    artist: 'Low Tide (2)',
    title: 'Quiet Orbit (Dub)',
  });
  expect(result).toMatchObject({ ok: true, value: { seed: { id: '1' }, tracks: [{ id: '2' }] } });
  expect(request.mock.calls[0]?.[0]).toContain('/search?');
  expect(request.mock.calls[0]?.[0]).toContain('q=Low+Tide+-+Quiet+Orbit+%28Dub%29');
  expect(request.mock.calls[1]?.[0]).toContain('/tracks/lookup?');
  expect(request.mock.calls[2]?.[0]).toContain('/tracks/1/similar?');
  expect(request).toHaveBeenCalledTimes(3);
});

test('combines recommendations from distinct confirmed name and YouTube seeds in order without repeating IDs, uploads or source tracks', async () => {
  const calls: string[] = [];
  const request = vi.fn<typeof fetch>().mockImplementation((input) => {
    const url = new URL(
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
    );
    calls.push(url.pathname + url.search);
    if (url.pathname === '/api/v1/search')
      return Promise.resolve(
        Response.json({
          success: true,
          data: [
            { id: '1', artist: 'Low Tide', track: 'Quiet Orbit' },
            { id: '1', artist: 'Low Tide', track: 'Quiet Orbit' },
          ],
        }),
      );
    if (url.pathname === '/api/v1/tracks/lookup')
      return Promise.resolve(
        Response.json({
          success: true,
          data: [
            {
              id: '3',
              artist: 'Low Tide',
              track: 'Quiet Orbit',
              video_uri: 'https://youtu.be/abcdefghijk',
            },
          ],
        }),
      );
    const common = {
      id: '20',
      artist: 'Still Waters',
      track: 'Later Orbit (Club Mix)',
      video_uri: 'https://youtu.be/lmnopqrstuv',
    };
    const tracks = url.pathname.includes('/tracks/1/')
      ? [
          common,
          {
            id: '21',
            artist: 'Still Waters',
            track: 'Later Orbit (Dub Mix)',
            video_uri: 'https://youtu.be/zzzzzzzzzzz',
          },
          { id: '3', artist: 'Low Tide', track: 'Quiet Orbit' },
        ]
      : [
          common,
          {
            id: '22',
            artist: 'Still Waters',
            track: 'Duplicate upload',
            video_uri: 'https://www.youtube.com/watch?v=zzzzzzzzzzz',
          },
          { id: '23', artist: 'Deep Current', track: 'New Dawn' },
          { id: '1', artist: 'Low Tide', track: 'Quiet Orbit' },
        ];
    return Promise.resolve(Response.json({ success: true, data: { similar_tracks: tracks } }));
  });
  const result = await createCosineService(credentials(), request).similar({
    url: 'https://youtu.be/abcdefghijk',
    artist: 'Low Tide',
    title: 'Quiet Orbit',
    fromYear: 2000,
    toYear: 2010,
  });
  expect(result).toMatchObject({
    ok: true,
    value: {
      seeds: [{ id: '1' }, { id: '3' }],
      tracks: [{ id: '20' }, { id: '21' }, { id: '23' }],
    },
  });
  expect(calls[0]).toContain('/search?');
  expect(calls[1]).toContain('/tracks/lookup?');
  expect(calls.filter((url) => url.includes('/similar?'))).toHaveLength(2);
  expect(calls.filter((url) => url.includes('/similar?'))).toEqual(
    expect.arrayContaining([expect.stringContaining('start_year=2000&end_year=2010')]),
  );
});
