# PR 39 review

Reviewed the feature against `8e9108d5b70e2893e1258c38c133244d7c07f563` after user approval, with independent Standards and Spec reviewers. The first pass reviewed `f10788d`; the second reviewed the fix through `9fc737b` and the added versioned-path regression in `38cbb33`.

## Standards

The first pass found one P2: the application closed its catalogue and other services and released its instance lock before the SDK accepted installation. An expected installer failure left the old window running with unavailable services. This violated the requirement to handle expected failures deliberately.

The fix retains services and the lock until normal app exit after a successful installer handoff. Linux uses the SDK's installed AppImage path and Electron's queued relaunch so the replacement starts after the old process exits. The second pass confirmed the finding resolved, with no additional documented-standard violations or actionable baseline smells.

## Spec

The first pass independently found the same P2: a failed installation left Retry visible but the catalogue unusable. The second pass confirmed that installation denial now leaves the catalogue, MCP access and single-instance lock available, and that retry completes the update. There were no further actionable spec findings.

## Verification

A regression using the real SDK first failed when creating a crate after a denied installation. The failing test and fix are separate commits. The passing checks cover retained MCP access and instance lock, successful retry, a versioned AppImage filename change and crates surviving reopening. The synthetic AppImage respects the SDK's validation-only launch flag, so its marker confirms the queued replacement launch.

Windows interactive updating and Mac installer opening remain target-device checks.

Standards: one P2 fixed, zero remaining. Spec: one P2 fixed, zero remaining.
