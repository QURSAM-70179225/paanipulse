import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { GUIDE, GUIDE_TOPICS, GUIDE_VOICE, matchGuideTopic } from "@/lib/services/appGuide";
import { detectIntent, guideTopicFor, runTool, TOOL_DEFS } from "@/lib/services/chatTools";
import type { FarmState } from "@/lib/services/farmState";

const empty = {} as unknown as FarmState;

describe("app guide content", () => {
  it("has all three languages for every topic", () => {
    for (const t of GUIDE_TOPICS) {
      for (const k of ["en", "roman", "ur"] as const) {
        expect(GUIDE[t].title[k].length).toBeGreaterThan(2);
        expect(GUIDE[t].how[k].length).toBeGreaterThan(20);
      }
    }
  });
  it("keeps the Urdu voice note short enough for the neural voice (limit 1,500)", () => {
    expect(GUIDE_VOICE.ur.length).toBeLessThanOrEqual(1500);
  });
  it("never promises what the app does not do", () => {
    const all = JSON.stringify(GUIDE) + JSON.stringify(GUIDE_VOICE);
    expect(all).not.toMatch(/guarantee|automatic(ally)? (irrigat|water)/i);
  });
  it("matches topics in English, Roman Urdu and Urdu", () => {
    expect(matchGuideTopic("what is the soil probe")).toBe("probe");
    expect(matchGuideTopic("probe kaise jorun bluetooth")).toBe("probe");
    expect(matchGuideTopic("کھاد کیسے ڈالوں")).toBe("fertiliser");
    expect(matchGuideTopic("how do I add a farm")).toBe("farms");
    expect(matchGuideTopic("how do I use the pump timer")).toBe("timer");
    expect(matchGuideTopic("can I stop the pump from my phone")).toBe("pumpcontrol");
    expect(matchGuideTopic("mein pump ko phone se band kar sakta hoon?")).toBe("pumpcontrol");
    expect(matchGuideTopic("کیا میں فون سے پمپ بند کر سکتا ہوں")).toBe("pumpcontrol");
  });
});

describe("assistant answers about app features", () => {
  it("routes how-to questions to the guide, but data questions stay data questions", () => {
    expect(detectIntent("how do I use this app?")).toBe("guide");
    expect(detectIntent("app kaise istemal karun")).toBe("guide");
    expect(detectIntent("ایپ کیسے استعمال کروں؟")).toBe("guide");
    expect(detectIntent("what is the soil probe?")).toBe("guide");
    expect(detectIntent("kal barish hogi?")).toBe("weather");
    expect(detectIntent("aaj kitne ghantay pump chalaun?")).toBe("advice");
    expect(detectIntent("fazil bijli se kya kamaun?")).toBe("savings");
    expect(detectIntent("Will it rain tomorrow?")).toBe("weather");
    expect(guideTopicFor("how much water did I waste this week")).toBeNull();
  });
  it("offers the getAppGuide tool and returns one topic or the overview", () => {
    expect(TOOL_DEFS.map((t) => t.function.name)).toContain("getAppGuide");
    const one = runTool("getAppGuide", empty, { topic: "probe" }) as { topic: string; howToUse: { en: string } };
    expect(one.topic).toBe("probe");
    expect(one.howToUse.en).toContain("probe");
    const all = runTool("getAppGuide", empty, {}) as { overview: unknown; topics: unknown[] };
    expect(all.overview).toBe(GUIDE_VOICE);
    expect(all.topics).toHaveLength(GUIDE_TOPICS.length);
    expect(runTool("getAppGuide", empty, { topic: "nonsense" })).toHaveProperty("overview");
  });
});
