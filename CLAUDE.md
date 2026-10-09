# timesheet-student — "Mẹ và lịch học"

PWA for parents to manage their children's class timetable and daily notes. UI and user-facing text are Vietnamese. See README.md for setup and architecture.

- Business rules live in the database (`supabase/migrations/`): RLS, invite codes, recurring series materialised into `sessions`, no-overlap exclusion constraint per child. Change rules there, not only in the UI.
- Supabase project ref: `tjjmgafobutofzkylnjy`. Env in `.env.local` (gitignored).
- Checks: `pnpm exec tsc -b`, `pnpm lint`, `pnpm build`.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
