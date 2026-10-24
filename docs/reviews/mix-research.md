# Mix research reviews

Both full-phase cycles use prerequisite base 240c3f1, the reviewed flat-library PR #20. The feature and ADR define the user-approved local MCP workflow.

## Cycle 1

Reviewed 03efd36. Standards found that a thrown UI notification could turn a committed mutation's success into a reported failure. Spec found cancellation stopped at the research service, leaving serialized Discogs lookups running or starting after revocation.

Separate red/green commits cover notification failure, active and queued Discogs cancellation, and revoked create/annotate/save operations at asynchronous store boundaries. Successful writes retain their success when a window closes. AbortSignal reaches the serialized session and network request; queued research checks revocation before contacting Discogs. Store boundaries check revocation again before committing.

## Cycle 2

Reviewed the full phase through a00874d. Standards reported no remaining documented breaches or actionable heuristic smells. Spec reported no remaining actionable findings. Subsequent lint-only refactoring groups the same search signal with its options and makes test callbacks explicit; focused cancellation and search tests still pass.

The real SDK stdio client exercises tool discovery, verified Discogs additions, live picks/tags, evidence links, access revocation, duplicate app starts and restart persistence. Synthetic fixtures do not claim to identify a real H-Foundation mix. The flat Downloads and compact crate controls retain their native regression coverage.

Final validation: `yarn verify` passes all 132 tests, formatting, lint, strict types, icons and the production build. `xvfb-run --auto-servernum yarn test:electron` passes all 21 native tests. PRs target dev and remain unmerged.

## CI launcher correction

The first GitHub run passed 20 native cases but the manually spawned duplicate did not exit normally on the runner. Its launcher omitted the sandbox flag that Playwright uses for the primary test app. The duplicate fixture now uses the same flag and reports both exit code and termination signal. The full local verification and all 21 native tests pass again. This changes test startup only.
