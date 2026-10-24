# Download foundation reviews

Base: `f10a5220ab2f486ae536f16c5ff55530274592f8` (PR #9).

## Cycle 1

Reviewed full change at `79bd796e44225bd2e5fde2f94470b49940af2694`.

### Standards

Found a collision path that could replace or delete existing audio, and Windows cancellation that left descendants running. Fixed with exclusive hard-link publication (`5fd443c`) and process-tree termination (`b1880b7`), each following a separately committed failing regression.

### Spec

Found missing metadata versioning, ignored manual corrections for saved sources and Windows cancellation. Fixed version envelopes (`a86962f`), offline reassignment (`464dd1d`) and process-tree termination. All have failing-test commits before implementation.

## Cycle 2

Reviewed the entire change at `b1880b7b53379efd606e275d6297a29a3972d7b5`.

### Standards

Found saved audio could be retagged before its corrected metadata was published. Fixed staged correction (`c53d40e`) with a failing regression that blocks sidecar publication after tagging. Fix validation identified ignored rollback failure; `477b658` explicitly handles its Result and retains a recovery MP3 when both replacement and rollback fail. Its regression verifies the original audio and recovery data survive.

### Spec

No remaining actionable findings. Separate sources, offline reassignment, version validation and Windows cancellation satisfy the foundation scope. The source list and bottom player are in the dependent interface PR.

## Verification

`yarn verify` passes formatting, strict lint/types, unit/integration tests and the production build. All six native Electron tests pass, including real subprocess fixture extraction, restart persistence, blocked source URLs and byte-range streaming. Live inspection with current yt-dlp correctly reports an unavailable YouTube test video; deterministic media fixtures cover successful extraction and playback transport. No user credentials were used.
