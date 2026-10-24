import { accountSchema, discogsFailure } from '../../shared/discogs';
import type { DiscogsAccount, DiscogsRelease, DiscogsResult } from '../../shared/discogs';
import { releaseMetadataSchema } from './releaseMetadata';
import { requestDiscogs } from './request';

export function createDiscogsSession(request: typeof fetch = (input, init) => fetch(input, init)) {
  let account: DiscogsAccount | null = null;
  let acceptedToken: string | null = null;

  return {
    account(): DiscogsResult<DiscogsAccount | null> {
      return { ok: true, value: account };
    },
    async loadRelease(id: number): Promise<DiscogsResult<DiscogsRelease>> {
      if (!acceptedToken)
        return discogsFailure('unauthorized', 'Connect your Discogs account first.');
      return requestDiscogs(
        `/releases/${id.toString()}`,
        acceptedToken,
        releaseMetadataSchema,
        request,
      );
    },
    async connect(token: string): Promise<DiscogsResult<DiscogsAccount>> {
      if (!token.trim() || /\s/.test(token.trim()) || token.length > 256) {
        return discogsFailure('invalid-input', 'Enter a valid Discogs personal token.');
      }
      const result = await requestDiscogs('/oauth/identity', token.trim(), accountSchema, request);
      if (result.ok) {
        account = result.value;
        acceptedToken = token.trim();
      }
      return result;
    },
  };
}
