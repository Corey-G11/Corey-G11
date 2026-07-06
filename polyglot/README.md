# Polyglot 🛠️

An app that knows every programming language. Describe what you want in plain
English, pick a language (or leave it on **Auto**), and Polyglot builds it —
streaming complete, runnable code back to you, with copy and download buttons
for every file.

**Free and fully local.** It runs an open-source model on your own machine via
[Ollama](https://ollama.com) — no API key, no account, no per-use cost. The
server itself has **zero npm dependencies** (just Node's built-ins).

## What it does

- **Any language** — Python, JavaScript, TypeScript, Go, Rust, Java, C/C++, Ruby,
  and more. Or **Auto**, where Polyglot picks the best language for the task.
- **You describe, it builds** — "a CLI to-do app that saves tasks to JSON",
  "a REST API for a bookshelf", "Conway's Game of Life in the terminal".
- **Streaming output** — code appears as it's written.
- **Real files** — each file gets its own block with **Copy** and **Download**.

## Requirements

- [Node.js](https://nodejs.org) 20 or newer
- [Ollama](https://ollama.com) (free, runs the model locally)

## Setup

1. **Install Ollama** from [ollama.com](https://ollama.com) and start it:

   ```bash
   ollama serve
   ```

2. **Pull a coding model** (a few GB, one-time download):

   ```bash
   ollama pull qwen2.5-coder
   ```

   `qwen2.5-coder` is a strong, compact code model. Any Ollama model works —
   e.g. `llama3.1`, `deepseek-coder-v2`, `codellama`.

3. **Start Polyglot:**

   ```bash
   cd polyglot
   npm start        # or: node server.js
   ```

Then open **http://localhost:3000**. If Ollama isn't running or the model
isn't pulled yet, the app tells you exactly what to run.

## How it works

- `server.js` — a zero-dependency Node HTTP server. It serves the UI, exposes
  `GET /api/status` (is Ollama up? is the model pulled?), and `POST /api/build`,
  which streams the local model's response to the browser over Server-Sent
  Events. It talks to Ollama's local API at `http://localhost:11434`.
- `public/` — the browser app (`index.html`, `style.css`, `app.js`). It parses
  the stream, renders the markdown incrementally, and turns fenced code blocks
  into files you can copy or download.

Nothing leaves your machine — requests and generated code stay between the
Node server and your local Ollama instance.

## Configuration

All optional — set as environment variables before `npm start`:

| Variable         | Default                  | Purpose                                  |
| ---------------- | ------------------------ | ---------------------------------------- |
| `POLYGLOT_MODEL` | `qwen2.5-coder`          | Ollama model to use (must be pulled).    |
| `OLLAMA_URL`     | `http://localhost:11434` | Where Ollama is listening.               |
| `PORT`           | `3000`                   | Port the Polyglot server listens on.     |

Example — use a different model:

```bash
ollama pull llama3.1
POLYGLOT_MODEL=llama3.1 npm start
```

## Notes

- Output quality and speed depend on the local model and your hardware. Bigger
  models write better code but need more RAM/VRAM and run slower.
- The generated code runs on *your* machine — review it before running anything
  with side effects, same as any code you'd copy off the web.
