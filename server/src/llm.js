// Thin OpenRouter client. The API key only ever lives here, server-side.
// Everything sent to the model goes through privacy.js first.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";
const TIMEOUT_MS = 25000;

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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_REFERER || "http://localhost",
        "X-Title": "Tlacuachip",
      },
      body: JSON.stringify({
        model,
        temperature,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new LlmUnavailable(`OpenRouter ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new LlmUnavailable("OpenRouter returned no content");

    return { model: json.model || model, data: extractJson(content) };
  } catch (err) {
    if (err instanceof LlmUnavailable) throw err;
    throw new LlmUnavailable(err.name === "AbortError" ? "OpenRouter timed out" : err.message);
  } finally {
    clearTimeout(timeout);
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
