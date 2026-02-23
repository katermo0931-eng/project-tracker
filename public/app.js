(function () {
  var elRows = document.getElementById("rows");
  var elMeta = document.getElementById("meta");
  var elQ = document.getElementById("q");
  var elStatus = document.getElementById("status");
  var elRefresh = document.getElementById("refresh");
  var elCountdown = document.getElementById("countdown");
  var elRootInput = document.getElementById("root-input");
  var elRootApply = document.getElementById("root-apply");
  var elTabProjects = document.getElementById("tab-projects");
  var elTabIdeas = document.getElementById("tab-ideas");
  var elMain = document.querySelector("main");
  var elDashboard = document.getElementById("dashboard");
  var elIdeasPanel = document.getElementById("ideas-panel");
  var elIdeaCount = document.getElementById("idea-count");

  // ── Tab switching ──────────────────────────────────

  function switchTab(tab) {
    elTabProjects.classList.toggle("active", tab === "projects");
    elTabIdeas.classList.toggle("active", tab === "ideas");
    elMain.style.display = tab === "projects" ? "" : "none";
    if (elDashboard) elDashboard.style.display = tab === "projects" ? "" : "none";
    elIdeasPanel.style.display = tab === "ideas" ? "" : "none";
    if (tab === "ideas") renderIdeasPanel();
  }

  elTabProjects.addEventListener("click", function () { switchTab("projects"); });
  elTabIdeas.addEventListener("click", function () { switchTab("ideas"); });

  // ── Ideas ──────────────────────────────────────────

  var ideasData = null;

  function fetchIdeas() {
    fetch("/api/ideas")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        ideasData = data;
        if (data.idea_count > 0 && elIdeaCount) {
          elIdeaCount.textContent = data.idea_count;
          elIdeaCount.style.display = "";
        }
      })
      .catch(function () {});
  }

  function inlineMd(raw) {
    return raw
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code class=\"ideas-code\">$1</code>");
  }

  function renderIdeasMd(md) {
    if (!md) return "<p class=\"ideas-empty\">No ideas file found.</p>";
    var lines = md.split(/\r?\n/);
    var out = [];
    lines.forEach(function (line) {
      if (/^# /.test(line)) {
        // skip top-level title (just "Ideas Inbox")
      } else if (/^## /.test(line)) {
        out.push("<h2 class=\"ideas-h2\">" + inlineMd(line.replace(/^## /, "")) + "</h2>");
      } else if (/^### /.test(line)) {
        out.push("<h3 class=\"ideas-h3\">" + inlineMd(line.replace(/^### /, "")) + "</h3>");
      } else if (/^-{3,}$/.test(line.trim())) {
        out.push("<hr class=\"ideas-hr\"/>");
      } else if (/\*\*Status:\*\*/.test(line)) {
        var m = line.match(/\*\*Status:\*\*\s*(.+)/);
        if (m) {
          var val = m[1].trim();
          var cls = /^(done|addressed|complete|retired)/i.test(val) ? "idea-done"
                  : /^idea$/i.test(val) ? "idea-active"
                  : "idea-other";
          out.push("<p class=\"ideas-status\"><span class=\"ideas-status-label\">Status</span><span class=\"idea-badge " + cls + "\">" + inlineMd(val) + "</span></p>");
        }
      } else if (line.trim() === "" || /^_Add new ideas/.test(line)) {
        // skip
      } else {
        out.push("<p class=\"ideas-p\">" + inlineMd(line) + "</p>");
      }
    });
    return out.join("\n");
  }

  function renderIdeasPanel() {
    var el = document.getElementById("ideas-content");
    if (!el) return;
    if (!ideasData) {
      el.innerHTML = "<p class=\"ideas-empty\">Ideas not available.</p>";
      return;
    }
    if (ideasData.error && !ideasData.content) {
      el.innerHTML = "<p class=\"ideas-empty\">Ideas file not available in this environment.</p>";
      return;
    }
    el.innerHTML = renderIdeasMd(ideasData.content);
  }

  // Extra per-project action links: keyed by folder basename
  var PROJECT_LINKS = {
    "Interactive-CV": [
      { label: "in", url: "https://www.linkedin.com/in/ekacherkasova", cls: "li-badge" }
    ]
  };

  var STORAGE_KEY = "tracker_root";
  var customRoot = localStorage.getItem(STORAGE_KEY) || "";
  elRootInput.value = customRoot;

  var AUTO_REFRESH_SEC = 30;
  var countdownTimer = null;
  var secondsLeft = AUTO_REFRESH_SEC;

  function startCountdown() {
    clearInterval(countdownTimer);
    secondsLeft = AUTO_REFRESH_SEC;
    elCountdown.textContent = "Next: " + secondsLeft + "s";
    countdownTimer = setInterval(function () {
      secondsLeft -= 1;
      elCountdown.textContent = "Next: " + secondsLeft + "s";
      if (secondsLeft <= 0) {
        clearInterval(countdownTimer);
        elCountdown.textContent = "Refreshing…";
        load();
      }
    }, 1000);
  }

  var all = [];
  var ghCache = {}; // "owner/repo" → stats or "loading"

  function esc(s) {
    s = String(s || "");
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  var TASK_ICON = { done: "✓", blocked: "✗", pending: "○" };

  function epicBadgeClass(tasks) {
    if (!tasks.length) return "warn";
    if (tasks.some(function (t) { return t.status === "blocked"; })) return "blocked";
    if (tasks.every(function (t) { return t.status === "done"; })) return "ok";
    return "warn";
  }

  // ── Dashboard ─────────────────────────────────────

  function renderDashboard(projects) {
    var elDash = document.getElementById("dashboard");
    if (!elDash) return;
    var total = projects.length;
    var blocked = 0, needsWork = 0, inProgress = 0, complete = 0;
    var totalDone = 0, totalLeft = 0;
    var allCommits = [];

    projects.forEach(function (p) {
      if      (p.status === "blocked")     blocked++;
      else if (p.status === "needs work")  needsWork++;
      else if (p.status === "in progress") inProgress++;
      else if (p.status === "complete")    complete++;
      if (p.metrics) { totalDone += p.metrics.done || 0; totalLeft += p.metrics.left || 0; }
      var c = p.recent_commits && p.recent_commits[0];
      if (c) allCommits.push({ project: p.title, hash: c.hash, date: c.date, subject: c.subject });
    });

    var totalTasks = totalDone + totalLeft;
    var pct = totalTasks ? Math.round(100 * totalDone / totalTasks) : 0;
    allCommits.sort(function (a, b) { return b.date.localeCompare(a.date); });
    var latest = allCommits[0];

    elDash.innerHTML =
      "<div class=\"dash-cards\">" +
        "<div class=\"dash-card\">" +
          "<div class=\"dash-val\">" + total + "</div>" +
          "<div class=\"dash-lbl\">Projects</div>" +
        "</div>" +
        "<div class=\"dash-card\">" +
          "<div class=\"dash-val\">" + totalDone + "<span class=\"dash-sub\">/" + totalTasks + "</span></div>" +
          "<div class=\"dash-lbl\">Tasks done</div>" +
        "</div>" +
        "<div class=\"dash-card dash-card-prog\">" +
          "<div class=\"dash-val dash-pct\">" + pct + "%</div>" +
          "<div class=\"dash-lbl\">Overall progress</div>" +
          "<div class=\"prog-bar dash-prog\"><div class=\"prog-fill\" style=\"width:" + pct + "%\"></div></div>" +
        "</div>" +
        "<div class=\"dash-card\">" +
          "<div class=\"dash-status-row\">" +
            "<span class=\"badge blocked\">" + blocked    + " blocked</span>" +
            "<span class=\"badge warn\">"    + needsWork  + " needs work</span>" +
            "<span class=\"badge info\">"    + inProgress + " in progress</span>" +
            "<span class=\"badge ok\">"      + complete   + " complete</span>" +
          "</div>" +
          "<div class=\"dash-lbl\">By status</div>" +
        "</div>" +
        (latest
          ? "<div class=\"dash-card dash-card-wide\">" +
              "<div class=\"dash-lbl\">Latest activity</div>" +
              "<div class=\"dash-activity\">" +
                "<span class=\"commit-hash\">" + esc(latest.hash)    + "</span>" +
                "<span class=\"commit-date\">" + esc(latest.date)    + "</span>" +
                "<span class=\"commit-subject\">" + esc(latest.subject) + "</span>" +
                "<span class=\"dash-proj\">"   + esc(latest.project) + "</span>" +
              "</div>" +
            "</div>"
          : "") +
      "</div>";
  }

  // ── Commits ───────────────────────────────────────

  function renderCommits(commits, githubRepo) {
    if (!commits || !commits.length) return "";
    var baseUrl = githubRepo
      ? "https://github.com/" + esc(githubRepo.owner) + "/" + esc(githubRepo.repo) + "/commit/"
      : null;
    var rows = commits.map(function (c) {
      var hashEl = baseUrl
        ? "<a class=\"commit-hash\" href=\"" + baseUrl + esc(c.hash) + "\" target=\"_blank\" rel=\"noopener\" onclick=\"event.stopPropagation()\">" + esc(c.hash) + "</a>"
        : "<span class=\"commit-hash\">" + esc(c.hash) + "</span>";
      return "<div class=\"commit\">" +
        hashEl +
        "<span class=\"commit-date\">" + esc(c.date) + "</span>" +
        "<span class=\"commit-subject\">" + esc(c.subject) + "</span>" +
      "</div>";
    }).join("");
    return "<div class=\"commits-section\">" +
      "<div class=\"commits-title\">Recent commits</div>" +
      rows +
    "</div>";
  }

  function renderEpics(epics, rowIdx) {
    if (!epics || !epics.length) return "";
    return epics.map(function (ep, ei) {
      var doneCnt = ep.tasks.filter(function (t) { return t.status === "done"; }).length;
      var total = ep.tasks.length;
      var cls = epicBadgeClass(ep.tasks);
      var tasksId = "etasks-" + rowIdx + "-" + ei;
      var tasks = ep.tasks.map(function (t) {
        var st = t.status || "pending";
        var estHtml   = t.estimate ? "<span class=\"comp-est\">"    + esc(t.estimate) + "</span>" : "";
        var actHtml   = t.actual   ? "<span class=\"comp-actual\">→ " + esc(t.actual)   + "</span>" : "";
        var chipsHtml = (estHtml || actHtml) ? "<span class=\"comp-chips\">" + estHtml + actHtml + "</span>" : "";
        return "<div class=\"task " + st + "\">" +
          (TASK_ICON[st] || "○") + " " + esc(t.text) + chipsHtml +
        "</div>";
      }).join("");
      return "<div class=\"epic status-" + cls + "\">" +
        "<div class=\"epic-hdr\" data-tasks-id=\"" + tasksId + "\">" +
          "<span class=\"epic-fold\">▼</span>" +
          "<span class=\"epic-title\">" + esc(ep.title) + "</span>" +
          (total ? "<span class=\"badge " + cls + "\">" + doneCnt + "/" + total + "</span>" : "") +
        "</div>" +
        "<div class=\"epic-tasks\" id=\"" + tasksId + "\">" +
          tasks +
        "</div>" +
      "</div>";
    }).join("");
  }

  function ghBadgesHtml(stats) {
    var parts = [];
    if (stats.open_prs > 0) {
      parts.push("<a class=\"gh-badge gh-pr\" href=\"" + esc(stats.html_url) + "/pulls\" target=\"_blank\" rel=\"noopener\">" +
        "⬆ " + stats.open_prs + " PR" + (stats.open_prs !== 1 ? "s" : "") + "</a>");
    }
    if (stats.open_issues > 0) {
      parts.push("<a class=\"gh-badge gh-issue\" href=\"" + esc(stats.html_url) + "/issues\" target=\"_blank\" rel=\"noopener\">" +
        "⚠ " + stats.open_issues + "</a>");
    }
    if (!parts.length) {
      return "<a class=\"gh-badge gh-clean\" href=\"" + esc(stats.html_url) + "\" target=\"_blank\" rel=\"noopener\">GH ✓</a>";
    }
    return parts.join(" ");
  }

  function fetchGhStats(projects) {
    projects.forEach(function (p) {
      if (!p.github_repo) return;
      var key = p.github_repo.owner + "/" + p.github_repo.repo;
      var elId = "gh-" + p.github_repo.owner + "-" + p.github_repo.repo;
      var el = document.getElementById(elId);

      if (ghCache[key] && ghCache[key] !== "loading") {
        if (el) el.innerHTML = ghBadgesHtml(ghCache[key]);
        return;
      }
      if (ghCache[key] === "loading") return;

      ghCache[key] = "loading";
      fetch("/api/github-stats?owner=" + encodeURIComponent(p.github_repo.owner) +
            "&repo=" + encodeURIComponent(p.github_repo.repo))
        .then(function (r) { return r.json(); })
        .then(function (stats) {
          if (stats.error) {
            ghCache[key] = null;
            if (el) el.innerHTML = "";
            return;
          }
          ghCache[key] = stats;
          var el2 = document.getElementById(elId);
          if (el2) el2.innerHTML = ghBadgesHtml(stats);
        })
        .catch(function () {
          ghCache[key] = null;
          var el2 = document.getElementById(elId);
          if (el2) el2.innerHTML = "";
        });
    });
  }

  function render() {
    renderDashboard(all);
    var q = (elQ.value || "").trim().toLowerCase();
    var st = elStatus.value || "all";

    var filtered = all.filter(function (p) {
      var title = (p && p.title) ? p.title : "";
      var desc = (p && p.description) ? p.description : "";
      var hay = (title + " " + desc).toLowerCase();
      var okQ = (!q) || (hay.indexOf(q) !== -1);
      var okSt = (st === "all") || (p.status === st);
      return okQ && okSt;
    });

    elRows.innerHTML = filtered.map(function (p, i) {
      var m = p.metrics || {};
      var done = (m.done !== null && m.done !== undefined) ? m.done : "";
      var left = (m.left !== null && m.left !== undefined) ? m.left : "";
      var prog = (m.progress_percent !== null && m.progress_percent !== undefined) ? m.progress_percent : "";
      var progHtml = (prog !== "")
        ? "<div class=\"prog-wrap\"><div class=\"prog-bar\"><div class=\"prog-fill\" style=\"width:" + prog + "%\"></div></div><span class=\"prog-pct\">" + prog + "%</span></div>"
        : "";

      var missingArr = p.missing_files || [];
      var missing = missingArr.map(esc).join("<br/>");

      var epicHtml = renderEpics(p.epics, i);
      var commitsHtml = renderCommits(p.recent_commits, p.github_repo);
      var rowId = "erow-" + i;

      var folderKey = (p.folder || "").replace(/\\/g, "/").split("/").filter(Boolean).pop() || "";
      var extraLinks = (PROJECT_LINKS[folderKey] || []).map(function (lk) {
        return "<a class=\"gh-badge " + esc(lk.cls) + "\" href=\"" + esc(lk.url) + "\" target=\"_blank\" rel=\"noopener\" onclick=\"event.stopPropagation()\">" + esc(lk.label) + "</a>";
      }).join("");

      return (
        "<tr class=\"proj-row\" data-epic-target=\"" + rowId + "\">" +
          "<td class=\"proj\">" +
            "<div class=\"title\">" +
              ((epicHtml || commitsHtml) ? "<span class=\"expand-icon\">▶</span> " : "") +
              esc(p.title) +
              (p.github_repo ? " <span class=\"gh-badges\" id=\"gh-" + esc(p.github_repo.owner) + "-" + esc(p.github_repo.repo) + "\">…</span>" : "") +
              (extraLinks ? " " + extraLinks : "") +
            "</div>" +
            "<div class=\"folder\">" + esc(p.folder) + "</div>" +
          "</td>" +
          "<td><span class=\"badge " + (p.status === "complete" ? "ok" : p.status === "blocked" ? "blocked" : p.status === "in progress" ? "info" : "warn") + "\">" + esc(p.status) + "</span></td>" +
          "<td class=\"num\">" + done + "</td>" +
          "<td class=\"num\">" + left + "</td>" +
          "<td>" + progHtml + "</td>" +
          "<td class=\"current-task\">" + esc(p.current_task) + "</td>" +
          "<td>" +
            "<div class=\"desc\">" + esc(p.description) + "</div>" +
            (missing ? ("<div class=\"missing\"><b>Missing:</b><br/>" + missing + "</div>") : "") +
          "</td>" +
        "</tr>" +
        ((epicHtml || commitsHtml) ?
          "<tr id=\"" + rowId + "\" class=\"epic-detail\" style=\"display:none\">" +
            "<td colspan=\"7\">" +
              (epicHtml ? "<div class=\"epic-list\">" + epicHtml + "</div>" : "") +
              commitsHtml +
            "</td>" +
          "</tr>"
        : "")
      );
    }).join("");

    fetchGhStats(filtered);

    Array.from(elRows.querySelectorAll(".proj-row")).forEach(function (row) {
      row.addEventListener("click", function () {
        var target = document.getElementById(row.dataset.epicTarget);
        if (!target) return;
        var open = target.style.display !== "none";
        target.style.display = open ? "none" : "";
        var icon = row.querySelector(".expand-icon");
        if (icon) icon.textContent = open ? "▶" : "▼";
      });
    });

    Array.from(elRows.querySelectorAll(".epic-hdr")).forEach(function (hdr) {
      hdr.addEventListener("click", function (e) {
        e.stopPropagation();
        var tasksEl = document.getElementById(hdr.dataset.tasksId);
        if (!tasksEl) return;
        var collapsed = tasksEl.style.display === "none";
        tasksEl.style.display = collapsed ? "" : "none";
        var icon = hdr.querySelector(".epic-fold");
        if (icon) icon.textContent = collapsed ? "▼" : "▶";
      });
    });
  }

  function load() {
    elMeta.textContent = "Scanning…";
    elCountdown.textContent = "";
    var url = "/api/projects" + (customRoot ? "?root=" + encodeURIComponent(customRoot) : "");
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (j) {
        all = j.projects || [];
        ghCache = {};  // clear on full reload
        var scanned = new Date(j.scanned_at);
        elMeta.textContent =
          "Root: " + j.root +
          " | Projects: " + all.length +
          " | Last scan: " + scanned.toLocaleString();
        render();
        startCountdown();
      })
      .catch(function (e) {
        elMeta.textContent = "Load error: " + String(e);
        startCountdown();
      });
  }

  var elExport = document.getElementById("export");

  var STATUS_ICON = { complete: "✓", blocked: "✗", "needs work": "~", "in progress": "→" };
  var TASK_ICON_MD = { done: "✓", blocked: "✗", pending: "○" };

  function exportMarkdown() {
    var lines = [];
    var now = new Date();
    lines.push("# Project Summary");
    lines.push("");
    lines.push("_Exported: " + now.toLocaleString() + "_");
    if (all.length) {
      var meta = document.getElementById("meta").textContent;
      var rootMatch = meta.match(/Root:\s*([^\|]+)/);
      if (rootMatch) lines.push("_Root: " + rootMatch[1].trim() + "_");
    }
    lines.push("");
    lines.push("---");

    all.forEach(function (p) {
      var m = p.metrics || {};
      var icon = STATUS_ICON[p.status] || "~";
      lines.push("");
      lines.push("## " + icon + " " + p.title);
      var statusLine = "**Status:** " + p.status;
      if (m.progress_percent != null) {
        statusLine += " | **Progress:** " + m.progress_percent + "% (" + m.done + "/" + (m.done + m.left) + " done)";
      }
      lines.push(statusLine);
      if (p.current_task) lines.push("**Current task:** " + p.current_task);
      if (p.description) lines.push("**Description:** " + p.description);

      if (p.epics && p.epics.length) {
        lines.push("");
        p.epics.forEach(function (ep) {
          var done = ep.tasks.filter(function (t) { return t.status === "done"; }).length;
          lines.push("### " + ep.title + " (" + done + "/" + ep.tasks.length + ")");
          ep.tasks.forEach(function (t) {
            lines.push("- " + (TASK_ICON_MD[t.status] || "○") + " " + t.text);
          });
        });
      }

      if (p.recent_commits && p.recent_commits.length) {
        lines.push("");
        lines.push("### Recent commits");
        p.recent_commits.slice(0, 5).forEach(function (c) {
          lines.push("- `" + c.hash + "` " + c.date + " — " + c.subject);
        });
      }
    });

    var md = lines.join("\n");
    var blob = new Blob([md], { type: "text/markdown" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "projects-" + now.toISOString().slice(0, 10) + ".md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  elQ.addEventListener("input", render);
  elStatus.addEventListener("change", render);
  elRefresh.addEventListener("click", function () {
    load();
  });
  elExport.addEventListener("click", exportMarkdown);

  elRootApply.addEventListener("click", function () {
    customRoot = elRootInput.value.trim();
    if (customRoot) {
      localStorage.setItem(STORAGE_KEY, customRoot);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    load();
  });
  elRootInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") elRootApply.click();
  });

  load();
  fetchIdeas();
})();
