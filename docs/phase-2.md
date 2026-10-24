# Phase 2: Discogs connection and release metadata

Builds on the Phase 1 desktop foundation from PR #1. The historical session-only storage requirement below is superseded by [remembered credentials](adr/0003-remembered-discogs-account.md).

## Scope

Connect with a personal Discogs user token and verify the account through `/oauth/identity`. Keep the accepted token only in main-process memory for the session; never write it to storage, return it in metadata, or log it. Disconnect clears the session and loaded release.

Load a release by its positive numeric Discogs ID. Display artwork when available, artist and label credits, catalogue numbers, year, country, genres, styles, formats, tracklist and the number of attached YouTube videos. Empty optional metadata gets clear fallback text. Playback, digging filters, random discovery and saved crates remain later phases.

Use a narrow, context-isolated Electron bridge for connection, account status, release lookup, disconnect and opening the fixed Discogs settings page. Validate IPC senders and inputs. Network, authentication, missing-release, rate-limit and malformed-response failures return typed Results and readable messages. Bound network requests with a timeout. The standalone browser preview cannot connect; use the desktop app for live Discogs access.

## Acceptance behaviours

- A valid token connects and shows the verified account; invalid tokens cannot connect.
- Loading a release produces validated metadata and never returns the token.
- Missing releases, rate limits, network failures and malformed responses are distinguishable Results.
- The connection form clears submitted tokens and offers instructions for generating one.
- Loading and error states are explicit; controls prevent overlapping session mutations.
- Disconnect clears account, token and the loaded record.
- Integration tests mock external HTTP at the boundary; a built Electron test exercises the real preload and IPC path without a live token.
