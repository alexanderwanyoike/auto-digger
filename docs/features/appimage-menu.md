# AppImage application-menu integration

A packaged Linux launch uses the AppImage runtime's `APPIMAGE` path to register a user-local launcher. It points to the actual AppImage file, never its temporary mount or extraction directory. Development, non-AppImage, macOS and Windows launches do not register anything.

The launcher uses the stable application ID, a copied PNG icon and an atomically replaced desktop entry. Reopening a moved or updated AppImage refreshes that one entry. A missing, empty or relative `XDG_DATA_HOME` uses the XDG default. Expected filesystem failures return a typed Result and are reported without stopping the app.

This follows the desktop-entry integration pattern used by [AppImageLauncher](https://github.com/TheAssassin/AppImageLauncher), the [AppImage environment-variable contract](https://docs.appimage.org/packaging-guide/environment-variables.html), the [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir/latest/) and the [Desktop Entry specification's quoting rules](https://xdg.pages.freedesktop.org/xdg-specs/desktop-entry/latest/exec-variables.html). No upstream source is copied and no additional runtime dependency is needed. GNOME, KDE Plasma and other XDG desktops use these standard files; the app does not call a distribution's package manager or require a separate integration daemon.

Tests cover the registered path/icon, updates, XDG defaults, platform/development exclusions, quoting and storage failure. The packaging smoke test runs the real AppImage using its supported extract-and-run mode, checks registration in an isolated XDG directory and exercises the existing MCP helper. Interactive menu appearance on each desktop remains a manual check.
