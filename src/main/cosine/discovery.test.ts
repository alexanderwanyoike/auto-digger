import { expect, test, vi } from 'vitest';
import { createCosineService } from './service';

function requestUrl(input: Parameters<typeof fetch>[0]) {
  if (typeof input === 'string') return new URL(input);
  if (input instanceof URL) return input;
  return new URL(input.url);
}

function credentials() {
  return {
    load: vi.fn().mockResolvedValue({ ok: true, value: 'private-key' }),
    save: vi.fn(),
    clear: vi.fn(),
  };
}

test('searches artist and full title before YouTube and recommends from a confirmed name match when the upload is unindexed', async () => {
  const request = vi.fn<typeof fetch>().mockImplementation((input) => {
    const url = requestUrl(input);
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
    const url = requestUrl(input);
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

test.each(['search', 'lookup', 'similar'])(
  'retains available recommendations and marks incomplete results when %s fails',
  async (failed) => {
    const request = vi.fn<typeof fetch>().mockImplementation((input) => {
      const url = requestUrl(input);
      if (
        (failed === 'search' && url.pathname.endsWith('/search')) ||
        (failed === 'lookup' && url.pathname.endsWith('/lookup')) ||
        (failed === 'similar' && url.pathname.includes('/tracks/3/'))
      )
        return Promise.resolve(Response.json({}, { status: 503 }));
      if (url.pathname.endsWith('/search'))
        return Promise.resolve(
          Response.json({
            success: true,
            data: [{ id: '1', artist: 'Low Tide', track: 'Quiet Orbit' }],
          }),
        );
      if (url.pathname.endsWith('/lookup'))
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
      return Promise.resolve(
        Response.json({
          success: true,
          data: { similar_tracks: [{ id: '20', artist: 'Still Waters', track: 'Later Orbit' }] },
        }),
      );
    });
    expect(
      await createCosineService(credentials(), request).similar({
        url: 'https://youtu.be/abcdefghijk',
        artist: 'Low Tide',
        title: 'Quiet Orbit',
      }),
    ).toMatchObject({ ok: true, value: { incomplete: true, tracks: [{ id: '20' }] } });
  },
);

test('requests recommendations once when artist/title and YouTube identify the same Cosine track', async () => {
  const request = vi.fn<typeof fetch>().mockImplementation((input) => {
    const url = requestUrl(input);
    if (url.pathname.endsWith('/similar'))
      return Promise.resolve(Response.json({ success: true, data: { similar_tracks: [] } }));
    return Promise.resolve(
      Response.json({ success: true, data: [{ id: '1', artist: 'Sherwood', track: 'Billabong' }] }),
    );
  });
  expect(
    await createCosineService(credentials(), request).similar({
      url: 'https://youtu.be/nKp_mHmhbYY',
      artist: 'Sherwood (2)',
      title: 'Billabong',
    }),
  ).toMatchObject({ ok: true, value: { seeds: [{ id: '1' }], tracks: [], incomplete: false } });
  expect(request).toHaveBeenCalledTimes(3);
});

test('keeps a conflicting YouTube recording out of confirmed artist/title recommendations', async () => {
  const request = vi.fn<typeof fetch>().mockImplementation((input) => {
    const url = requestUrl(input);
    if (url.pathname.endsWith('/search'))
      return Promise.resolve(
        Response.json({
          success: true,
          data: [{ id: '1', artist: 'Low Tide', track: 'Quiet Orbit (Dub)' }],
        }),
      );
    if (url.pathname.endsWith('/lookup'))
      return Promise.resolve(
        Response.json({
          success: true,
          data: [{ id: '3', artist: 'Another Artist', track: 'Different Song' }],
        }),
      );
    return Promise.resolve(
      Response.json({
        success: true,
        data: { similar_tracks: [{ id: '20', artist: 'Still Waters', track: 'Later Orbit' }] },
      }),
    );
  });
  expect(
    await createCosineService(credentials(), request).similar({
      url: 'https://youtu.be/abcdefghijk',
      artist: 'Low Tide',
      title: 'Quiet Orbit (Dub)',
    }),
  ).toMatchObject({
    ok: true,
    value: { seeds: [{ id: '1' }], incomplete: true, tracks: [{ id: '20' }] },
  });
  expect(request).toHaveBeenCalledTimes(3);
});
