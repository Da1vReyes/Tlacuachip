// Thin OpenRouter client. The API key only ever lives here, server-side.
// Everything sent to the model goes through privacy.js first.

import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// deepseek-chat-v3.1 (not the "-flash" reasoning variant): consistently
// ~2s and a fraction of a cent per call in testing, which is what these
// routes need — deepseek-v4-flash defaults to a chain-of-thought pass that
// occasionally pushed latency past 20s even with reasoning disabled.
const DEFAULT_MODEL = "deepseek/deepseek-chat-v3.1";
const TIMEOUT_MS = 25000;
const execFileAsync = promisify(execFile);

export function llmStatus() {
  const configured = Boolean(process.env.OPENROUTER_API_KEY);
  return { configured, model: configured ? process.env.OPENROUTER_MODEL || DEFAULT_MODEL : null };
}

export class LlmUnavailable extends Error {
  constructor(message) {
    super(message);
    this.name = "LlmUnavailable";
  }
}

export async function chatJson({ system, user, temperature = 0.3 }) {
  const { configured, model } = llmStatus();
  if (!configured) throw new LlmUnavailable("OPENROUTER_API_KEY is not set");

  const body = JSON.stringify({
    model,
    temperature,
    // Fast, bounded reasoning is enough for a short market reading. This
    // prevents a hidden long chain-of-thought token bill.
    reasoning: { enabled: false },
    // Reports and match explanations are intentionally short. Without a
    // cap, a provider may reserve a large default completion and turn a
    // 3-sentence read into a 25-second request.
    max_tokens: 500,
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
  });

  try {
    let json;
    try {
      json = await requestWithFetch(body);
    } catch (err) {
      // This desktop network permits curl but its Node fetch path can fail
      // before leaving the machine. Retry once without putting the API key
      // in command-line arguments or browser code.
      if (err instanceof LlmUnavailable) throw err;
      console.warn("[ai] fetch transport failed; retrying via curl:", err.message);
      json = await requestWithCurl(body);
    }
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new LlmUnavailable("OpenRouter returned no content");

    return { model: json.model || model, data: extractJson(content) };
  } catch (err) {
    if (err instanceof LlmUnavailable) throw err;
    throw new LlmUnavailable(err?.name === "AbortError" ? "OpenRouter timed out" : err?.message || "OpenRouter request failed");
  }
}

async function requestWithFetch(body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_REFERER || "http://localhost",
        "X-Title": "Tlacuachic",
      },
      body,
      signal: controller.signal,
    });
    if (!res.ok) throw new LlmUnavailable(`OpenRouter ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
    return res.json();
  } finally { clearTimeout(timeout); }
}

function curlQuote(value) { return `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`; }

async function requestWithCurl(body) {
  const dir = await mkdtemp(join(tmpdir(), "tlacuachic-openrouter-"));
  const payloadPath = join(dir, "payload.json");
  const configPath = join(dir, "request.conf");
  try {
    await writeFile(payloadPath, body, { mode: 0o600 });
    const headers = [
      `Authorization: Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type: application/json",
      `HTTP-Referer: ${process.env.OPENROUTER_REFERER || "http://localhost"}`,
      "X-Title: Tlacuachic",
    ];
    await writeFile(configPath, [
      `url = ${curlQuote(OPENROUTER_URL)}`,
      'request = "POST"',
      "silent",
      "show-error",
      "fail-with-body",
      `max-time = ${Math.ceil(TIMEOUT_MS / 1000)}`,
      ...headers.map((header) => `header = ${curlQuote(header)}`),
      `data-binary = ${curlQuote(`@${payloadPath}`)}`,
    ].join("\n"), { mode: 0o600 });
    const { stdout } = await execFileAsync("curl", ["--config", configPath], { maxBuffer: 1024 * 1024, timeout: TIMEOUT_MS + 2000 });
    return JSON.parse(stdout);
  } catch (err) {
    const message = typeof err?.stderr === "string" ? err.stderr.slice(0, 240) : err?.message;
    throw new LlmUnavailable(`OpenRouter curl fallback failed: ${message}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Models sometimes wrap JSON in prose or code fences. Pull out the first
// balanced object rather than trusting the whole string.
function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new LlmUnavailable("Model response was not JSON");
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    throw new LlmUnavailable("Model response was not valid JSON");
  }
}
