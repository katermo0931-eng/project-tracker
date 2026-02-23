# Meridian

Cross-project dev dashboard — live progress from BACKLOG.md checkboxes, GitHub PR/issue badges, git history per project, health summary, and export to MD. No manual updates.

**Live:** https://katermo0931-eng.github.io/meridian/

## What it does

- Scans a directory of projects and reads each project's `BACKLOG.md` and `README.md`
- Auto-computes progress from `[x]` / `[ ]` task checkboxes — no hardcoded numbers
- Pulls live git commit history per project without manual updates
- Displays phase-by-phase task breakdown with expandable epics
- Shows GitHub PR/issue counts as live badges per project
- Health summary dashboard — overall progress %, by-status breakdown, latest activity
- Filters by project status and free-text search
- Exports project summary to markdown

## Stack

Node.js · Express · Vanilla JS · CSS (dark theme)

## Setup

```bash
npm install
node server.js
```

Open [http://localhost:4319](http://localhost:4319)

By default scans the parent directory (`../`) for sibling project repos.
Override with `PROJECTS_ROOT=/path/to/projects node server.js`.

## Project conventions

Each tracked project should have:
- `README.md` — title (first `#` heading) and description (first paragraph)
- `.claude/BACKLOG.md` — phases with `- [x]` / `- [ ]` task items
