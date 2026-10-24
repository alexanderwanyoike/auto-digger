# Download queue reviews

Both full-phase cycles use prerequisite base 8b1df18, which integrates reviewed PRs #15 through #18.

## Cycle 1

Reviewed 889a396. Standards found retry could bypass the pending-source identity rule. Spec confirmed active jobs could disappear in large batches and IPC polling failures could leave UI operations waiting indefinitely.

Separate red/green regressions cover conflicting retries, cancellation access for the head of a 25-job batch, and typed failure of pending UI operations after communication loss. Queue admission now shares the same source identity rule for start and retry. Additional regressions cover unavailable yt-dlp progress fields and malformed completed-job IPC data.

## Cycle 2

Reviewed the full phase through 2c99b33. Standards reported no remaining findings. Spec found older failed/cancelled jobs still lost Retry controls. Added failing cases for 25 failures and 25 cancellations, then retained every job in the bounded scrollable view. Pending jobs appear first. All retained failures and cancellations remain retryable.

Updated existing native source locators to distinguish source rows from queue/coverage rows. Native playback, seeking, volume, restart and offline tag-correction checks pass. Reviewers inspected pinned objects without edits or builds.

Final validation uses `yarn verify` and `xvfb-run --auto-servernum yarn test:electron`. PRs remain unmerged.
