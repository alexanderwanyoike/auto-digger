# Phase 5: YouTube playback

Depends on Phase 4. Play the YouTube videos attached to a Discogs release through the visible official IFrame Player API. Validate video IDs and known YouTube URL forms, list attached videos, and allow selecting another video. Keep official playback, seek, volume and fullscreen controls visible. Do not autoplay on record selection. No downloading, audio extraction or hidden audio playback.

Show loading, ready, playing, paused, ended, missing-video and failure states. Errors offer a retry and another-video selection. Pause when the player leaves the viewport or the app is hidden; destroy it when replacing or closing the release. Retain the existing compact desktop layout with an internally scrolling record area. No API key is required for embedding.

Bound script and player initialization time. Keep Node isolation, narrow IPC and trusted navigation guards. Allow only the YouTube resources needed by the official embed in the parent CSP. Desktop embed requests carry the stable application identity as Referer because bundled file pages do not supply one. Installer packaging must register that same identity before distribution.

Patterns: official IFrame API asynchronous loading and events (https://developers.google.com/youtube/iframe_api_reference), with create/destroy component lifecycle informed by MIT-licensed react-youtube (https://github.com/tjallingt/react-youtube). No upstream source is copied. Follow the visible-player and client-identity requirements at https://developers.google.com/youtube/terms/required-minimum-functionality. Player dimensions stay at least 200x200, with 270px height.
