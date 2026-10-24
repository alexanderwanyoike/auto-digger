# Phase 4: Random EP discovery

Depends on Phase 3. Dig from the last applied filters, loading a random matching EP and offering Dig again. Avoid showing the same release ID twice within a digging session. Applying different filters, resetting explicitly or reconnecting begins a fresh session. Draft filter edits do not change the applied criteria until Search EPs is submitted.

Sample uniformly from accessible result positions, including partially filled final pages. Cache pages only in memory. Limit the pool to the first 10,000 search results and disclose truncation. Confirm EP format from loaded metadata, skip stale/missing/non-EP candidates, bound attempts per click and show empty/exhausted/retry states. Network/rate failures allow retry without consuming the failed candidate. Disconnect invalidates in-flight digging and clears history.

The sampling pattern is partial Fisher-Yates, informed by d3-array's ISC-licensed shuffle implementation (https://github.com/d3/d3-array/blob/main/src/shuffle.js). No source is copied. Discogs documents its 10,000-result search window at https://support.discogs.com/hc/en-us/articles/360003622014-How-To-Browse-Search-In-The-Database.
