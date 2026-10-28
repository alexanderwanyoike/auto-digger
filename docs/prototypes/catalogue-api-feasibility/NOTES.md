# Catalogue API feasibility prototype

Draft experiment, not a production change. Do not merge this PR into dev. Recorded on 28 October 2026.

## Question

Can Beatport and Bandcamp support digging from their catalogues, and can Cosine Club recommend tracks from a chosen YouTube video? Which access requirements, response shapes and filters can we actually verify before scheduling production work?

## Run

```sh
yarn prototype:apis
```

Open Settings. API feasibility appears at the top only in the prototype. It uses a separate scratch profile at the operating system's temporary directory, in a fresh `auto-digger-api-prototype-*` directory for each launch, with its own empty `Music` folder. Existing crates and download settings are not migrated into it. Normal launches do not expose the prototype bridge or its Settings controls.

Choose a service, enter its credential and click **Use for this session**. Cosine uses an API key; Beatport and Bandcamp use issued OAuth access tokens. A store login is separate from API access. Credentials remain in main-process memory, the input clears after submission, and **Forget session keys** clears all three. Quitting the prototype forgets them. No credentials or raw upstream error bodies are written to the repository or returned in reports. This experiment does not implement token acquisition or refresh. Probe requests do not modify crates or download audio. Opening a linked release uses the existing digging desk in the scratch profile; its normal save and audio controls are available there.

Requests use fixed HTTPS service endpoints, an identifying User-Agent, a 15-second timeout and no redirects. The design follows the app's existing narrow main-process IPC bridges, typed Results and Zod response validation. This is disposable probe code, not a shared production catalogue model.

## Findings

| Service     | Evidence                                                                                                                                                                                     | Decision                                                                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cosine Club | Authenticated search, YouTube URL lookup and similar-track requests returned HTTP 200. Recommendation requests with start/end year parameters returned usable results.                       | Feasible for the focused recommendation stream.                                                                                                                   |
| Beatport    | Release-search endpoint returned HTTP 401 without a token. Integration documentation requires sign-in. No issued token was supplied during this check; the user does not expect access soon. | Conditional. Authenticated search, metadata detail, pagination and filter support remain unverified.                                                              |
| Bandcamp    | Documented managed-bands endpoint returned HTTP 401 without a token. Published API documentation covers managed accounts, sales and merchandise.                                             | The user confirmed API access is by request and is on hold. No documented catalogue-search route established. Do not treat account API access as digging support. |

These access gaps are not evidence that all possible integrations are impossible. Further authenticated or partner documentation may change the conclusion.

### Cosine live demo

1. Artist/title search for `Hipp-E` returned ten catalogue candidates without automatically selecting one.
2. Lookup of the user's [YouTube URL](https://www.youtube.com/watch?v=nKp_mHmhbYY) returned one result: **Sherwood / Billabong**, Cosine ID `1275523`.
3. Selecting that result and requesting similar tracks with years `2000` to `2010` returned ten recommendations. Examples include **Joe Silva / Free (Red Carpet Mix)**, **Blakkat / Bak Fo Mo** and **Hipp-E / Stay All Night**.
4. Every result in this sample supplied a YouTube URL, Discogs release link, separate artist/title fields, stable Cosine ID and similarity score. Mix names were retained. See [live evidence](live-evidence.json).
5. An earlier lookup of a different YouTube upload returned HTTP 404. Lookup checks indexed links; this prototype does not submit missing audio for analysis. Published API lookup and the website's link-submission behaviour must not be assumed equivalent.

Ten results are a bounded sample, not proof of catalogue-wide link coverage, filter correctness or successful recording matching. The year parameters were accepted, but release years were not independently checked for every returned recording. Similarity is not identity. A source link is a useful candidate: production work still needs release/recording verification and explicit handling of ambiguous versions.

Only catalogue track IDs are deduplicated here. Production video deduplication and the compact track UI belong to their own focused changes. This prototype adds no recommendation feed to the digging desk.

### Recommendation to release navigation

The prototype now offers **Open release** beside linked recommendations. It accepts a specific HTTPS Discogs release URL, fetches public release metadata from the fixed Discogs API, verifies the returned release ID, and reuses the existing metadata parser and digging desk. It never sends a Cosine key to Discogs.

