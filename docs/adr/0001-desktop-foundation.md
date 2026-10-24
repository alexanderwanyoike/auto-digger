# Desktop foundation

Status: accepted for Phase 1.

Use Electron's main/renderer separation, React in the renderer and electron-vite for development and builds. A sandboxed renderer needs no preload or IPC bridge until a real privileged operation is implemented. Keep the operating system's native window frame and menu conventions.

This follows the MIT-licensed [electron-vite-react layout](https://github.com/electron-vite/electron-vite-react) and [Electron's isolated renderer guidance](https://www.electronjs.org/docs/latest/tutorial/security). These inform the structure; no template application code is copied. Dependencies retain their upstream licences.

Use CSS custom properties for the aluminium surface and semantic colour tokens. Theme selection uses the browser's standard prefers-color-scheme media query and a small React hook. Expected storage and startup failures use an explicit discriminated Result union. Do not add a generic service layer or IPC API before it is needed.

Use [Airbnb's MIT-licensed JavaScript and React configuration](https://github.com/airbnb/javascript) as the lint baseline, with TypeScript-aware replacements, strict type checking, React's JSX transform and Prettier compatibility. ESLint 8 is retained because Airbnb's published configuration declares support for it. Upgrade when that peer dependency supports a maintained ESLint major.

Tests exercise the React interface through Testing Library and the actual built desktop window through Playwright's Electron support. Each behavioural change starts with a failing test committed separately from its implementation.
