import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { scanProjects } from "./scan.js";

const app = express();
const PORT = process.env.PORT || 4319;

// Root directory for projects (default: one level up — sibling repos)
const PROJECTS_ROOT =
  process.env.PROJECTS_ROOT ||
  path.resolve(process.cwd(), "..");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/projects", async (req, res) => {
  try {
    const root = req.query.root
      ? path.resolve(req.query.root)
      : PROJECTS_ROOT;
    const projects = await scanProjects(root);
    res.json({
      root,
      scanned_at: new Date().toISOString(),
      projects
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/api/github-stats", async (req, res) => {
  const { owner, repo } = req.query;
  if (!owner || !repo) {
    return res.status(400).json({ error: "owner and repo are required" });
  }
  const token = process.env.GITHUB_TOKEN;
  const headers = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "project-tracker/1.0",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };

  try {
    const [repoRes, pullsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=100`, { headers })
    ]);

    if (!repoRes.ok) {
      return res.status(repoRes.status).json({ error: `GitHub API: ${repoRes.status}` });
    }

    const repoData = await repoRes.json();
    const pullsData = pullsRes.ok ? await pullsRes.json() : [];
    const prCount = Array.isArray(pullsData) ? pullsData.length : 0;
    // open_issues_count from GitHub includes PRs — subtract to get pure issues
    const issueCount = Math.max(0, (repoData.open_issues_count ?? 0) - prCount);

    res.json({
      owner,
      repo,
      open_prs: prCount,
      open_issues: issueCount,
      stars: repoData.stargazers_count ?? 0,
      html_url: repoData.html_url
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`Project Tracker running: http://127.0.0.1:${PORT}`);
  console.log(`PROJECTS_ROOT = ${PROJECTS_ROOT}`);
});
