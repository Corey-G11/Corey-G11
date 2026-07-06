const LANGUAGES = [
  "Auto",
  "Python",
  "JavaScript",
  "TypeScript",
  "HTML/CSS",
  "React",
  "Node.js",
  "Go",
  "Rust",
  "Java",
  "Kotlin",
  "Swift",
  "C",
  "C++",
  "C#",
  "Ruby",
  "PHP",
  "Bash",
  "SQL",
  "R",
  "Lua",
  "Haskell",
  "Elixir",
  "Dart",
];

const EXAMPLES = [
  "A CLI to-do app that stores tasks in a JSON file",
  "A REST API for a bookshelf with add / list / delete",
  "A script that resizes every image in a folder",
  "Conway's Game of Life in the terminal",
  "A password strength checker with a score out of 100",
];

const form = document.getElementById("build-form");
const langSelect = document.getElementById("language");
const modelSelect = document.getElementById("model");
const promptEl = document.getElementById("prompt");
const buildBtn = document.getElementById("build-btn");
const stopBtn = document.getElementById("stop-btn");
const statusEl = document.getElementById("status");
const examplesEl = document.getElementById("examples");
const outputEl = document.getElementById("output");
const streamEl = document.getElementById("stream");
const emptyEl = document.getElementById("empty");
const bannerEl = document.getElementById("banner");
const footNote = document.getElementById("foot-note");
const outputBar = document.getElementById("output-bar");
const zipBtn = document.getElementById("zip-btn");
const regenBtn = document.getElementById("regen-btn");
const historyEl = document.getElementById("history");
const historyList = document.getElementById("history-list");
const historyClear = document.getElementById("history-clear");

// Theme toggle. The head script already applied the saved/system theme before
// paint; here we sync the button icon and handle clicks.
const themeToggle = document.getElementById("theme-toggle");
function syncThemeIcon() {
  const light = document.documentElement.getAttribute("data-theme") === "light";
  themeToggle.textContent = light ? "☀️" : "🌙";
}
themeToggle.addEventListener("click", () => {
  const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem("polyglot.theme", next);
  } catch {
    /* ignore storage errors */
  }
  syncThemeIcon();
});
syncThemeIcon();

zipBtn.addEventListener("click", downloadZip);
regenBtn.addEventListener("click", () => {
  if (lastBuild && !controller) runBuild(lastBuild);
});
historyClear.addEventListener("click", () => {
  if (confirm("Clear all saved builds?")) {
    saveHistory([]);
    renderHistory();
  }
});
// Initial history render happens at the end of the file, after HISTORY_KEY and
// the history functions are declared (const declarations are not hoisted).

// Check whether Ollama is running and the model is pulled, and guide the user
// if not. Purely informational — building still works once things are ready.
checkStatus();
async function checkStatus() {
  let status;
  try {
    const res = await fetch("/api/status");
    status = await res.json();
  } catch {
    return; // server unreachable; the build path will surface it
  }

  populateModels(status);

  if (!status.ollama) {
    showBanner(
      "warn",
      `Ollama isn't running. Install it from <a href="https://ollama.com" target="_blank" rel="noopener">ollama.com</a>, then run <code>ollama serve</code> and <code>ollama pull ${escapeHtml(status.model)}</code>.`
    );
  } else if (!status.hasModel && !(status.models && status.models.length)) {
    showBanner(
      "warn",
      `Ollama is running, but no models are installed. Run <code>ollama pull ${escapeHtml(status.model)}</code> to get started.`
    );
  } else {
    bannerEl.hidden = true;
  }
  if (footNote) {
    footNote.textContent = "Runs locally with Ollama — free, no API key.";
  }
}

