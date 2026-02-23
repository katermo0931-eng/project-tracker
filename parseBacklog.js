
function extractComplexity(text) {
  const estMatch    = text.match(/\[est:([^\]]+)\]/i);
  const actualMatch = text.match(/\[actual:([^\]]+)\]/i);
  return {
    text:     text.replace(/\[(est|actual):[^\]]+\]/gi, "").trim(),
    estimate: estMatch    ? estMatch[1].trim()    : null,
    actual:   actualMatch ? actualMatch[1].trim() : null
  };
}

export function parseEpics(md) {
  const lines = md.replace(/^\uFEFF/, "").split(/\r?\n/);
  const epics = [];
  let current = null;
  let seenFirstH1 = false;

  for (const line of lines) {
    if (/^#(?!#)\s+/.test(line)) {
      if (!seenFirstH1) { seenFirstH1 = true; continue; }
      current = { title: line.replace(/^#+\s*/, "").trim(), tasks: [] };
      epics.push(current);
      continue;
    }
    if (/^##/.test(line)) { current = null; continue; }
    if (!current) continue;
    const dm = line.match(/^[-*]\s+\[x\]\s+(.+)$/i);
    if (dm) { const c = extractComplexity(dm[1].trim()); current.tasks.push({ status: "done",    text: c.text, estimate: c.estimate, actual: c.actual }); continue; }
    const bm = line.match(/^[-*]\s+\[!\]\s+(.+)$/);
    if (bm) { const c = extractComplexity(bm[1].trim()); current.tasks.push({ status: "blocked", text: c.text, estimate: c.estimate, actual: c.actual }); continue; }
    const pm = line.match(/^[-*]\s+\[ \]\s+(.+)$/);
    if (pm) { const c = extractComplexity(pm[1].trim()); current.tasks.push({ status: "pending", text: c.text, estimate: c.estimate, actual: c.actual }); }
  }

  return epics;
}

export function parseBacklog(md) {
  const lines = md.replace(/^\uFEFF/, "").split(/\r?\n/);

  // Compute metrics from actual task checkboxes — source of truth
  let done = 0;
  let left = 0;
  for (const line of lines) {
    if (/^[-*]\s+\[x\]\s+/i.test(line)) done++;
    else if (/^[-*]\s+\[ \]\s+/.test(line)) left++;
  }

  const total = done + left;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  let current_task = "";
  const idx = lines.findIndex((l) => /^##\s*Current\s*$/i.test(l.trim()));
  if (idx >= 0) {
    for (let i = idx + 1; i < lines.length; i++) {
      const t = lines[i].trim();
      if (!t) continue;
      if (t.startsWith("## ")) break;
      current_task = t.replace(/^[-*]\s*/, "");
      break;
    }
  }

  return {
    metrics: { done, left, progress_percent: progress },
    current_task
  };
}
