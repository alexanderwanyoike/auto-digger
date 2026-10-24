# Visual appearance settings reviews

Both full-phase review cycles compare the appearance feature with prerequisite base 848669f, the original MCP PR #21 head. The later CI test-launcher correction from #21 is integrated as a prerequisite and changes no appearance behaviour.

## Cycle 1

Reviewed ddf08be against the supplied reference and the user's subsequent request for more materials and accents. Standards reported no documented breaches or actionable heuristic smells. Spec reported no actionable findings. The six material previews and seven swatches match the expanded scope.

Earlier red/green regressions caught focus loss and temporary unchecked state during asynchronous saves, plus compact filter CSS leaking into material preview geometry. The picker keeps an immediate local selection, restores it on typed save failure and uses busy semantics without disabling the focused native radio. Its layout explicitly isolates the preview grid from filter labels.

## Cycle 2

Reviewed the full phase through edc9754. Both axes reported no actionable findings. Explicit useId/htmlFor associations preserve native behaviour. Final test-only cleanup removes unsupported Playwright options from Testing Library calls without changing their exact string matching.

Native checks cover keyboard arrows/focus, pending selection, failed storage, persisted new values, System mode, all six preview palettes, light/dark layouts at 900px and 1180px, and all 84 material/accent/mode contrast combinations. The app and preview swatches share palette definitions.

Final validation: `yarn verify` passes all 135 tests, formatting, lint, strict types, icons and the production build. `xvfb-run --auto-servernum yarn test:electron` passes all 23 native tests, including the integrated MCP and download workflows. Feature PRs target dev and remain unmerged.