// Fill the model dropdown with whatever the user has pulled. An empty value
// means "let the server use its default model".
function populateModels(status) {
  const models = status.models || [];
  if (!models.length) return; // keep the single "default" option
  modelSelect.innerHTML = "";
  for (const name of models) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    modelSelect.appendChild(opt);
  }
  // Prefer the server's configured default if it's installed.
  const preferred = models.find(
    (n) => n === status.model || n.split(":")[0] === (status.model || "").split(":")[0]
  );
  modelSelect.value = preferred || models[0];
}

function showBanner(kind, html) {
  bannerEl.className = `banner ${kind}`;
  bannerEl.innerHTML = html;
  bannerEl.hidden = false;
}

// Populate the language dropdown ("Auto" maps to the value the server expects).
for (const name of LANGUAGES) {
  const opt = document.createElement("option");
  opt.value = name === "Auto" ? "auto" : name;
  opt.textContent = name;
  langSelect.appendChild(opt);
}

// Example chips fill the textarea.
for (const ex of EXAMPLES) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip";
  chip.textContent = ex;
  chip.addEventListener("click", () => {
    promptEl.value = ex;
    promptEl.focus();
  });
  examplesEl.appendChild(chip);
}

let controller = null;
let lastBuild = null; // { prompt, language, model } of the most recent build

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const prompt = promptEl.value.trim();
  if (!prompt) {
    promptEl.focus();
    return;
  }
  runBuild({ prompt, language: langSelect.value, model: modelSelect.value });
});

// Ctrl/Cmd+Enter builds from the prompt field.
promptEl.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    form.requestSubmit();
  }
});

async function runBuild({ prompt, language, model }) {
  if (controller) return; // a build is already running
  lastBuild = { prompt, language, model };

  startBuilding();
  let buffer = "";
  let rafId = 0;
  let hadError = false;
  let usedModel = model;

  const render = () => {
    rafId = 0;
    renderMarkdown(streamEl, buffer, true);
  };
  const scheduleRender = () => {
    if (!rafId) rafId = requestAnimationFrame(render);
  };
  // A queued streaming frame must not fire after the final highlighted render,
  // or it would overwrite highlighting with plain text.
  const cancelPendingRender = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };

  controller = new AbortController();
  try {
    const res = await fetch("/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, language, model }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const info = await res.json().catch(() => ({}));
      throw new Error(info.error || `Request failed (${res.status})`);
    }

    await consumeSSE(res.body, (event, data) => {
      if (event === "token") {
        buffer += data.text;
        scheduleRender();
      } else if (event === "done") {
        if (data.model) usedModel = data.model;
        const bits = [];
        if (data.model) bits.push(data.model);
        if (data.eval_count) bits.push(`${data.eval_count} tokens`);
        setStatus(bits.length ? `Done — ${bits.join(" · ")}` : "Done");
      } else if (event === "error") {
        hadError = true;
        setStatus(data.message || "Something went wrong.", true);
      }
    });
    cancelPendingRender();
    renderMarkdown(streamEl, buffer, false); // final render: highlight, no cursor
    if (!hadError && buffer.trim()) {
      addHistory({ prompt, language, model: usedModel, response: buffer });
    }
  } catch (err) {
    if (err.name === "AbortError") {
      setStatus("Stopped.");
      cancelPendingRender();
      renderMarkdown(streamEl, buffer, false);
    } else {
      setStatus(err.message || "Something went wrong.", true);
    }
  } finally {
    finishBuilding();
  }
}

stopBtn.addEventListener("click", () => controller?.abort());

function startBuilding() {
  emptyEl.hidden = true;
  outputEl.hidden = false;
  outputBar.hidden = true;
  streamEl.innerHTML = "";
  buildBtn.disabled = true;
  buildBtn.textContent = "Building…";
  stopBtn.hidden = false;
  setStatus("Thinking…");
}

function finishBuilding() {
  controller = null;
  buildBtn.disabled = false;
  buildBtn.textContent = "Build it";
  stopBtn.hidden = true;
  updateOutputBar();
}

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("err", isError);
}

