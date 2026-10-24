# Downloaded audio

Status: accepted for the download foundation and dependent player interface.

Follow [yt-dlp's documented command interface](https://github.com/yt-dlp/yt-dlp) for source inspection and MP3 extraction. Invoke installed executables with fixed argument arrays, no shell, ignored user configuration and disabled plugins. Bound network/process time and output, and kill process groups on timeout or app quit. yt-dlp's source is Unlicense; FFmpeg builds have their own LGPL/GPL configuration. This project calls installed tools and does not redistribute their binaries.

Use the MIT-licensed [node-id3](https://github.com/Zazama/node-id3) Promise API and APIC front-cover convention for ID3 metadata. Copy the audio before tagging, and replace it only after a successful write. Discogs artwork is optional, restricted to its trusted hosts and bounded to 8 MB. Ambiguous video titles retain their original title until the user selects a Discogs track.

Use Electron's [custom protocol pattern](https://www.electronjs.org/docs/latest/api/protocol) to serve saved audio IDs to a sandboxed HTML audio element. The scheme is secure and streaming, with explicit single byte-range responses. File paths stay behind main-process lookup. The library stores individual atomic JSON sidecars so each downloaded source is independently recoverable. Failed writes preserve existing library files. No template or downloader implementation is copied from upstream.
