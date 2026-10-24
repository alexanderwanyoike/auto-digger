# Remembered Discogs account

Status: accepted for the remembered-account correction, superseding Phase 2's session-only storage decision.

Use Electron 45's asynchronous safeStorage API to encrypt/decrypt the verified token in the main process. Store only ciphertext in the fixed `discogs-token.bin` file under userData, with owner-only permissions and atomic replacement. Refuse unavailable encryption and the Linux basic_text provider rather than silently weakening storage. A real provider check on the development desktop reported `gnome_libsecret` available.

Compose persistence around the existing memory session. Serialize connection, restoration, forgetting and API operations so a late credential write cannot overtake forgetting. Account hydration verifies the stored token through identity. Preserve ciphertext on temporary failures; forget rejected credentials. Disconnect clears memory and deletes the credential, while explicit Forget saved token remains usable when decryption is unavailable.

The renderer receives only account metadata and typed failures. It can request retry/forget actions but cannot retrieve stored credentials or choose storage paths. Submitted token fields still clear immediately. Native tests use a synthetic encryption/HTTP entry fixture so they do not touch a real desktop keyring.

This follows Electron's documented safeStorage pattern and the existing crate's atomic-file pattern. File/keyring failures are explicit Results; no secret content is included in errors.
