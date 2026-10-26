# Release audio sources

YouTube and Soulseek share one Audio sources section in the release view. Equal provider buttons select which source to use. Provider choice uses the application's existing React state/composition pattern and native buttons with a visible pressed state and keyboard focus.

YouTube keeps its verified uploads, Discogs assignments and release download action. Its component stays mounted when switching providers so manual assignments are preserved. Soulseek offers a Discogs track selector above the existing editable search and compact results table. A release without attached YouTube videos can still use Soulseek.

Both providers feed the existing download queue and saved library. A successful Soulseek download leaves the current source controls visible with its saved state. Finishing an earlier track's download cannot close another track's search. Changing tracks or leaving Soulseek disposes the old search through the existing search hook.

The tracklist remains record metadata, rather than a second download entry point. Setup instructions and fixture screenshots follow the shared Audio sources location. Regression checks cover provider selection, query refinement, private-result separation, pending download completion after selecting another track, saving and restart persistence.
