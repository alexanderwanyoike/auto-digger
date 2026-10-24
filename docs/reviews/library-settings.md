# Library settings reviews

Both full-phase cycles use integrated prerequisite base f6c47c0.

## Cycle 1

Reviewed 39217a5. Both axes identified unavailable destinations failing the entire library. Spec also found playback still depended on recovery sidecars after indexing. Separate red/green regressions now exercise an unavailable old destination beside healthy new audio, sidecar-free indexed playback/cache reuse, and missing-source redownload with the original track assignment.

An additional native contrast regression checks muted text on primary/raised surfaces and accent text on its soft background across all 18 light/dark, material and accent combinations. Strengthened light muted text after confirming the failure. The formula follows [WCAG contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

## Cycle 2

Reviewed the full phase through 4c0d3ba. Both Standards and Spec reported no remaining actionable findings. Reviewers inspected pinned objects without edits/builds, and the Spec reviewer inspected the settings screenshot.

The user then requested Settings as a cog on the right. Separate red/green commits cover that placement at 900px and 1180px; the action retains its accessible name, tooltip and selected state.

Validation: `yarn verify` passes 105 unit/integration tests and build; `xvfb-run --auto-servernum yarn test:electron` passes 15 native tests. New PRs remain unmerged.
