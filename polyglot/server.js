import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");

const PORT = process.env.PORT || 3000;
// Ollama runs the model locally — free, no API key. Override the model with
// POLYGLOT_MODEL (must be pulled first: `ollama pull <model>`).
const OLLAMA_URL = (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "");
const MODEL = process.env.POLYGLOT_MODEL || "qwen2.5-coder";

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function systemPrompt(language) {
  const target =
    language && language !== "auto"
      ? `Write the solution in ${language}. Only switch languages if ${language} genuinely cannot express the request, and say so if you do.`
      : `Choose the language best suited to the request and state, in one line, why you picked it.`;

  return [
    "You are Polyglot, an expert software engineer fluent in every programming language.",
    "The user describes what they want built; you build it — complete, correct, and runnable.",
    "",
    target,
    "",
    "Rules for your response:",
    "- Open with one or two sentences on what you're building. No preamble beyond that.",
    "- Provide complete, working code — no stubs, no TODOs, no `...`, no omitted bodies.",
    "- Put each file in its own fenced code block whose info string is the language followed by the filename, e.g. ```python app.py```. Always include a filename.",
    "- After the code, add a short '## Run it' section with the exact commands to install and run.",
    "- If the request is ambiguous, make a reasonable choice, state the assumption in one line, and build it anyway rather than asking questions.",
    "- Keep prose lean: explain what a reader needs to run and understand the code, nothing more.",
  ].join("\n");
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/api/status") {
      await handleStatus(res);
    } else if (req.method === "POST" && req.url === "/api/build") {
      await handleBuild(req, res);
    } else if (req.method === "GET") {
      serveStatic(req, res);
    } else {
      res.writeHead(405).end("Method Not Allowed");
    }
  } catch (err) {
    console.error("[server]", err);
    if (!res.headersSent) res.writeHead(500).end("Internal Server Error");
    else res.end();
  }
});

// --- Static files ---------------------------------------------------------

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  const filePath = path.join(PUBLIC_DIR, rel);

  // Prevent path traversal outside public/.
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
      return;
    }
    const type = CONTENT_TYPES[path.extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type }).end(data);
  });
}

// --- Status: is Ollama running, and is the model pulled? ------------------

async function handleStatus(res) {
  const result = { ollama: false, model: MODEL, hasModel: false, models: [] };
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (r.ok) {
      const body = await r.json();
      const names = (body.models || []).map((m) => m.name);
      result.ollama = true;
      result.models = names;
      const base = MODEL.split(":")[0];
      result.hasModel = names.some(
        (n) => n === MODEL || n === `${MODEL}:latest` || n.split(":")[0] === base
      );
    }
  } catch {
    /* Ollama not reachable */
  }
  res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(result));
}

// --- Build: stream a model response to the browser over SSE ---------------

function readJsonBody(req, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

async function handleBuild(req, res) {
  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (e) {
    res.writeHead(400, { "Content-Type": "application/json" }).end(
      JSON.stringify({ error: e.message })
    );
    return;
  }

  const prompt = (payload.prompt || "").toString().trim();
  const language = (payload.language || "auto").toString().trim();
  const model = (payload.model || "").toString().trim() || MODEL;

  if (!prompt) {
    res.writeHead(400, { "Content-Type": "application/json" }).end(
      JSON.stringify({ error: "Describe what you want built." })
    );
    return;
  }
  if (prompt.length > 20000) {
    res.writeHead(400, { "Content-Type": "application/json" }).end(
      JSON.stringify({ error: "That request is too long — trim it down a bit." })
    );
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const controller = new AbortController();
  req.on("close", () => controller.abort());

  try {
    const upstream = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: true,
        options: { temperature: 0.3 },
        messages: [
          { role: "system", content: systemPrompt(language) },
          { role: "user", content: prompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      send("error", { message: describeOllamaError(upstream.status, text, model) });
      res.end();
      return;
    }

    // Ollama streams newline-delimited JSON objects.
    const decoder = new TextDecoder();
    let buf = "";
    for await (const chunk of upstream.body) {
      buf += decoder.decode(chunk, { stream: true });
      let nl;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        let obj;
        try {
          obj = JSON.parse(line);
        } catch {
          continue;
        }
        if (obj.error) {
          send("error", { message: describeOllamaError(200, obj.error, model) });
          res.end();
          return;
        }
        const piece = obj.message?.content;
        if (piece) send("token", { text: piece });
        if (obj.done) {
          send("done", { model, eval_count: obj.eval_count ?? null });
          res.end();
          return;
        }
      }
    }
    send("done", { model });
  } catch (err) {
    if (err?.name === "AbortError") {
      res.end();
      return;
    }
    send("error", { message: describeFetchError(err, model) });
    console.error("[/api/build]", err?.message || err);
  } finally {
    res.end();
  }
}

function describeFetchError(err, model = MODEL) {
  const msg = err?.cause?.code || err?.message || "";
  if (/ECONNREFUSED|fetch failed|ENOTFOUND|ETIMEDOUT/i.test(msg)) {
    return `Can't reach Ollama at ${OLLAMA_URL}. Install it from https://ollama.com, then run "ollama serve" and "ollama pull ${model}".`;
  }
  return err?.message || "Something went wrong while building.";
}

function describeOllamaError(status, text, model = MODEL) {
  if (status === 404 || /not found|no such model|try pulling/i.test(text)) {
    return `The model "${model}" isn't installed. Run: ollama pull ${model}`;
  }
  return `Ollama error${status ? ` (${status})` : ""}: ${text || "unknown"}`;
}

server.listen(PORT, () => {
  console.log(`\n  Polyglot is running → http://localhost:${PORT}`);
  console.log(`  Model:  ${MODEL} (local, via Ollama)`);
  console.log(`  Ollama: ${OLLAMA_URL}`);
  console.log(
    `\n  Free & local — no API key. If you haven't yet:\n` +
      `     1. Install Ollama:  https://ollama.com\n` +
      `     2. Pull the model:  ollama pull ${MODEL}\n`
  );
});
