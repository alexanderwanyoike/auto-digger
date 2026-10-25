# Local MCP setup review

PR #37, based on dev `8e9108d`.

## Cycle 1

Standards: no actionable findings.

Spec: Codex's GUI expects raw executable and argument values. Copying JSON-encoded strings out of TOML can retain quotation marks or doubled Windows backslashes.

Fixed with raw Command and Argument 1/2/3 fields in Settings. Encoded configuration remains under Advanced configuration. A Windows-path regression test failed before the fields were implemented and passes with them.

## Cycle 2

Reviewed the raw fields, updated instructions and Auto Digger MCP naming through `4595274`.

Standards: no actionable findings. Spec: the copying issue is resolved; no remaining findings.

## Validation

Full verification passes with 164 tests. All 38 native checks pass, including standalone extension extraction, official manifest validation, real stdio tool calls and revocation. Linux packaging checks verify the installed runtime and bundled extension files.

Installation inside a real Claude Desktop host remains a manual check. The extension helper was tested independently with a real SDK client.
