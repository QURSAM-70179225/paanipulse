/** Groq (OpenAI-compatible) chat with tool calling and streaming. Server-only. */
import "server-only";

export const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
export const groqModel = () => process.env.GROQ_MODEL || "openai/gpt-oss-120b";
/** Smaller model used once if the main one is rate-limited (Groq free tier: tokens-per-minute caps). */
export const groqFallbackModel = () => process.env.GROQ_FALLBACK_MODEL || "openai/gpt-oss-20b";

export class RateLimitError extends Error {}
export const llmConfigured = () => !!process.env.GROQ_API_KEY;

export type ChatMsg =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

/**
 * Runs the tool loop. Content tokens are passed to `onToken` as they stream in.
 * Returns the final text plus every tool output (for number validation).
 * Throws on HTTP/network errors (caller falls back); RateLimitError on HTTP 429.
 */
export async function chatWithTools(opts: {
  messages: ChatMsg[];
  tools: unknown[];
  runTool: (name: string, args: unknown) => unknown;
  onToken?: (t: string) => void;
  model?: string;
  maxRounds?: number;
  signal?: AbortSignal;
}): Promise<{ text: string; toolOutputs: string[] }> {
  const messages = [...opts.messages];
  const toolOutputs: string[] = [];
  let finalText = "";
  for (let round = 0; round < (opts.maxRounds ?? 4); round++) {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: opts.model ?? groqModel(),
        messages,
        tools: opts.tools,
        tool_choice: "auto",
        temperature: 0.2,
        max_completion_tokens: 600,
        reasoning_effort: "low",
        stream: true,
      }),
      signal: opts.signal,
    });
    if (res.status === 429) throw new RateLimitError(`Groq rate limit: ${(await res.text().catch(() => "")).slice(0, 160)}`);
    if (!res.ok || !res.body) throw new Error(`Groq HTTP ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);

    const calls: ToolCall[] = [];
    let content = "";
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const l = line.trim();
        if (!l.startsWith("data:")) continue;
        const data = l.slice(5).trim();
        if (data === "[DONE]") continue;
        let json: { choices?: { delta?: { content?: string; tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[] } }[] };
        try {
          json = JSON.parse(data);
        } catch {
          continue;
        }
        const delta = json.choices?.[0]?.delta;
        if (!delta) continue;
        if (delta.content) {
          content += delta.content;
          opts.onToken?.(delta.content);
        }
        for (const tc of delta.tool_calls ?? []) {
          const c = (calls[tc.index] ??= { id: "", type: "function", function: { name: "", arguments: "" } });
          if (tc.id) c.id = tc.id;
          if (tc.function?.name) c.function.name += tc.function.name;
          if (tc.function?.arguments) c.function.arguments += tc.function.arguments;
        }
      }
    }
    // Only the last round's text is the answer; text emitted before tool calls is a draft.
    finalText = content;
    const real = calls.filter(Boolean);
    if (real.length === 0) return { text: finalText, toolOutputs };
    messages.push({ role: "assistant", content: content || null, tool_calls: real });
    for (const c of real) {
      let args: unknown = {};
      try {
        args = c.function.arguments ? JSON.parse(c.function.arguments) : {};
      } catch {
        /* ignore malformed args — our tools take none */
      }
      const out = JSON.stringify(opts.runTool(c.function.name, args));
      toolOutputs.push(out);
      messages.push({ role: "tool", tool_call_id: c.id, content: out });
    }
  }
  return { text: finalText, toolOutputs };
}

/**
 * Drops a sentence that repeats the one right before it. The model sometimes writes its answer twice, glued
 * together ("Keep the pump off today.Keep the pump off today.").
 */
export function dropRepeatedSentences(text: string): string {
  // Split after sentence-ending punctuation, but not inside a number like 3.5.
  const parts = text.split(/(?<=[.!?۔؟])(?!\d)/);
  const out: string[] = [];
  for (const p of parts) {
    const key = p.trim().toLowerCase();
    if (!key) continue;
    if (out.length && out[out.length - 1].trim().toLowerCase() === key) continue;
    out.push(p);
  }
  return out.join("").trim();
}

/** All numbers in a text (commas stripped). */
export function numbersIn(text: string): number[] {
  return (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => Number(n.replace(/,/g, ""))).filter((n) => Number.isFinite(n));
}

/**
 * Guardrail: every number in the answer must appear in a tool output or the user's message
 * (exactly, or after rounding to 0/1 decimals). Small counts 0–10 are allowed (e.g. "3 ideas").
 */
export function numbersGrounded(answer: string, sources: string[]): { ok: boolean; ungrounded: number[] } {
  const allowed = new Set<string>();
  for (const src of sources) for (const n of numbersIn(src)) {
    allowed.add(String(n));
    allowed.add(String(Math.round(n)));
    allowed.add(String(Math.round(n * 10) / 10));
  }
  const ungrounded = numbersIn(answer).filter((n) => !(Number.isInteger(n) && n >= 0 && n <= 10) && !allowed.has(String(n)));
  return { ok: ungrounded.length === 0, ungrounded };
}
