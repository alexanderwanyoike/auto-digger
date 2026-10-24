# Sections and named crate screens

The header navigation switches between Digging desk, Crates, Downloads and Settings. The bottom player remains mounted across sections. The development phase badge is removed.

The desk's active-crate selector chooses the destination for saved releases. EPs, albums and other loaded release formats can be saved. The Crates section creates, selects, renames and deletes crates, removes memberships, opens saved records offline and edits track picks and personal tags. Deleting a crate requires an inline confirmation and never deletes downloaded audio. Tags are comma separated, up to 20 values of 40 characters each, and are independent of Discogs metadata and file ID3 tags.

Downloads searches the complete current library by track, artist or album, plays saved tracks through the shared player and reveals files. Settings provides dedicated access to the encrypted Discogs account flow and appearance controls. Destination/layout and material/accent preferences follow in the next settings phase.

Release actions open sellers for the exact Discogs release, or encoded artist/title searches on Beatport, Traxsource and Bandcamp. Search results are manual discovery aids, not verified recording matches. Main validates the platform and release and constructs an HTTPS URL from fixed destinations; renderer input never becomes an arbitrary URL passed to the operating system.

The UI uses React's documented state and component composition patterns, preserving the established local artwork, aluminium surfaces and restrained accent. [React state guidance](https://react.dev/learn/sharing-state-between-components) informs the shared hooks; no upstream source is copied. Requests return explicit typed results and errors remain visible beside the relevant work.

Dependencies: progressive preview PR #15 and SQLite catalogue PR #16. Feature branches are created from dev, then integrate these prerequisite feature branches locally. All feature PRs target dev and remain unmerged pending explicit approval.
