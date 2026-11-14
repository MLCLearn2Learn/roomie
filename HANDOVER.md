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

## Feature-local settings reorganisation
Antoinette approved removing the combined Fun & rotations Setup tab. Setup's look tab is now labelled Look, sound & Roomie, retaining original appearance controls and adding the existing mascot and celebration-level controls there. The existing Sound & voice switch covers celebration sounds, avoiding a duplicate. Labels and locations changed; saved keys/values and all CSS are preserved.
Brain breaks has a Brain break settings disclosure containing the existing Keep everyone in the game choice; changes save through the existing keepEveryoneInGame key and refresh the picker. Students → Rotations now opens a review screen, with Start rotations and Edit stations & timing. Editing uses the existing stations and rotMin keys; no new schema or defaults. Starting still uses the original rotation engine. Old Fun & rotations navigation hints were updated.
176 automated tests passed, including feature-local persistence, rotation duration limits, appearance preservation and the existing brain-break behavior tests. Chrome checks verified new Setup locations and preserved picture/mascot choices, rotation editor and start/stop, and Brain break settings access. No production or hosted database change. Preview opened on the Rotations editor for user review.

## Back, Home, Stop and shared timed activities
Antoinette approved separating navigation from ending activities. Tool navigation now keeps a bounded in-memory return history. Back returns to the previous tool or board without stopping the shared timer; Home displays the board without clearing timed activity state. Explicit Stop ends the activity and clears stale return paths. Existing CSS and saved preferences are unchanged. The top bar reuses the existing schedule-controls/button styles for a running/paused activity status, Return to activity and Stop activity.

Starting a new countdown, routine/practice, brain break, breathing exercise, rotations, manual ticket, reflection, thinking activity, pack-up or timed expectation practice checks the active shared activity before mutation. A native confirmation allows replacement or cancellation. Internal rotation/reflection/thinking step transitions do not prompt. Reopening the owning tool returns to its current activity rather than resetting it. Browsing reflection/thinking catalogues retains their running activity. Class changes/demo starts require the current activity to be stopped first. Explicit switch-to-timetable still ends the activity as its label promises. Keyboard Escape closes the nearest popup, defers to existing modal handling, or returns a tool screen without acting as Stop. Previous step labels distinguish step navigation from screen Back.

185 automated tests passed. New cases exercise actual production functions for timer → name picker → Back, Home preserving routine step/music/timer, paused countdowns, rejected/accepted replacement, callback preservation, explicit Stop and unrelated screen Stop, plus popup/typing Escape handling. Chrome checks confirmed timer survival through Pick a name/Back/Home, Return to timer, paused preservation, native replacement Cancel and Accept, Stop, and Escape from More tools and a tool screen. The complete pre-change CSS block compared byte-for-byte equal after this work; diff whitespace check passed. Source upload hash matched tested local app. No production or database changes. Preview left on the board with a paused five-minute test timer for review.

This remains a single shared timed activity, with explicit replacement rather than parallel independent countdowns. Navigation history is session-only, not persisted across page reloads. No hosted transfer staging work was performed.

## Brain-break navigation refinement
Antoinette approved clearer brain-break controls. Active breaks now use Previous prompt / Next prompt (Start again at the end); Previous is disabled at prompt 1 and cannot wrap backwards. A single Finish break action on the activity ends it and returns to the chooser. The redundant active-screen Stop and status-row Stop are consolidated; when browsing, the background status offers Return to brain break and Finish break.

Choose another break and Move/Games/Calm open the picker without replacing the current break. Start still uses the existing replacement confirmation; Cancel preserves the prior break. Pace and voice controls moved into the existing Brain break settings disclosure alongside participation. Existing keys and values remain unchanged; editing these defaults cannot clear an unrelated timed activity. Automatic freeze playback remains attached to its activity while browsing. Auto-finish callbacks check the same break identity and cannot close a replacement or an unrelated screen.

Keyboard shortcuts ignore buttons, editable controls, links, disclosure summaries, menus and dialogs, so Space activates the focused Finish button normally. Scheduled routine keyboard shortcuts no longer receive arrow keys while a brain break is open. All pre-existing CSS compared equal to the pre-change block; no appearance, mascot, picture or default changes.
192 automated tests passed, including prompt bounds/restart, keyboard controls, browsing vs Finish, setting changes with unrelated/background activities, and freeze ownership. Chrome checks verified moved settings, disabled first Previous, a single Finish control, preserved prompt/timer through Calm browsing, keyboard Space on Finish returning to the chooser, Choose another, and cancelling a replacement retaining Roomie Says. Uploaded app blob hash matched local tested source. Preview left on the chooser with Brain break settings expanded. No production or hosted database changes.

## Final main-navigation pass before design
Timetable lesson details now distinguish Preview on board, Edit lesson and an explicit Close. Preview uses the navigation stack without clearing background activity callbacks. Edit resolves the active regular/one-off day, expands the selected block before rendering and focuses its name field. A missing block leaves saved data untouched and reports it. Timetable markup is no longer replaced on every clock tick; updates retain focus on the same segment. Lesson popups have a name, expanded state, initial focus and opener focus restoration, and are clamped to viewport bounds without CSS changes.

Students' quick-switch panel now displays the activity guard and disables the switch when a running/paused activity must be stopped. It no longer promises End activity and switch while that operation is blocked. No class was switched during browser checks.
196 automated tests passed. New production-function tests cover regular vs one-off edit targeting, selected editor expansion/focus, stable timetable focus, and accurate blocked-switch labels. Chrome verified direct English edit expansion/name focus, Preview/Back preserving a paused five-minute timer, disabled class-switch explanation, thinking step 2 retained through All routines/Back, reflection retained through All reflections/Back, and a lesson popup bounded within 390×740 with Escape returning focus and Tab reaching the next lesson. Existing routine/rotation/ticket tests continue to pass; these are not a complete manual walkthrough of every activity. Actual connected phone remote and real-device checks remain release work. All existing CSS matched the pre-pass block; no saved appearance settings changed. Uploaded app hash matches tested local source. Preview left on lesson details for review. Production/database unchanged.
