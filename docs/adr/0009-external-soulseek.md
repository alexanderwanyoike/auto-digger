# External Soulseek audio through slskd

Status: production integration, dependent on ADR 0008 folder organisation.

Soulseek is an optional audio provider on the digging desk. Auto Digger talks to a separately installed slskd instance over its HTTP API. It does not bundle a Soulseek client, run slskd, manage sharing or request the user's Soulseek password. slskd owns the peer connection and transfer; Auto Digger owns its library copy, Discogs assignment, source provenance and destination.

Use the established API flow in the [slskd 0.26.2 web search client](https://github.com/slskd/slskd/blob/0.26.2/src/web/src/lib/searches.js) and [batch transfer controller](https://github.com/slskd/slskd/blob/0.26.2/src/slskd/Transfers/API/Controllers/TransfersController.cs). These sources are AGPL-3.0-only with additional terms. No upstream implementation is copied. Keep slskd external. Search requests retain slskd's default timeout and bound responses to 1,000 files and 100 peers.

Search replaces non-letter and non-number characters with spaces, retaining Unicode letters and the original catalogue title. An editable query sits above a compact table with sticky headers in a 240px scroll area. Render 40 results initially and disclose further batches on request. Private counts remain separate; preserve the distinction between the API's files and lockedFiles collections even when isLocked is absent or false. Only public matches issued by this main-process search service can be downloaded. Keep at most ten recent searches in memory.

Settings stores the service URL, API key and completed-downloads folder using the existing OS-encrypted secret-store pattern. Never return a saved API key to the renderer. HTTP is limited to loopback hosts; remote services require HTTPS. Requests refuse redirects, bound response size and time, validate responses and expose typed Results. IPC remains scoped to the owning window and its main frame.

The API does not serve completed file bytes. A local or shared-filesystem path to slskd's completed-downloads root is required. Each request uses an isolated batch destination beneath that root. Wait for successful completion and the final regular file of the expected size, rejecting escapes and symlinks. Copy it into Auto Digger's destination; preserve slskd's copy. Cancellation targets only that transfer, and network waiting is bounded to thirty minutes.

Saved Soulseek sources use a deterministic release/peer/file/size identity and explicit provenance, alongside legacy release/video identities. MP3, FLAC, WAV, M4A, Ogg and Opus keep their original audio encoding; MP3 uses existing best-effort ID3 tagging. Other formats retain their original embedded tags while Auto Digger records Discogs metadata. The audio protocol uses the saved extension's media type. Existing YouTube downloads remain readable and playable. Future downloads use the shared folder policy with Soulseek as the source name; indexed files retain their locations after settings changes or restart.

Acceptance: a public match can be downloaded from the desk, appears in Downloads and plays after restart, with its bytes in the configured Auto Digger hierarchy. Exercise settings and the real desktop queue against an HTTP boundary fixture, then verify a real peer transfer locally. Document local evidence without committing credentials or private peer data.
