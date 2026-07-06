# Polyglot 🛠️

An app that knows every programming language. Describe what you want in plain
English, pick a language (or leave it on **Auto**), and Polyglot builds it —
streaming complete, runnable code back to you, with copy and download buttons
for every file.

It's a small full-stack app: a Node/Express server that talks to the Claude API,
and a dependency-free browser UI. No build step.

## What it does

- **Any language** — Python, JavaScript, TypeScript, Go, Rust, Java, C/C++, Ruby,
  and more. Or **Auto**, where Polyglot picks the best language for the task.
- **You describe, it builds** — "a CLI to-do app that saves tasks to JSON",
  "a REST API for a bookshelf", "Conway's Game of Life in the terminal".
- **Streaming output** — code appears token-by-token as it's written.
- **Real files** — each file gets its own block with **Copy** and **Download**.

## Requirements

- Node.js 20 or newer
- An Anthropic API key

## Setup

```bash
cd polyglot
npm install
export ANTHROPIC_API_KEY=sk-ant-...   # your key
npm start
```

Then open **http://localhost:3000**.

> No API key handy? The server also picks up credentials from an
> `ant auth login` profile if you use the Anthropic CLI.

## How it works

- `server.js` — Express server. Serves the UI and exposes `POST /api/build`,
  which streams the model's response to the browser over Server-Sent Events.
  It uses the official `@anthropic-ai/sdk` with adaptive thinking and `high`
  effort, and defaults to the `claude-opus-4-8` model.
- `public/` — the browser app (`index.html`, `style.css`, `app.js`). It parses
  the SSE stream, renders the markdown incrementally, and turns fenced code
  blocks into files you can copy or download.

## Configuration

| Variable            | Default            | Purpose                         |
| ------------------- | ------------------ | ------------------------------- |
| `ANTHROPIC_API_KEY` | —                  | Required. Your Anthropic key.   |
| `PORT`              | `3000`             | Port the server listens on.     |
| `POLYGLOT_MODEL`    | `claude-opus-4-8`  | Model used to generate code.    |

## Notes

- The generated code runs on *your* machine, not the server — review it before
  running anything with side effects, same as any code you'd copy off the web.
- Requests and generated code are sent to the Claude API for processing.
