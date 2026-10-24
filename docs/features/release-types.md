# Release types for digging

The digging desk searches all Discogs release types by default. Its Release type control is a searchable multi-select with Album, EP, Single, Compilation, Mini-Album, Maxi-Single, Mixtape, Mixed, Sampler, Box Set and LP suggestions. Other Discogs format names can be entered, using the existing genre/style control. These names follow the [Discogs format guidelines](https://support.discogs.com/hc/en-us/articles/360005006654-Database-Guidelines-6-Format); media such as Vinyl and CD remain distinct from release descriptions such as Album.

Selecting several types matches any selected value. The applied search combines release type with the other fields. Clearing all selected types removes the format constraint, including releases without a type description. Pagination and random digging use the last applied criteria; draft changes take effect on Search releases. Random digging checks loaded format descriptions against any selected type and skips stale candidates. Its existing session history, accessible result limit and error Results remain unchanged.

The implementation extends the existing MIT-licensed React Select multi-select pattern and the application's pipe-separated Discogs filter serialization. No dependencies or copied upstream code were added. The research search shares the optional format field and keeps independent session state.

The sidebar keeps its thin outline and hidden filter scrollbar. Tall layouts use tighter field spacing for the extra control; wheel and focus scrolling remain available at shorter heights and when selections wrap.

Tests cover normalized multi-type API parameters, unrestricted search, non-EP random draws, stale type mismatches, multi-select submission, pagination, applied versus draft values and clearing to all types. A native Electron fixture exercises the real renderer, IPC, Discogs session and SQLite crate by finding Album or Compilation releases, digging one, saving it and clearing to find Singles too. Panel geometry and rendered border regressions still cover 900x780 and 1600x1000.

Depends on #23 and its prerequisites. Created from dev with the prerequisite feature integrated locally. Targets dev and remains unmerged.
