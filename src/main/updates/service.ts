import type { UpdateResult, UpdateState } from '../../shared/updates';

export interface UpdateBackend {
  manual: boolean;
  check: () => Promise<UpdateResult<string | null>>;
  download: (progress: (percent: number) => void) => Promise<UpdateResult<undefined>>;
  install: () => Promise<UpdateResult<undefined>>;
}

export function createUpdateService(backend: UpdateBackend) {
  let state: UpdateState = { stage: 'idle' };
  const current = (): UpdateResult<UpdateState> => ({ ok: true, value: state });
  return {
    status: () => state,
    async check(): Promise<UpdateResult<UpdateState>> {
      if (['checking', 'downloading', 'ready'].includes(state.stage)) return current();
      const previous = state;
      state = { stage: 'checking' };
      const result = await backend.check();
      if (!result.ok) {
        state = previous;
        return result;
      }
      state = result.value
        ? { stage: 'available', version: result.value, manual: backend.manual }
        : { stage: 'idle' };
      return current();
    },
    async download(): Promise<UpdateResult<UpdateState>> {
      if (state.stage !== 'available')
        return { ok: false, error: 'Choose an available update before downloading.' };
      const available = state;
      state = backend.manual
        ? available
        : { stage: 'downloading', version: available.version, percent: 0 };
      const result = await backend.download((percent) => {
        if (Number.isFinite(percent))
          state = {
            stage: 'downloading',
            version: available.version,
            percent: Math.round(Math.min(100, Math.max(0, percent))),
          };
      });
      if (!result.ok) {
        state = available;
        return result;
      }
      state = backend.manual ? available : { stage: 'ready', version: available.version };
      return current();
    },
    async install(): Promise<UpdateResult<UpdateState>> {
      if (state.stage !== 'ready')
        return { ok: false, error: 'Download the update before restarting.' };
      const result = await backend.install();
      return result.ok ? current() : result;
    },
  };
}
