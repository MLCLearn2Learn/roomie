# Roomie — shared developer handover

Updated 14 November 2026.

## Goal and authority
Antoinette wants a polished, reliable classroom app and the ability to switch between ChatGPT and Claude.
Continue development autonomously on roomie-development. Production deployment still requires explicit approval.

## Repository and branch
Repository: https://github.com/MLCLearn2Learn/roomie
Development: roomie-development
Production: main
Production was verified at f37f3577655504f696b94e2a0e97fdb7f16b1dd5 on 14 November.
Secure transfer implementation commit: 2109705fe505c2f93006be2f0a6437153fde6437.
Documentation follow-up: 42565a51eff729fc39e901df3837bd7c65595949.
Always inspect current remote heads rather than treating these as permanent.

## Setup
Clone the repository, check out roomie-development and read AGENTS.md.
Use Node 22+ and Python 3.
Run npm ci --ignore-scripts, npm test, then npm run dev.
Preview at http://127.0.0.1:4173/app/.
Landing page is /; classroom app is /app/.
Do not substitute the landing page for the app during QA.

## Code map
- app/index.html: main application, inline UI/styles/state/scheduler/classroom tools.
- app/transfer-v2.js: browser Web Crypto transfer helpers.
- supabase/transfer_v2.sql: additive transfer migration; not applied to hosted production by this work.
- tests/: application regression tests, isolated PGlite migration tests, browser harness.
- scripts/preview.py: local static server.
- DEVELOPMENT_TRANSFER.md: detailed transfer behavior, verification and release limitations.
- README.md: brief original project description.

## Data and compatibility
Classroom settings include localStorage bellbird.v2 and older bellbird.v1 migration.
Media also uses IndexedDB. Inspect persistence helpers before editing.
Preserve all profiles and their data. Never use real student data in test fixtures.
The development app may reference live services: opening it does not establish a separate staging backend.

## Completed transfer work
AES-256-GCM encrypted packages, HKDF-separated lookup/encryption keys, 43-character private codes.
Link secrets stay in fragments and are scrubbed on receipt; importing requires confirmation.
Validate and persist all profiles before acknowledging remote deletion.
Failed saves preserve previous state and leave the package retryable.
Legacy short transfer codes are rejected.
See DEVELOPMENT_TRANSFER.md for exact guarantees and limitations.

## Verification
168 automated tests passed again on 14 November before the implementation push.
Uploaded implementation tree matched the tested local source exactly.
Earlier recorded Chrome checks: four Web Crypto checks and eight isolated browser integration checks passed.
Hosted Supabase/PostgREST staging and two-device testing remain unverified.
No production migration, merge or deployment was performed.

## Open release work
Verify a separate staging Supabase project and exercise actual RPCs with fictional data.
Assess anonymous endpoint abuse controls and scheduled expiry cleanup before public release.
Reads followed by save/acknowledgement do not provide an atomic single-reader claim.
Physical expiry cleanup occurs on a subsequent successful upload, not through an installed scheduled purge.
Do not describe the feature as fully hosted-verified or strictly single-reader.

## Next improvement pass
Follow ROADMAP.md. Start with a browser walkthrough of teacher setup and a normal lesson.
Observe actual friction before selecting a focused UI change; preserve established branding and existing tools.
Implement and test on development, then update this handover with exact commits, checks and remaining work.

## Switching assistants
Give the next assistant repository access separately.
Ask it to open roomie-development and read CLAUDE.md, AGENTS.md, HANDOVER.md and ROADMAP.md.
These tracked files provide continuity; prior chat messages are not required.
If another assistant has pushed changes, inspect them before continuing and never overwrite them blindly.

## Navigation improvement — 14 November 2026
More tools now opens a searchable, non-modal finder covering 19 existing tools in three groups. Class tools and calm breathing are available alongside dock tools. Search matches teacher phrases, focuses on opening and supports arrows/Enter/Escape. Selecting a result moves focus to the destination heading. Existing custom dock settings and saved class schema are unchanged.

Changed app/index.html; added tests/navigation.test.cjs and tests/navigation-preview.html (manual responsive QA frame).
173 automated tests passed. Chrome checks verified search-to-tool, no results, Escape preserving a running timer, focus on destination, and panel bounds at 390px and 768px plus desktop inspection. No hosted migration or production deployment.
Next: review teacher feedback on the finder, then walk through Setup navigation before choosing another change. The remaining secure-transfer staging/operational limitations above still apply.

## Navigation refinement — Students menu ownership
Antoinette confirmed that class-management tools should live under Students rather than also appearing in More tools. Removed Seating plan, Pick a name, Groups, Rotations, Helpers and Mystery Hero from the finder. More tools now has 13 teaching/routine/wellbeing tools in two groups. Updated search hints and dock-help wording. Existing dock shortcuts remain as configured; Students still contains all six class tools and Class list.
173 automated tests pass, including checks that these tools are absent from the finder and remain in Students. No production deployment or database changes. This supersedes the earlier 19-tool/three-group catalogue description.

## Tool grouping refinement
Antoinette approved three separate finder groups: Teaching (Timer, Tickets, Thinking, Reflect, Quiz games, Poll, Finished?), Routines (Routines, Pack up, Practise expectations), Wellbeing (Brain break, Calm breathing, Check-in). Same 13 tools; Students remains separate. All 173 automated tests pass. No production changes.

## Styling constraint — explicit user direction
Antoinette requires all original styling to remain unchanged; current scope is navigation fixes only. Preserve colours, bright multicoloured headings, fonts, scrapbook decorations, backgrounds and button styling. Browser inspection confirmed the original bright heading palette and fonts are currently rendered. No appearance setting was changed during this check. Do not introduce visual redesigns or change appearance preferences while continuing navigation work.

## Setup entry and return labels
Setup button now explicitly opens Day plan, irrespective of the last Setup section visited. Look still opens Look & colours. The Setup close button reads Back to my board and preserves existing behavior of returning to the current activity. Only the entry handler and button text changed; no CSS, appearance preferences, picture or mascot settings changed. All 173 automated tests passed. Browser checks verified Look opens appearance, Setup after Look opens Day plan, and returning from Setup preserves the Timer screen. Production unchanged.

## Appearance shortcut consolidation
Antoinette approved removing the separate Look button from the top bar. Look & colours remains an unchanged Setup tab. Removed the unused button handler and updated tour guidance to point at Setup. No CSS, colours, fonts, pictures, mascot or appearance settings changed. All 173 automated tests passed. This supersedes earlier guidance about a standalone Look button.
