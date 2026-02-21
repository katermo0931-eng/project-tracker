# Project Tracker — Backlog

## Current
Phase 4 complete — dashboard, GitHub integration, commit links

---

# PHASE 1 — Core Engine
- [x] Express server with static file serving
- [x] Project directory scanning (top-level dirs under PROJECTS_ROOT)
- [x] BACKLOG.md parser — task checkboxes → auto-computed progress metrics
- [x] README.md parser — extract title and description
- [x] Git log integration — recent commits via execFile (no shell dependency)
- [x] Consistent metrics: no hardcoded numbers, live from file

---

# PHASE 2 — UI & Design
- [x] Filterable project list (search + status filter)
- [x] Expandable epic/phase breakdown per project
- [x] Progress bar with gradient fill
- [x] Dark theme — slate-900/800/700 + blue-400 palette
- [x] Consistent 13px typography system
- [x] Recent commits panel in expanded row
- [x] Standalone repo — tracked as its own product
- [x] Auto-refresh (polling every N seconds)

---

# PHASE 3 — Product Polish
- [x] Deploy as standalone web service — Dockerfile, render.yaml, npm start
- [x] GitHub integration (open PR / issue counts) — auto-detect git remote, /api/github-stats, live badges in title cell
- [x] Configure PROJECTS_ROOT via UI
- [x] Export project summary to markdown

---

# PHASE 4 — Dashboard & Integrations
- [x] Project health dashboard — summary bar: total projects, tasks done/total, overall % progress bar, by-status breakdown, latest activity strip
- [x] Clickable commit hashes — link to GitHub commit URL when remote is detected
- [x] ghCache cleared on full reload — no stale GitHub stats after manual refresh
- [x] Export MD includes GitHub repo URL per project
