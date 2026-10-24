# PR 27 review

Reviewed the feature from `bfcce97` to `d84686c`, using independent Standards and Spec reviewers after user approval.

## Standards

No confirmed documented-standard violations or actionable baseline smells.

## Spec

One P2 finding was reproduced and fixed: forced-colours mode suppresses box shadows, leaving only a subtle border-colour change after the normal outline reset. The field frame now has an adjacent system-colour outline in that mode, including React Select's outer control, without a duplicate inner indicator.

This follows the targeted fallback described in [MDN's forced-colours guidance](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/forced-colors). The important override is confined to this fallback because React Select sets an important outline reset internally.

Native regressions failed in both appearance modes before the fix, then passed with the two-pixel system outline, alongside the original compact-frame and contrast checks. Test and implementation are separate commits.
