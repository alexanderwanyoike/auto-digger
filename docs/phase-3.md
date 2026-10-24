# Phase 3: Filtered EP search

Depends on Phase 2. Combine optional label, artist, four-digit year, genre, style and release-title filters against Discogs database search. Always request specific releases in EP format. Accept every Discogs genre/style as free text rather than limiting vocabulary locally. Trim inputs and reject invalid years before HTTP.

Show matching release summaries, total count, an honest empty state and pagination within Discogs' first 10,000 results. Selecting a result loads its full metadata. Loading, invalid filters, authentication, rate limits and network errors remain explicit typed Results. Disconnect clears search results. Random selection belongs to Phase 4.

The request pattern follows the BSD-licensed python3-discogs-client: explicit search keyword parameters and lazy page retrieval, with no copied source. See https://github.com/joalla/discogs_client and https://www.discogs.com/developers/.
