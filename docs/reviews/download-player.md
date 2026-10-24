# Download player reviews

Base: `666445c` (download foundation, PR #10).

## Cycle 1

Reviewed the full interface change at `0cb642a13650030fe6bb1f8c5d0aa4b19e3bcc11`.

### Standards

Found late library hydration could overwrite a newly downloaded track. Fixed by merging saved snapshots while preserving newer playback (`afafd09`), after failing regression `7119675`. Removed obsolete embed styling (`9bb8146`).

### Spec

Found rejected playback always displayed an autoplay prompt, even for unreadable audio. Fixed by reserving that prompt for NotAllowedError (`3181e19`), after failing regression `ac4a2e5`. A further regression and fix (`da58710`, `6d064e1`) prevent an old play rejection from affecting a newly selected track.

## Cycle 2

Reviewed the entire interface change at `f852dd08d55ff80a509519cd3c931cf68daf0404`.

### Standards

No actionable findings or heuristic smells. Hydration, playback lifecycle, Results and obsolete code removal are handled deliberately.

### Spec

No actionable findings. Every source is individually downloadable, assignments can be corrected before or after downloading, and the bottom player controls saved audio. Unavailable sources, tagging notices, file reveal and restart recovery are exposed. The compact native screenshot remains readable.

## Verification

`yarn verify` passes formatting, strict lint/types, 81 tests and the production build. All seven native Electron tests pass. Native tests exercise real MP3 decoding and transport, pause/resume controls, seeking, volume, multiple sources, unavailable-source messages, tag correction and restart recovery through isolated preload IPC. Light/dark screenshots at 900 pixels wide were visually inspected.

A separate live check with verified user-local yt-dlp 2026.10.21 inspected a public YouTube video and extracted a 19-second MP3 using the production arguments. FFprobe confirmed one MP3 audio stream. A removed test video returned the expected availability failure. Live verification used temporary files, no user credentials and no changes to the user's saved crate or audio library.
