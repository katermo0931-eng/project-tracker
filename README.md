# Meridian

**Live:** https://katermo0931-eng.github.io/meridian/

A lightweight local web dashboard for tracking personal development projects — your fixed reference point across all active work. Replaces spreadsheets and sticky notes with a single live view of progress, phases, and git activity.

## What it does

- Scans a directory of projects and reads each project's `BACKLOG.md` and `README.md`
- Auto-computes progress from `[x]` / `[ ]` task checkboxes — no hardcoded numbers
- Pulls live git commit history per project without manual updates
- Displays phase-by-phase task breakdown with expandable epics
- Filters by project status (ready / blocked / needs work) and free-text search

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
