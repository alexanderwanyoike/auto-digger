# Progressive preview

A source can be previewed before saving it. The shared bottom player streams audio progressively, supports pause/seek/volume and identifies previews separately from local downloads. Previewing creates no audio file, sidecar or saved-library entry. Download remains an explicit action.

Use yt-dlp's documented metadata extraction with an audio-only WebM/Opus preference, and proxy the resolved Google video media through the existing secure streaming scheme. Keep signed media URLs and source headers in the main process. Only known YouTube links and HTTPS Google video hosts are accepted. No redirects or cookies are forwarded. Network caching is disabled.

A preview session owns revocable opaque IDs, resolution cancellation and active streams. Starting another preview, choosing local playback, stopping preview or closing the window releases that session. Late resolutions cannot replace a newer selection. Header waits are bounded; long mixes remain seekable until their source expires, with a six-hour maximum session lifetime. Stream cancellation and completion release resources.

Preparing, buffering and playback failures are readable in the shared transport. Preview failure never silently saves audio. Existing downloads and their metadata remain independent.

This follows the established yt-dlp command-line metadata pattern (Unlicense) and Electron's streaming custom-protocol API (MIT), using standard fetch/ReadableStream backpressure rather than a custom decoder or temporary full-file download. See https://github.com/yt-dlp/yt-dlp#embedding-yt-dlp and https://www.electronjs.org/docs/latest/api/protocol.

Tests cover source restriction, headers, progressive reads, revocation, stale resolution, long mix expiry and process cancellation. Native Electron tests use delayed Opus delivery to prove playback starts before the response finishes and leaves the downloads folder empty. A separate public YouTube probe verified audio/webm and byte-range responses without fetching the full media.
