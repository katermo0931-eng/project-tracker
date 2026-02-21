/**
 * build-static.js
 * Generates output/index.html — a self-contained static snapshot of the tracker
 * that can be deployed to Vercel/GitHub Pages with no server.
 *
 * Usage:
 *   node scripts/build-static.js
 *   PROJECTS_ROOT=/path/to/repos node scripts/build-static.js
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { scanProjects } from "../scan.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PROJECTS_ROOT =
  process.env.PROJECTS_ROOT || path.resolve(ROOT, "..");

const OUTPUT_DIR = path.join(ROOT, "output");

// ── Scan ─────────────────────────────────────────────

console.log(`Scanning ${PROJECTS_ROOT} …`);
const projects = await scanProjects(PROJECTS_ROOT);
const scanned_at = new Date().toISOString();
console.log(`  Found ${projects.length} project(s)`);

// ── Read assets ───────────────────────────────────────

const css   = await fs.readFile(path.join(ROOT, "public", "style.css"),  "utf-8");
const appJs = await fs.readFile(path.join(ROOT, "public", "app.js"),     "utf-8");

// ── Build HTML ────────────────────────────────────────

// Safely embed JSON — escape </script> so the HTML parser doesn't break
const staticDataJson = JSON.stringify({ root: PROJECTS_ROOT, scanned_at, projects })
  .replace(/<\/script>/gi, "<\\/script>");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Project Tracker — Snapshot</title>
  <style>
${css}
  </style>
  <style>
    /* static mode: hide server-dependent controls */
    .root-bar, #refresh, #countdown { display: none !important; }
  </style>
</head>
<body>
  <header class="top">
    <div>
      <h1>Project Tracker</h1>
      <div class="meta" id="meta"></div>
    </div>

    <div class="controls">
      <input id="q" placeholder="Search by name / description…" />
      <select id="status">
        <option value="all">All</option>
        <option value="blocked">Blocked</option>
        <option value="needs work">Needs work</option>
        <option value="ready">Ready</option>
      </select>
      <button id="refresh">Refresh</button>
      <button id="export">Export MD</button>
      <span id="countdown" class="countdown"></span>
    </div>
    <div class="root-bar">
      <label for="root-input">Root</label>
      <input id="root-input" class="root-input" />
      <button id="root-apply">Apply</button>
    </div>
  </header>

  <div id="dashboard" class="dashboard"></div>

  <main>
    <table>
      <thead>
        <tr>
          <th>Project</th>
          <th>Status</th>
          <th>Done</th>
          <th>Left</th>
          <th>Progress</th>
          <th>Current Task</th>
          <th>Description / Missing</th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
  </main>

  <script>
    /* ── Static data shim ──────────────────────────────────
       Intercepts /api/* fetch calls and returns the snapshot
       baked in at build time. app.js is loaded unchanged.
    ─────────────────────────────────────────────────────── */
    window.STATIC_DATA = ${staticDataJson};
    (function () {
      var _fetch = window.fetch;
      window.fetch = function (url) {
        var s = typeof url === "string" ? url : String(url);
        if (s.indexOf("/api/projects") !== -1) {
          return Promise.resolve({
            json: function () { return Promise.resolve(window.STATIC_DATA); }
          });
        }
        if (s.indexOf("/api/github-stats") !== -1) {
          return Promise.resolve({
            json: function () { return Promise.resolve({ error: "static mode" }); }
          });
        }
        return _fetch.apply(this, arguments);
      };
    })();
  </script>

  <script>
${appJs}
  </script>
</body>
</html>
`;

// ── Write output ─────────────────────────────────────

await fs.mkdir(OUTPUT_DIR, { recursive: true });
await fs.writeFile(path.join(OUTPUT_DIR, "index.html"), html, "utf-8");

const stat = await fs.stat(path.join(OUTPUT_DIR, "index.html"));
const kb = (stat.size / 1024).toFixed(1);

console.log(`✓ output/index.html written (${kb} KB, ${projects.length} projects, ${scanned_at})`);
