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

app.listen(PORT, () => {
  console.log(`Project Tracker running: http://127.0.0.1:${PORT}`);
  console.log(`PROJECTS_ROOT = ${PROJECTS_ROOT}`);
});
