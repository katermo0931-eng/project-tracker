(function () {
  var elRows = document.getElementById("rows");
  var elMeta = document.getElementById("meta");
  var elQ = document.getElementById("q");
  var elStatus = document.getElementById("status");
  var elRefresh = document.getElementById("refresh");
  var elCountdown = document.getElementById("countdown");
  var elRootInput = document.getElementById("root-input");
  var elRootApply = document.getElementById("root-apply");

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

  function renderCommits(commits) {
    if (!commits || !commits.length) return "";
    var rows = commits.map(function (c) {
      return "<div class=\"commit\">" +
        "<span class=\"commit-hash\">" + esc(c.hash) + "</span>" +
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
        return "<div class=\"task " + st + "\">" +
          (TASK_ICON[st] || "○") + " " + esc(t.text) +
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

  function render() {
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
      var commitsHtml = renderCommits(p.recent_commits);
      var rowId = "erow-" + i;

      return (
        "<tr class=\"proj-row\" data-epic-target=\"" + rowId + "\">" +
          "<td class=\"proj\">" +
            "<div class=\"title\">" +
              ((epicHtml || commitsHtml) ? "<span class=\"expand-icon\">▶</span> " : "") +
              esc(p.title) +
            "</div>" +
            "<div class=\"folder\">" + esc(p.folder) + "</div>" +
          "</td>" +
          "<td><span class=\"badge " + (p.status === "ready" ? "ok" : p.status === "blocked" ? "blocked" : "warn") + "\">" + esc(p.status) + "</span></td>" +
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

  var STATUS_ICON = { ready: "✓", blocked: "✗", "needs work": "~" };
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
})();
