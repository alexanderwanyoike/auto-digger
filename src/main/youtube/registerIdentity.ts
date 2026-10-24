import type { Session } from 'electron';
import { playerHeaders } from './identity';

export function registerPlayerIdentity(session: Session) {
  session.webRequest.onBeforeSendHeaders(
    { urls: ['https://www.youtube.com/embed/*'] },
    (details, respond) => {
      respond({ requestHeaders: playerHeaders(details.url, details.requestHeaders) });
    },
  );
}
