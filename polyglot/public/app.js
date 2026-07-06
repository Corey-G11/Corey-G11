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

  if (!status.ollama) {
    showBanner(
      "warn",
      `Ollama isn't running. Install it from <a href="https://ollama.com" target="_blank" rel="noopener">ollama.com</a>, then run <code>ollama serve</code> and <code>ollama pull ${escapeHtml(status.model)}</code>.`
    );
  } else if (!status.hasModel) {
    showBanner(
      "warn",
      `Ollama is running, but the model <code>${escapeHtml(status.model)}</code> isn't installed. Run <code>ollama pull ${escapeHtml(status.model)}</code> to get it.`
    );
  } else {
    bannerEl.hidden = true;
  }
  if (status.model && footNote) {
    footNote.textContent = `Runs locally with Ollama — free, no API key. Model: ${status.model}`;
  }
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

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const prompt = promptEl.value.trim();
  if (!prompt) {
    promptEl.focus();
    return;
  }
  if (controller) return; // a build is already running

  startBuilding();
  let buffer = "";
  let scheduled = false;

  const render = () => {
    scheduled = false;
    renderMarkdown(streamEl, buffer, true);
  };
  const scheduleRender = () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(render);
    }
  };

  controller = new AbortController();
  try {
    const res = await fetch("/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, language: langSelect.value }),
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
        buffer = buffer; // final flush below
        const bits = [];
        if (data.model) bits.push(data.model);
        if (data.output_tokens) bits.push(`${data.output_tokens} tokens`);
        setStatus(bits.length ? `Done — ${bits.join(" · ")}` : "Done");
      } else if (event === "error") {
        setStatus(data.message || "Something went wrong.", true);
      }
    });
    renderMarkdown(streamEl, buffer, false); // final render, no cursor
  } catch (err) {
    if (err.name === "AbortError") {
      setStatus("Stopped.");
      renderMarkdown(streamEl, buffer, false);
    } else {
      setStatus(err.message || "Something went wrong.", true);
    }
  } finally {
    finishBuilding();
  }
});

stopBtn.addEventListener("click", () => controller?.abort());

function startBuilding() {
  emptyEl.hidden = true;
  outputEl.hidden = false;
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

function makeCodeBlock(info, code) {
  const tokens = info.trim().split(/\s+/).filter(Boolean);
  const lang = tokens[0] || "text";
  const filename = tokens.slice(1).join(" ") || "";

  const wrap = document.createElement("div");
  wrap.className = "codeblock";

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
  codeEl.textContent = code;
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
      container.appendChild(makeCodeBlock(info, isLast && streaming ? code : code.replace(/\n$/, "")));
    } else if (part.trim() !== "") {
      const div = document.createElement("div");
      div.className = "prose";
      div.innerHTML = renderProse(part);
      if (isLast && streaming) div.classList.add("cursor");
      container.appendChild(div);
    }
  });
}
