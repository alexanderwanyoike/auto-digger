# Downloaded audio

The requested experience replaces embedded YouTube playback with downloaded MP3s controlled by the bottom player. Every video associated with a Discogs release remains individually downloadable. Match each video to a track by complete title where unambiguous, allow a manual choice, and retain the video title when no reliable match exists. Several videos may map to the same track.

## Download foundation

The first PR adds the privileged desktop boundary used by the subsequent player interface:

- Check supported YouTube sources through yt-dlp, canonicalising URLs and restricting them to one video.
- Extract MP3 using installed yt-dlp, FFmpeg and FFprobe. Bound processes and terminate them on app quit. Expected failures are typed Results with readable messages, never raw stderr.
- Store each release/video pair once in Music/Auto Digger, using readable names ending in `.yt.mp3`. Keep versioned, validated track metadata alongside the audio and reopen it after restart.
- Use Discogs album, artist, year, genre/style and matched track information for ID3. Embed trusted Discogs JPEG/PNG cover art when available. Tag on a temporary copy so failures retain playable audio, with a notice.
- Accept a manual track index, or explicitly retain the video title. Automatic matching leaves ambiguous titles unassigned. Existing assignments can be corrected offline without downloading again.
- Expose only list, probe, download and reveal operations over validated preload IPC. Stream known library IDs through a restricted media protocol supporting byte ranges and seeking. Never accept renderer-supplied file paths or shell commands.

## Player interface

The dependent player interface PR removes the YouTube embed and presents every source with availability, track assignment, download and play actions. The bottom bar controls the selected local track with play/pause, seeking and volume. Downloads remain accessible after restart, with a file explorer shortcut. Errors and partial tagging notices are visible beside the relevant action.
