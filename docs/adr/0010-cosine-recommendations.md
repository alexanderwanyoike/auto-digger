# Cosine recommendations

Status: accepted for the recommendation feature.

Cosine Club is a recommendation provider. Discogs owns release metadata, while YouTube and Soulseek supply audio. A recommendation keeps its Cosine identity, complete track/mix title, canonical YouTube URL and linked Discogs pressing ID separately.

Use the existing encrypted token store and the request/response IPC boundary described in [ADR 0002](0002-discogs-boundary.md) and [ADR 0003](0003-remembered-discogs-account.md). These follow Electron's documented [IPC](https://www.electronjs.org/docs/latest/tutorial/ipc) and [safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage) patterns. No client implementation is copied and no dependency is added. API requests and decrypted keys stay in main. The renderer receives validated Results through a narrow preload API. Saving a key reports that it was saved; authentication is checked when requesting recommendations.

Follow the [Cosine API contract](https://registry.scalar.com/@cosine/apis/cosineclub-api/): look up the selected YouTube upload, then request similar tracks for its unique Cosine identity using Bearer authentication and a named User-Agent. Optional start/end years refine an explicit request. Show at most ten results. Collapse duplicate IDs and canonical upload URLs in results, preserving different uploads and mix titles. Multiple identities in lookup are ambiguous even if they share an upload; never silently choose one. Not-indexed uploads, rejected keys, rate limits and network failures are deliberate, safe failures.

Recommendations open in the digging desk on request. The user's filters and random digging history are retained. Opening a linked EP keeps a return to the recommendation list and the original EP. Independently navigating to another record dismisses this detour. Late request completions cannot restore a dismissed view. Settings contains only credential controls, with no API lab or prototype switch.

Only explicit Discogs release links are resolved in this slice. Load public metadata from the fixed Discogs API endpoint, verify the returned pressing ID, and never send the Cosine credential to Discogs. Bandcamp/Beatport resolution and artist/title catalogue searches are outside this feature. A result without a linked Discogs release remains visible with unavailable preview/open controls.

An exact, unique full-title and artist match supplies the proposed track assignment. An uncertain match stays unassigned. The resolved release retains the recommendation's upload with an explicit optional assignment hint, including null for uncertainty. This avoids reapplying fuzzy upload-title matching and makes the existing source rows available for correction, preview and download. Hints do not replace Discogs metadata or source identity.

Reuse the bounded temporary preview cache and normal audio library. Preview does not add to Downloads. Opening the linked EP and choosing Download saves those cached bytes using the current assignment, folder settings and MP3 style-tagging policy. Recommendations do not introduce another player or download implementation.

Recommendation rows reuse RecordArtwork for release covers and its missing/broken-image fallback. Following the existing sequential useSources loading pattern, prefetch metadata for the first visible recommendation of each distinct linked pressing, one at a time, without delaying the list. The current-list cache shares in-flight and completed lookups with Preview/Open, drops failed entries for explicit retry, and ignores old completions after clearing. Covers introduce no extra API or renderer dependency. Find similar has a visible text label beside the audio controls.
