# Cosine setup guide verification

The guide reuses the existing static HTML setup layout and Vite multi-page
build pattern. No client script or styling framework was added.

A separate desktop browser session exercised the production Pages artifact at
1280px and 390px. Both the homepage feature link and Setup link opened the guide.
The keyboard skip link focused the main content. Contents links opened the
connection, track discovery and troubleshooting sections. All three guide images
loaded, and neither viewport overflowed horizontally.

The API-access link was checked against Cosine's current public API navigation:
https://cosine.club/account/api. It opens the service's sign-in page when signed
out. Account creation and key issuance remain user actions on Cosine's website.
The app's production Settings labels, source controls and recommendation limits
were checked against the implementation. Images reuse the separate fictional
Cosine verification profile and contain no credentials.

The new build regression failed before implementation because the guide was
absent from the published artifact. It now verifies guide discovery, the built
route, local assets and internal anchors. Full verification passed 260 tests,
strict TypeScript, lint, formatting and production builds.
