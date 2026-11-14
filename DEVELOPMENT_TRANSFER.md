# Secure transfer upgrade — development review

Completed on `roomie-development`, 14 November 2026. Production remains at main commit `f37f3577655504f696b94e2a0e97fdb7f16b1dd5` at the time of verification. No deployment or hosted database migration was performed.

## Behavior

- The classroom app and welcome screen now use the same secure v2 transfer flow.
- A cryptographically random 256-bit secret produces a 43-character case-sensitive code. HKDF derives separate lookup and AES-256-GCM encryption keys. Only the 128-bit derived lookup and encrypted package reach the transfer service.
- Private links put the secret in the URL fragment; receiving removes the fragment immediately and requires explicit confirmation before import. No automatic network import occurs.
- Complete class/profile backups are validated before replacement. Storage failures restore previous in-memory classes and leave the remote package retryable. Demo/student modes, unreadable saved data and active sessions block imports.
- The service reads without consuming the package. A successful local save is followed by deletion acknowledgement. Acknowledgement failure reports local success and unconfirmed deletion honestly.
- Raw encrypted JSON avoids cross-browser compression dependencies. Canonical base64url decoding rejects alternate encodings. Oversized transfers fail before upload.
- Legacy short codes are rejected explicitly. Both devices must use the upgraded app. Legacy database tables and functions remain unchanged.

## Validation

Run `npm ci --ignore-scripts` then `npm test` using Node 22+.

- 168 automated tests passed, zero failures: existing scheduler, profiles, media, student response, speech, setup/storage, accessibility checks plus transfer security and persistence tests.
- The actual SQL migration ran twice against an isolated PGlite PostgreSQL database. Tests exercise anonymous RPC privileges, denied direct table access, denied authenticated RPC access, malformed inputs, duplicate IDs, expiry, repeated reads, acknowledgement, cleanup and unchanged legacy data/functions.
- Chrome Web Crypto page `/app/transfer-v2-test.html`: all four checks passed.
- Chrome `/tests/transfer-browser.html`: eight integration checks passed. It executes the real application transfer functions with fictional data, actual browser localStorage and an in-memory RPC service. Tests cover both profiles, ciphertext-only storage, successful deletion, consumed-code rejection, failed persistence and retry recovery. The test restores the pre-test browser data.
- Classroom app loaded in Chrome and welcome form rejected an old short code.
- All inline application JavaScript parsed; `git diff --check` passed.

The browser integration harness adds a test-only closure bridge to its iframe copy of the app. The shipping app exposes no such bridge. No tests submitted classroom data to the hosted Supabase service.

## Deployment remains pending approval

1. Review this branch and back up the production database/configuration.
2. Validate the SQL against a separately confirmed staging Supabase project and verify both devices through its actual REST RPC endpoint. This session tested PostgreSQL locally and browser RPC behavior in isolation; it did not validate hosted PostgREST configuration, network policy or a staging endpoint.
3. After approval, apply `supabase/transfer_v2.sql` to the intended database before releasing the new client. It adds separate v2 objects, replaces prototype consuming reads with peek/finish and removes only the prototype `take_transfer_v2(text)` function.
4. Publish `app/index.html` and `app/transfer-v2.js` together, then verify a fictional transfer on two devices.

The 30-minute limit makes packages unreadable through RPC after expiry. Physical expiry cleanup occurs on the next successful put; no scheduled purge is installed. The anonymous capability RPCs have no per-user quota/rate limiter in this migration; service-level abuse controls and regular cleanup should be assessed before public release. Concurrent holders of the same secret may both retrieve before acknowledgement, so this is deletion-after-save rather than an atomic single-reader claim. Treat the secret as a private bearer capability.

Rollback: restore the previous client commit. Leave the additive v2 database objects in place pending separate review; do not delete legacy objects or existing class data.

## Save status

The completed branch is committed locally. Pushing to GitHub failed because this session has no GitHub write credentials (`could not read Username`). Remote `roomie-development` therefore remains at `a1e4c909cfde745f21cd7053344fc433b69fb40f` until access is connected. A verified Git bundle contains the development commit and requires that existing base commit. In an existing clone, import with `git fetch /path/to/roomie-development.bundle roomie-development`, review `FETCH_HEAD`, then update/push only the development branch. Do not merge or deploy production without approval.
