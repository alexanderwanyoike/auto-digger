import { accountSchema, discogsFailure } from '../../shared/discogs';
import type { DiscogsAccount, DiscogsRelease, DiscogsResult } from '../../shared/discogs';
import { releaseMetadataSchema } from './releaseMetadata';
import { requestDiscogs } from './request';

export function createDiscogsSession(request: typeof fetch = (input, init) => fetch(input, init)) {
  let account: DiscogsAccount | null = null;
  let acceptedToken: string | null = null;
  let revision = 0;
  const clear = () => {
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
