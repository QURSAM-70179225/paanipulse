import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { badRequest, notFound, serverError } from "@/lib/api/http";
import { getFarmState } from "@/lib/services/farmState";
import { CROP_NAMES } from "@/lib/services/advisoryText";
import { detectScript, fallbackAnswer, runTool, TOOL_DEFS, type Script } from "@/lib/services/chatTools";
import { chatWithTools, groqFallbackModel, llmConfigured, numbersGrounded, RateLimitError, type ChatMsg } from "@/lib/services/llm";

export const dynamic = "force-dynamic";
// Groq tool rounds can take several seconds; allow up to 60 s on Vercel.
export const maxDuration = 60;

const Body = z.object({ farmId: z.string().min(1).max(64), message: z.string().trim().min(1).max(500) });

const SCRIPT_RULE: Record<Script, string> = {
  ur: "Write your whole reply in Urdu script (اردو). Do not use Latin letters except units like mm.",
  roman: "Write your whole reply in Roman Urdu (Urdu written in Latin letters, like 'Aaj pump band rakhein'). Do NOT use Urdu script and do NOT reply in English.",
  en: "Write your whole reply in simple English.",
};

function systemPrompt(farmerName: string, crop: string, district: string, script: Script) {
  return [
    `You are "PaaniPulse Madadgar", a friendly irrigation assistant for ${farmerName}, a farmer in ${district}, Punjab, Pakistan, growing ${crop} with a solar tube well.`,
    "RULES:",
    "1. Before stating ANY number (hours, litres, mm of rain, kWh, rupees, kg, days), call a tool and use the number exactly as the tool returns it. Never calculate or invent numbers.",
    "2. If the tools do not answer the question, say you don't know (Urdu: 'mujhe is ka ilm nahi' / 'مجھے اس کا علم نہیں').",
    `3. LANGUAGE: ${SCRIPT_RULE[script]}`,
    "4. Use very simple words and at most 3 short sentences. No markdown, no lists, no tables, no emojis.",
    "5. When the decision is keep-off or skip-rain, say clearly to keep the pump off (e.g. 'pump band rakhein') — never say 'run the pump 0 hours'. Prefer the tool's ready-made 'instruction' text.",
    "6. Fertiliser savings and earnings are estimates — say 'about' / 'taqreeban' / 'تقریباً'. Give no guarantees about yield, income, loans or health.",
    "7. You only discuss this farm's irrigation, weather, water, solar energy, income from spare solar and fertiliser. For ANY other topic (cricket, politics, news, health, loans...) reply only with the refusal sentence for the language required by rule 3 — English: 'Sorry, I can only help with your pump, water, weather and solar.' Roman Urdu: 'Maaf kijiye, main sirf pump, pani, mausam aur solar ke baare mein madad kar sakta hoon.' Urdu: 'معاف کیجیے، میں صرف پمپ، پانی، موسم اور سولر کے بارے میں مدد کر سکتا ہوں۔' Never repeat an earlier answer for a new question.",
    "8. Money is Pakistani rupees: write 'Rs' (English), 'rupay' (Roman Urdu) or 'روپے' (Urdu). Never use ₹ or INR.",
    "9. Never add, multiply or combine numbers from different fields. 'today' and 'this week' numbers are different facts.",
  ].join("\n");
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  const { farmId, message } = parsed.data;

  try {
    const state = await getFarmState(farmId);
    if (!state) return notFound("Farm not found");
    const history = await prisma.chatMessage.findMany({ where: { farmId }, orderBy: { createdAt: "desc" }, take: 4 });
    await prisma.chatMessage.create({ data: { farmId, role: "user", content: message } });

    const encoder = new TextEncoder();
    const useLlm = llmConfigured();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let text = "";
        let sent = false;
        const push = (t: string) => {
          sent = true;
          text += t;
          controller.enqueue(encoder.encode(t));
        };
        if (useLlm) {
          const script = detectScript(message);
          const crop = CROP_NAMES[state.farm.crop].en;
          const messages: ChatMsg[] = [
            { role: "system", content: systemPrompt(state.farm.farmerName, crop, state.farm.district, script) },
            ...history.reverse().map((m) => ({ role: m.role === "assistant" ? ("assistant" as const) : ("user" as const), content: m.content })),
            { role: "user", content: message },
          ];
          const attempt = (model?: string) =>
            chatWithTools({ messages, tools: TOOL_DEFS, runTool: (name) => runTool(name, state), model, signal: AbortSignal.timeout(25_000) });
          try {
            let out;
            try {
              out = await attempt();
            } catch (err) {
              if (!(err instanceof RateLimitError)) throw err;
              out = await attempt(groqFallbackModel());
            }
            // Guardrail: buffer the answer and only send it if every number came from a tool.
            const check = numbersGrounded(out.text, [...out.toolOutputs, message]);
            if (out.text.trim() && check.ok) {
              push(out.text.trim());
            } else if (!check.ok) {
              console.warn("Ungrounded numbers in LLM answer, using rule-based answer:", check.ungrounded);
            }
          } catch (err) {
            console.error("LLM failed, using fallback:", err);
          }
        }
        if (!sent || !text.trim()) push(fallbackAnswer(message, state));
        await prisma.chatMessage.create({ data: { farmId, role: "assistant", content: text.trim() } }).catch(() => {});
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Chat-Mode": useLlm ? "ai" : "fallback" },
    });
  } catch (err) {
    return serverError(err);
  }
}

const DelQuery = z.object({ farmId: z.string().min(1).max(64) });

/** Clears the chat history for a farm (demo reset). */
export async function DELETE(req: Request) {
  const parsed = DelQuery.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return badRequest(parsed.error);
  await prisma.chatMessage.deleteMany({ where: { farmId: parsed.data.farmId } });
  return NextResponse.json({ ok: true });
}
