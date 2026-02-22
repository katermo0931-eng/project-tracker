# Project Tracker — Claude Instructions

## What this is
A standalone local web dashboard (Node/Express, vanilla JS) that scans sibling project repos
and displays progress, git history, and phase breakdowns. Runs at http://localhost:4319.

## Architecture
- `server.js` — Express server, routes, static serving
- `scan.js` — scans PROJECTS_ROOT, reads BACKLOG.md + README.md per project
- `parseBacklog.js` — parses `- [x]` / `- [ ]` checkboxes into progress metrics
- `parseReadme.js` — extracts title and description from README.md
- `public/` — frontend (index.html, CSS, JS) — all vanilla, no build step

## Key conventions
- PROJECTS_ROOT defaults to `../` (parent of cwd) — sees sibling repos
- Never use `exec()` — always `execFile()` (cmd.exe ENOENT on this machine)
- Never use pipes `|` in shell format strings — use `\x1f` as field delimiter
- Git log loaded per project via `execFile('git', ...)` directly
- Metrics are always auto-computed from checkboxes — no hardcoded numbers

## Restart requirements
- CSS/JS/HTML changes (`public/`): browser refresh only
- Any server-side change (`server.js`, `scan.js`, `parseBacklog.js`, `parseReadme.js`): `npx kill-port 4319 && node /c/Users/Hola/project-tracker/server.js &`

## Design system
Matches Interactive CV palette: slate-900/800/700 background, blue-400 accent, 13px base font.

## Deploy rule
After completing any implementation task: verify it works locally first, then commit the relevant files and push to main. Never push untested changes. When changes also affect Interactive CV, push that repo too — pushing Interactive CV to main triggers immediate Vercel live deploy.

## Backlog hygiene
- When a new task is agreed: add `- [ ] description` to `.claude/BACKLOG.md` under the right phase before starting work
- When a task is completed: change `[ ]` → `[x]` in BACKLOG.md immediately after the implementation is done
- Update `## Current` at the top to reflect the active phase
- Mirror the change in `C:\Users\Hola\Interactive-CV\.claude\BACKLOG.md` if it applies there too

## What NOT to do
- Don't add a build system or bundler — keep it vanilla
- Don't hardcode progress numbers anywhere
- Don't add a database — file-based scanning is intentional
