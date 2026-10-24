# Download queue and whole-release saving

Preview remains separate from saving audio. Individual Download actions and whole-release selections enter one main-process serial queue. Source checks and preview never create permanent files.

Jobs show queued, preparing, downloading, converting, tagging, complete, failed, cancelled and cancelling states. Numeric progress comes from yt-dlp's documented structured `--progress-template` output, including bytes, total/estimate, speed and ETA when supplied. Conversion and tagging show their stage without an invented percentage. Process output is bounded and the renderer never receives raw command output or media URLs.

Cancel a queued or active job from the record page or Downloads. Active cancellation aborts yt-dlp and its process group; incomplete staging files are removed. Already committed audio stays indexed. Retry reuses that job and leaves completed jobs alone. The queue admits at most 100 pending jobs and retains at most 200 recent jobs in memory. Closing the app cancels pending work and waits for cleanup before closing SQLite. Pending jobs are not restored after restart; completed files and their recovery metadata remain durable.

Download release shows coverage before starting. Each Discogs track has zero, one or several usable source candidates according to the same assignments shown in the individual source rows. Missing tracks remain explicit. Select one alternative or skip a track. Only ready selections are queued, one source per track. Existing saved release/video pairs are reused. A full-album upload stays one source unless the user explicitly maps it; this phase does not split or fingerprint recordings.

The shared player remains mounted across navigation. Completed jobs refresh the library index and the first successful track in a batch can play without changing the saved status of other results. The queue appears in both the current record and Downloads, with the same cancellation/retry operations.

Patterns: [yt-dlp structured progress](https://github.com/yt-dlp/yt-dlp#embedding-yt-dlp) and [Node AbortController](https://nodejs.org/docs/latest-v22.x/api/globals.html#class-abortcontroller). yt-dlp is Unlicense; Node is MIT. No upstream source is copied and no queue dependency is added. This extends the existing staged file publication and typed Result boundaries.

Dependencies: #15, #16, #17, #18, then this phase. All feature PRs target dev and remain unmerged pending explicit approval.