// Parse a Server-Sent Events stream from a fetch response body.
async function consumeSSE(body, onEvent) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const raw = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      let event = "message";
      const dataLines = [];
      for (const line of raw.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      if (dataLines.length) {
        try {
          onEvent(event, JSON.parse(dataLines.join("\n")));
        } catch {
          /* ignore malformed frame */
        }
      }
    }
  }
}

/* ---------- Minimal markdown rendering ---------- */

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Render prose (everything outside code fences): headings, bold, inline code, lists.
function renderProse(text) {
  const lines = text.split("\n");
  let html = "";
  let inList = false;
  const inline = (s) =>
    escapeHtml(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  for (const line of lines) {
    const t = line.trim();
    if (/^#{1,6}\s+/.test(t)) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h2>${inline(t.replace(/^#{1,6}\s+/, ""))}</h2>`;
    } else if (/^[-*]\s+/.test(t)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${inline(t.replace(/^[-*]\s+/, ""))}</li>`;
    } else if (t === "") {
      if (inList) { html += "</ul>"; inList = false; }
    } else {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<p>${inline(t)}</p>`;
    }
  }
  if (inList) html += "</ul>";
  return html;
}

function makeCodeBlock(info, code, highlight) {
  const tokens = info.trim().split(/\s+/).filter(Boolean);
  const lang = tokens[0] || "text";
  const filename = tokens.slice(1).join(" ") || "";

  const wrap = document.createElement("div");
  wrap.className = "codeblock";
  if (filename) wrap.dataset.filename = filename;

  const head = document.createElement("div");
  head.className = "cb-head";
  head.innerHTML =
    `<span class="cb-name">${escapeHtml(filename || lang)}</span>` +
    `<span class="cb-lang">${escapeHtml(lang)}</span>`;

  const btns = document.createElement("div");
  btns.className = "cb-btns";

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.textContent = "Copy";
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(code);
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
    } catch {
      copyBtn.textContent = "Failed";
    }
  });
  btns.appendChild(copyBtn);

  if (filename) {
    const dlBtn = document.createElement("button");
    dlBtn.type = "button";
    dlBtn.textContent = "Download";
    dlBtn.addEventListener("click", () => {
      const blob = new Blob([code], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
    btns.appendChild(dlBtn);
  }

  head.appendChild(btns);
  wrap.appendChild(head);

  const pre = document.createElement("pre");
  const codeEl = document.createElement("code");
  // Highlight only on the final render (streaming frames stay plain text for
  // speed and because the trailing block is still incomplete).
  if (highlight && window.PolyglotLib) {
    codeEl.innerHTML = window.PolyglotLib.highlightCode(code, lang);
  } else {
    codeEl.textContent = code;
  }
  pre.appendChild(codeEl);
  wrap.appendChild(pre);
  return wrap;
}

// Split the buffer on ``` fences and render prose / code segments.
// `streaming` shows a blinking cursor on the trailing (possibly-incomplete) part.
function renderMarkdown(container, text, streaming) {
  const parts = text.split(/```/);
  container.innerHTML = "";

  parts.forEach((part, i) => {
    const isCode = i % 2 === 1;
    const isLast = i === parts.length - 1;

    if (isCode) {
      const nl = part.indexOf("\n");
      const info = nl === -1 ? part : part.slice(0, nl);
      const code = nl === -1 ? "" : part.slice(nl + 1);
      // While streaming, the closing fence for the final block hasn't arrived,
      // so trim a trailing newline that would otherwise wobble.
      container.appendChild(
        makeCodeBlock(info, isLast && streaming ? code : code.replace(/\n$/, ""), !streaming)
      );
    } else if (part.trim() !== "") {
      const div = document.createElement("div");
      div.className = "prose";
      div.innerHTML = renderProse(part);
      if (isLast && streaming) div.classList.add("cursor");
      container.appendChild(div);
    }
  });
}

/* ---------- Download all files as a .zip ---------- */

// Collect every rendered code block that has a filename.
function collectFiles() {
  const files = [];
  for (const block of streamEl.querySelectorAll(".codeblock[data-filename]")) {
    const name = block.dataset.filename;
    const codeEl = block.querySelector("pre code");
    if (name && codeEl) files.push({ name, content: codeEl.textContent });
  }
  return files;
}

// Refresh the output toolbar: the zip button needs at least two named files;
// Regenerate needs a previous build and no build currently running. Hide the
// whole bar when neither button applies.
function updateOutputBar() {
  zipBtn.hidden = collectFiles().length < 2;
  regenBtn.hidden = !lastBuild || !!controller;
  outputBar.hidden = zipBtn.hidden && regenBtn.hidden;
}

function downloadZip() {
  const files = collectFiles();
  if (!files.length || !window.PolyglotLib) return;
  const bytes = window.PolyglotLib.buildZip(files);
  const blob = new Blob([bytes], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "polyglot-project.zip";
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- Recent builds (localStorage) ---------- */

const HISTORY_KEY = "polyglot.history";
const HISTORY_MAX = 30;

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveHistory(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    // Quota exceeded — drop the oldest entries and retry once.
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 10)));
    } catch {
      /* give up silently */
    }
  }
}

function addHistory(entry) {
  const list = loadHistory();
  list.unshift({ id: Date.now() + "-" + Math.random().toString(36).slice(2, 7), ts: Date.now(), ...entry });
  saveHistory(list.slice(0, HISTORY_MAX));
  renderHistory();
}

function deleteHistory(id) {
  saveHistory(loadHistory().filter((e) => e.id !== id));
  renderHistory();
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function renderHistory() {
  const list = loadHistory();
  historyList.innerHTML = "";
  historyEl.hidden = list.length === 0;
  for (const entry of list) {
    const li = document.createElement("li");
    li.className = "history-item";

    const main = document.createElement("div");
    main.className = "history-main";
    main.title = "Load this build";
    main.tabIndex = 0;
    main.setAttribute("role", "button");
    const langLabel = entry.language && entry.language !== "auto" ? entry.language : "Auto";
    main.setAttribute("aria-label", `Load build: ${entry.prompt}`);
    main.innerHTML =
      `<div class="history-prompt"></div>` +
      `<div class="history-meta">${escapeHtml(langLabel)} · ${escapeHtml(entry.model || "")} · ${timeAgo(entry.ts)}</div>`;
    main.querySelector(".history-prompt").textContent = entry.prompt;
    main.addEventListener("click", () => loadHistoryEntry(entry));
    main.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        loadHistoryEntry(entry);
      }
    });

    const del = document.createElement("button");
    del.className = "history-del";
    del.type = "button";
    del.textContent = "×";
    del.title = "Remove";
    del.setAttribute("aria-label", "Remove this build from history");
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteHistory(entry.id);
    });

    li.appendChild(main);
    li.appendChild(del);
    historyList.appendChild(li);
  }
}

// Reload a saved build: repopulate the form and re-display its output,
// without calling the model again. Edit + Build to re-run.
function loadHistoryEntry(entry) {
  if (controller) return; // don't clobber an in-flight build
  promptEl.value = entry.prompt || "";
  if (entry.language) selectIfPresent(langSelect, entry.language);
  if (entry.model) selectIfPresent(modelSelect, entry.model);

  // Regenerate should re-run this loaded build.
  lastBuild = { prompt: entry.prompt, language: entry.language || "auto", model: entry.model || "" };

  emptyEl.hidden = true;
  outputEl.hidden = false;
  renderMarkdown(streamEl, entry.response || "", false);
  updateOutputBar();
  setStatus(`Loaded from history · ${timeAgo(entry.ts)}`);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  outputEl.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

function selectIfPresent(select, value) {
  if ([...select.options].some((o) => o.value === value)) select.value = value;
}

// Render any saved builds now that all history declarations exist.
renderHistory();
