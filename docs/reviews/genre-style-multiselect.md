# Multi-select correction reviews

Base: `e3d7d1f` (merged Phases 1-6).

## Cycle 1

Head: `8d849cb628068c26c3a0c2e6384eb364158f1861`.

### Standards

No actionable violations or baseline smells. Control, normalization and adapter responsibilities are cohesive; typed Results and separate test/implementation commits are preserved. Sources and licences are recorded.

### Spec

No actionable findings. ANY semantics, empty selections, applied snapshots, new taxonomy names and native IPC satisfy the correction scope.

## Cycle 2

Head: `0fe24f832ebd4a1da5910ba101dbacdb427392ed`.

### Standards

No actionable findings or baseline smells across the full change.

### Spec

No actionable findings. Normalized history, array validation and selection semantics remain correct. Native tests now dismiss the portaled dropdown with Escape before submitting, using its supported keyboard interaction.

## Verification

`yarn verify` passes 50 tests, formatting, lint, strict types and build. All four native Electron tests pass. A first native run exposed a test interaction issue: the open multi-select menu covered the Search button. The test now closes the menu before clicking Search. Live API checks separately verified pipe OR without user credentials.
