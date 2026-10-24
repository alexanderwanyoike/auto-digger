# Remember the active crate

Crate data persisted correctly in SQLite, but the renderer forgot which crate was selected. Every app restart requested the first crate, commonly an empty My crate, making another populated crate appear missing. The native regression reproduced that exact state: saved releases remained readable through IPC while the UI selected default after restart.

Remember the active crate ID as a device UI preference, following the app's existing appearance preference pattern. Crate memberships, metadata, picks and tags stay in the existing SQLite catalogue. Only a successful current view updates this preference; stale asynchronous responses cannot overwrite it. Storage failures return explicit Results and show a notice while retaining the successfully loaded crate view.

On startup, restore the remembered crate. An explicitly selected empty crate remains selected. Older profiles without a saved choice, or profiles whose remembered crate was removed, choose a populated crate when one exists and otherwise use the normal default view. Missing-crate errors are handled without treating storage errors as empty data. No database reset, import, schema migration or record modification is part of this fix.

Two native tests close and reopen the actual Electron app with isolated profiles. They verify the named crate and release return, an explicit empty selection is honoured, older profiles reveal saved records, and a removed remembered crate recovers without an error. Preference tests cover persistence, clearing, unrelated settings and blocked storage. Test and implementation phases are separate commits.

The reported live catalogue was inspected read-only and backed up with SQLite's online backup API before changes. It was healthy and contained the named populated crate. No recovery writes or record changes were needed in that catalogue.

Depends on #27 and its prerequisites, including the review corrections to #26 and #27. Created from dev with those feature changes integrated locally. Targets dev and remains unmerged.
