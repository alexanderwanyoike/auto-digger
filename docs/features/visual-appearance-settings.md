# Visual appearance settings

The user supplied a settings screenshot and requested a similar appearance picker. Apply its visual structure to Auto Digger's Appearance section: material thumbnails with concise descriptions, a segmented appearance selector and accent swatches. Keep the existing restrained materials and the flatter app surfaces.

Show Brushed aluminium, Ceramic, Slate, Graphite, Warm paper and Copper as six equal-width miniature previews in two compact rows. Each thumbnail uses the actual material palette in the current light/dark mode and the current accent. Names and short descriptions remain visible. A selected outline and a separate keyboard focus indicator make the state clear.

Light, Dark and System remain the supported appearance modes. The header control and settings selector share the existing appearance state and persistence. Blue, Teal, Amber, Coral, Sage, Lilac and Rose appear as labelled swatches with a selection ring and the chosen colour's name. The user explicitly requested more materials and accents after the initial reference pass. Existing saved choices remain valid; additional values persist through the same SQLite settings record.

Use native labelled radio groups for keyboard and pointer interaction. Keep focus during asynchronous saves. Show a pending choice immediately, block conflicting preference changes while saving, and restore the saved choice if its typed storage Result fails. Preserve download layout/destination and all existing preference values. The right-aligned Settings cog stays in place.

The supplied screenshot informs composition, not new product features or branding. The checkable-item, selected-indicator and keyboard pattern follows the [MIT-licensed Radix Radio Group](https://www.radix-ui.com/primitives/docs/components/radio-group). This is an independent native HTML/React/CSS implementation using browser radio behaviour, with no new dependency or copied assets/code. The frontend-design skill informs spacing, material previews and restrained selection states.

Tests cover changing material/mode/accent, pending selection and failed-write restoration, keyboard focus and arrows, reload persistence, System mode, all 84 readable light/dark, material and accent combinations, preview geometry and both 900px and 1180px light/dark layouts. Both full verification commands remain required. The additional requested review of PR #20 found no actionable Standards or Spec findings.

Depends on #15 through #21 in order. Feature PRs target dev and remain unmerged.
