import { createDigger } from './digger';
import { digInputSchema } from '../../shared/dig';
import type { DigResult } from '../../shared/dig';
import { accountSchema } from '../../shared/discogs';
import { discogsFailure } from '../../shared/discogsFailure';
import type { DiscogsAccount, DiscogsRelease, DiscogsResult } from '../../shared/discogs';
import { releaseMetadataSchema } from './releaseMetadata';
import { requestDiscogs } from './request';
import { searchDiscogs } from './search';
import type { SearchPage } from '../../shared/search';

export function createDiscogsSession(request: typeof fetch = (input, init) => fetch(input, init)) {
  let account: DiscogsAccount | null = null;
  let acceptedToken: string | null = null;
  let revision = 0;
  const digger = createDigger(
    (filters, page) => searchDiscogs({ filters, page }, acceptedToken ?? '', request),
    (id) =>
      requestDiscogs(
        `/releases/${id.toString()}`,
        acceptedToken ?? '',
        releaseMetadataSchema,
        request,
      ),
  );
  const clear = () => {
    digger.reset();
    revision += 1;
    account = null;
    acceptedToken = null;
  };

  return {
    account(): DiscogsResult<DiscogsAccount | null> {
      return { ok: true, value: account };
    },
    disconnect(): DiscogsResult<undefined> {
      clear();
      return { ok: true, value: undefined };
    },
    async dig(input: unknown): Promise<DiscogsResult<DigResult>> {
      if (!acceptedToken)
        return discogsFailure('unauthorized', 'Connect your Discogs account first.');
      const parsed = digInputSchema.safeParse(input);
      if (!parsed.success) return discogsFailure('invalid-input', 'Use valid digging filters.');
      const started = revision;
      const result = await digger.next(parsed.data.filters, parsed.data.reset);
      if (started !== revision)
        return discogsFailure('cancelled', 'The Discogs session has changed.');
      if (!result.ok && result.error.code === 'unauthorized') clear();
      return result;
    },
    async search(input: unknown): Promise<DiscogsResult<SearchPage>> {
      if (!acceptedToken)
        return discogsFailure('unauthorized', 'Connect your Discogs account first.');
      const started = revision;
      const result = await searchDiscogs(input, acceptedToken, request);
      if (started !== revision)
        return discogsFailure('cancelled', 'The Discogs session has changed.');
      if (!result.ok && result.error.code === 'unauthorized') clear();
      return result;
    },
    async loadRelease(id: unknown): Promise<DiscogsResult<DiscogsRelease>> {
      if (!acceptedToken)
        return discogsFailure('unauthorized', 'Connect your Discogs account first.');
      if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
        return discogsFailure('invalid-input', 'Enter a positive numeric Discogs release ID.');
      }
      const started = revision;
      const result = await requestDiscogs(
        `/releases/${id.toString()}`,
        acceptedToken,
        releaseMetadataSchema,
        request,
      );
      if (started !== revision)
        return discogsFailure('cancelled', 'The Discogs session has changed.');
      if (!result.ok && result.error.code === 'unauthorized') clear();
      return result;
    },
    async connect(token: unknown): Promise<DiscogsResult<DiscogsAccount>> {
      clear();
      if (
        typeof token !== 'string' ||
        !token.trim() ||
        /\s/.test(token.trim()) ||
        token.length > 256
      ) {
        return discogsFailure('invalid-input', 'Enter a valid Discogs personal token.');
      }
      const started = revision;
      const result = await requestDiscogs('/oauth/identity', token.trim(), accountSchema, request);
      if (started !== revision)
        return discogsFailure('cancelled', 'The Discogs session has changed.');
      if (result.ok) {
        account = result.value;
        acceptedToken = token.trim();
      }
      return result;
    },
  };
}
