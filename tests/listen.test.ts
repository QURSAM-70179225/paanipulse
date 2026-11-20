import { describe, expect, it } from "vitest";
import { dictFor, isFixedString, translateFixed } from "@/lib/i18n/dict";
import { langOf } from "@/lib/speech";

describe("listen mode helpers", () => {
  const en = dictFor("en");
  const ur = dictFor("ur");

  it("translates fixed UI strings both ways, ignoring extra whitespace", () => {
    expect(translateFixed(en.listenHint, "ur")).toBe(ur.listenHint);
    expect(translateFixed(ur.backToFarm, "en")).toBe(en.backToFarm);
    expect(translateFixed(`  ${en.backToFarm}\n`, "ur")).toBe(ur.backToFarm);
  });

  it("does not treat filled or arbitrary text as a fixed string", () => {
    expect(translateFixed("Run the pump 3 hours today", "ur")).toBeNull();
    expect(isFixedString("hello there, anything at all")).toBe(false);
    expect(isFixedString(ur.listenStart)).toBe(true);
  });

  it("detects Urdu vs English by script", () => {
    expect(langOf(ur.listenStart)).toBe("ur");
    expect(langOf("Keep the pump off today")).toBe("en");
    expect(langOf("پمپ 3 گھنٹے چلائیں")).toBe("ur");
  });
});
