# Consistent field focus

The shared input rule drew a two-pixel outline four pixels outside textboxes. Searchable selectors also contained a focusable text input, so that rule could draw a detached inner rectangle. Their outer control disables outlines in React Select itself, making an outline-based override unreliable.

Text, password, search and numeric inputs, native selects, textareas and searchable selectors now use the same compact frame: a one-pixel accent border plus a one-pixel adjacent ring. The searchable selector owns its visible frame; its inner input suppresses the duplicate indicator. The shape follows each field's existing rounded corners, with no gap and no layout shift. Colours use the selected accent and material tokens.

This follows the border-plus-ring pattern in the installed MIT-licensed React Select [Control implementation](https://github.com/JedWatson/react-select/blob/master/packages/react-select/src/components/Control.tsx). Native controls use the equivalent CSS treatment; no dependency or upstream JavaScript is copied. Shared field rules are loaded after component styles to make the treatment consistent across app sections.

The native regression first reproduced the detached outline. It checks token/password fields, Label and Artist, the searchable Genre input and its outer control, the crate picker, Downloads search, crate naming, Download organisation and the MCP configuration textarea. It exercises real keyboard navigation and verifies a single compact ring with at least 3:1 contrast, across Ceramic/Blue/Light and Warm paper/Rose/Dark. Existing control transitions are awaited through state assertions rather than fixed sleeps. Synthetic profiles isolate credentials, downloads and research access from the running app. Test and implementation phases are separate commits.

Depends on #26 and its prerequisites. Created from dev with the prerequisite feature integrated locally. Targets dev and remains unmerged.
