# Digging desk panel bounds

The user reported clipped top and bottom edges on the starting-point and crate panels. Reproduction at 900x780 and 1600x1000 showed that the filters scrolled their own heading and padding away, while the crate empty state's flex minimum pushed its footer past the usable panel edge. Panel rectangles themselves fit the desk, ruling out an oversized workspace row.

Keep each panel's heading and footer outside its scrolling content. The existing outer padding remains visible at both ends. Filters and crate contents use a bounded native scroll viewport in the middle; the crate list no longer creates a second nested scroll area. Empty and populated crates retain the same boundary. Fields and first/last saved records remain reachable by focus and scrolling.

This follows the container/viewport separation described by the [MIT-licensed Radix Scroll Area](https://www.radix-ui.com/primitives/docs/components/scroll-area). The implementation uses native CSS overflow, with no new dependency or copied upstream code/assets.

The native regression connects an isolated synthetic account, selects the reported filters, checks panel insets, focuses the search action, and scrolls a 20-record crate from its last entry to its first. It checks the headings and footers remain fully visible, in compact and tall layouts, and the document does not overflow. The test failed before the fix and passes afterward; test and implementation are separate commits.

Depends on #22 and its prerequisites. The feature branch starts from dev, integrates #22 locally and targets dev. The fix remains unmerged until explicitly approved.
