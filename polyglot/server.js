import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3000;
const MODEL = process.env.POLYGLOT_MODEL || "claude-opus-4-8";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// A single client, reused across requests. It resolves credentials from the
// environment (ANTHROPIC_API_KEY, or an `ant auth login` profile).
const client = new Anthropic();

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

app.post("/api/build", async (req, res) => {
  const prompt = (req.body?.prompt || "").toString().trim();
  const language = (req.body?.language || "auto").toString().trim();

  if (!prompt) {
    res.status(400).json({ error: "Describe what you want built." });
    return;
  }
  if (prompt.length > 20000) {
    res.status(400).json({ error: "That request is too long — trim it down a bit." });
    return;
  }

  // Server-Sent Events: stream tokens to the browser as they arrive.
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  res.flushHeaders?.();

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  let stream;
  try {
    stream = client.messages.stream({
      model: MODEL,
      max_tokens: 20000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      system: systemPrompt(language),
      messages: [{ role: "user", content: prompt }],
    });

    // Abort the upstream request if the browser goes away.
    req.on("close", () => stream?.abort?.());

    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        send("token", { text: chunk.delta.text });
      }
    }

    const finalMessage = await stream.finalMessage();
    if (finalMessage.stop_reason === "refusal") {
      send("error", {
        message:
          "The model declined this request. Try rephrasing, or ask for something else.",
      });
    } else {
      send("done", {
        model: finalMessage.model,
        stop_reason: finalMessage.stop_reason,
        output_tokens: finalMessage.usage?.output_tokens ?? null,
      });
    }
  } catch (err) {
    const message = describeError(err);
    // If headers/stream already started, deliver the error over SSE.
    send("error", { message });
    console.error("[/api/build]", err?.status || "", message);
  } finally {
    res.end();
  }
});

function describeError(err) {
  // Missing credentials throw the base error at call time (not a 401 response),
  // so match on the message before the typed-error checks below.
  if (/apiKey|authToken|authentication method/i.test(err?.message || "")) {
    return "No API key found. Set ANTHROPIC_API_KEY in the server environment (see the README).";
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return "Your API key was rejected. Check ANTHROPIC_API_KEY in the server environment.";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "Rate limited by the API. Wait a moment and try again.";
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return "Could not reach the Claude API. Check the server's network connection.";
  }
  if (err instanceof Anthropic.APIError) {
    return `API error${err.status ? ` (${err.status})` : ""}: ${err.message}`;
  }
  return err?.message || "Something went wrong while building.";
}

app.listen(PORT, () => {
  console.log(`\n  Polyglot is running → http://localhost:${PORT}`);
  console.log(`  Model: ${MODEL}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log(
      "\n  ⚠  ANTHROPIC_API_KEY is not set. Set it before building, e.g.:\n" +
        "     export ANTHROPIC_API_KEY=sk-ant-...\n"
    );
  }
});
