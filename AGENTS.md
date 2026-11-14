# Roomie development instructions

## Start here
Read HANDOVER.md, DEVELOPMENT_TRANSFER.md and ROADMAP.md before changing code.
Work on roomie-development. Production main must remain unchanged until Antoinette explicitly approves deployment.
Do not merge into main, publish GitHub Pages, apply hosted database migrations, or change production configuration without that approval.
A request to improve the app authorizes development and testing, not production deployment.

## Working practices
Inspect current git status and branch first; preserve existing work.
Keep changes focused and document behavior and validation in HANDOVER.md.
Preserve existing class data, profiles, schedules and accessibility.
Never put real student data, credentials or private transfer codes into tests, logs or commits.
Use fictional fixtures. Do not test against a hosted database unless its staging identity is verified.
Do not rename localStorage keys or change stored schemas without a backward-compatible migration.
Do not rewrite the single-file app wholesale as part of routine UI work.

## Checks
Node 22+ and Python 3. Run npm ci --ignore-scripts, then npm test.
Use npm run dev for the local server; open /app/ for the classroom app.
Run git diff --check. For UI changes, inspect the affected flow in a browser at desktop and narrow widths, including keyboard use.
Record checks actually performed and distinguish mocks/local PostgreSQL from hosted integration.
Before a development push, verify its target; never force-push over another assistant's work.

## Explicit styling constraint
Antoinette requires all existing visual styling to be preserved: original colours, bright multicoloured headings, fonts, scrapbook decorations, backgrounds and button styling. Current work is navigation only. Do not enable a calmer look, change appearance preferences, redesign screens, or restyle existing components as part of navigation changes. Preserve this constraint in future handovers.
