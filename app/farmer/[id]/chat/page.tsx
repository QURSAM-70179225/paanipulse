import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getFarmState } from "@/lib/services/farmState";
import { ChatView } from "@/components/chat/ChatView";
import { dirFor, isLang, t, type DictKey } from "@/lib/i18n/dict";
import { getLang } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Assistant · PaaniPulse" };

const time = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" });

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const farm = await prisma.farm.findUnique({ where: { id }, select: { language: true } });
  if (!farm) notFound();
  const lang = await getLang(isLang(farm.language) ? farm.language : "ur");
  const s = await getFarmState(id);
  if (!s) notFound();
  const T = (k: DictKey) => t(lang, k);
  const history = await prisma.chatMessage.findMany({ where: { farmId: id }, orderBy: { createdAt: "asc" }, take: 50 });

  return (
    <main dir={dirFor(lang)} className={cn("mx-auto max-w-md", lang === "ur" && "ur-ui")}>
      <ChatView
        farmId={id}
        lang={lang}
        advisory={{ ...s.advisory, time: "07:00" }}
        initial={history.map((m) => ({ id: m.id, role: m.role === "user" ? "user" : "assistant", content: m.content, time: time(m.createdAt) }))}
        labels={{
          assistantName: T("assistantName"),
          online: T("online"),
          typeMessage: T("typeMessage"),
          send: T("send"),
          dailyAdvisory: T("dailyAdvisory"),
          resetChat: T("resetChat"),
          aiOffline: T("aiOffline"),
          thinking: T("thinking"),
          backToFarm: T("backToFarm"),
          playVoice: T("playVoice"),
          stopVoice: T("stopVoice"),
          voiceUnavailable: T("voiceUnavailable"),
          quick: [T("quick1"), T("quick2"), "kal barish hogi?", "aaj kitne ghantay pump chalaun?", T("quick3"), T("quick4")],
        }}
      />
    </main>
  );
}