**Back to recommendations** returns to the same list, query and year bounds. This keeps the list out of the release view. A unique full title and artist match can identify a track, including its mix name. Missing or ambiguous versions remain unconfirmed and the desk asks the user to check the track/version. Nothing is automatically picked or saved.

Live public Discogs verification opened Joe Silva's **Free**, release `75566`, with **Free (Red Carpet Mix)** at track index 0. An invented mix stayed unconfirmed. The native navigation demo replayed the previously recorded Cosine response, then used the real preload/IPC and live Discogs metadata to open the release and return. The new screenshots explicitly label that replay; they do not claim a new authenticated Cosine request. The earlier authenticated Cosine checks remain the live recommendation evidence.

This proves one linked-release route, not general resolution by artist/title. Recommendations without a specific Discogs release link, master links, other catalogues and competing release versions still need a candidate-selection design. No fuzzy fallback is implemented.

### Filter implications

- Cosine documents artist/title search and similar-track year, price, have-count and want-count filters. This experiment exposes year bounds only. Other filters and pagination were not live-tested.
- Beatport search uses `q`, `type=releases` and `per_page=10`. The request shape is informed by the [MIT-licensed beets-beatport4 implementation](https://github.com/Samik081/beets-beatport4/blob/main/beetsplug/beatport4/client.py). No implementation was copied and no borrowed OAuth client identity is used. Treat the response parser as provisional until tested with issued access.
- No Discogs-like Bandcamp filter contract was established. Do not invent artist, label, year or genre API parameters based on website controls.

### Source data

Cosine identifies a recording using its own ID and returns optional links to catalogue sources and YouTube uploads. Beatport release and Bandcamp band IDs belong to separate namespaces. A Bandcamp managed-band record is not a release. No new IDs were inserted into the existing Discogs-only catalogue or crates.

## Verification

- A renderer test first failed because the prototype Settings panel did not exist. The failing tests and passing implementation are separate commits.
- Sixteen unit/UI checks cover session credential handling, explicit recommendation requests, ID deduplication, mix/link preservation, year bounds, HTTP 401/403/429 responses, malformed successful responses and the Bandcamp account/catalogue distinction.
- A native regression check reproduces the initial shared-profile single-instance collision, then verifies simultaneous scratch profiles, empty music folders and isolated in-memory keys. The shared profile and real-music-folder defaults were corrected before handoff.
- Live desktop verification used the real preload and IPC bridge. The user entered the Cosine key locally. Search, the supplied YouTube URL and recommendations all succeeded. Anonymous Beatport and Bandcamp requests returned HTTP 401.
- Screenshots show the actual desktop Settings panel and live Cosine response. Credential fields were empty at capture time.
- `VITEST_MAX_WORKERS=2 yarn verify` passed all 237 tests across 79 files, formatting, lint, strict types and build. The unchanged renderer SearchFlow test hit its five-second timeout under default full concurrency; it passed alone and with bounded workers. No timeout was increased.
- `xvfb-run --auto-servernum yarn test:electron` passed all 49 desktop checks. The one-command `yarn prototype:apis` launcher was also exercised with the final scratch profile and music directory.
- Full repository and desktop checks are recorded in the PR description. Existing desktop checks run against isolated synthetic fixtures; they do not establish live Beatport or Bandcamp access.

## Next steps

1. Keep the small UI changes independent of this draft.
2. Use this linked-release prototype to inform a focused Cosine change after compact track/source presentation is ready. Keep recommendations user-requested. Keep Beatport and Bandcamp on hold.
3. Revisit Beatport when issued catalogue access is available. Verify release details, exact versions, native filters and pagination before adding it as a digging source.
4. Establish a supported Bandcamp catalogue/discovery route before scheduling production work. Its account API alone is insufficient evidence.
5. Close this draft after recording the decisions. Reimplement approved slices against the current production model rather than merging the lab.

## Primary references

- [Cosine API reference](https://registry.scalar.com/@cosine/apis/cosineclub-api/#description/introduction)
- [Cosine API key page](https://cosine.club/account/api)
- [Cosine FAQ](https://cosine.club/about)
- [Beatport developer portal](https://api.beatport.com/v4/docs/)
- [Beatport partner documentation](https://partnerportal.beatport.com/hc/en-us)
- [Bandcamp API access and scopes](https://bandcamp.com/developer)
- [Bandcamp account API](https://bandcamp.com/developer/account)
