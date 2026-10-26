import { expect, test, vi } from 'vitest';
import { createDiscogsSession } from './session';
import { identityResponse } from '../../../tests/discogs-fixtures';

test('research and ordinary digging include all release types when no types are selected', async () => {
  const request = vi.fn<typeof fetch>((input) => {
    const url = input instanceof Request ? input.url : input.toString();
    return Promise.resolve(
      new Response(
        JSON.stringify(
          url.endsWith('/oauth/identity')
            ? identityResponse
            : {
                pagination: { page: 1, pages: 1, per_page: 50, items: 1 },
                results: [{ id: 12, title: 'Low Tide - Quiet Orbit', format: ['Album'] }],
              },
        ),
      ),
    );
  });
  const session = createDiscogsSession(request);
  await session.connect('fixture-token');
  expect(
    await session.researchSearch({
      query: 'H-Foundation mix',
      filters: { genre: ['Electronic', 'Jazz'] },
    }),
  ).toMatchObject({ ok: true, value: { releases: [{ formats: ['Album'] }] } });
  const researchInput = request.mock.calls[1]?.[0];
  const research = new URL(
    researchInput instanceof Request
      ? researchInput.url
      : String(researchInput ?? 'https://invalid.example'),
  );
  expect(research.searchParams.get('format')).toBeNull();
  expect(research.searchParams.get('q')).toBe('H-Foundation mix');
  expect(research.searchParams.get('genre')).toBe('Electronic|Jazz');
  await session.search({ filters: {}, page: 1 });
  const diggingInput = request.mock.calls[2]?.[0];
  const digging = new URL(
    diggingInput instanceof Request
      ? diggingInput.url
      : String(diggingInput ?? 'https://invalid.example'),
  );
  expect(digging.searchParams.get('format')).toBeNull();
  expect(digging.searchParams.get('q')).toBeNull();
});
