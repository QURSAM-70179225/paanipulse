import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { dropRepeatedSentences } from "@/lib/services/llm";

describe("dropRepeatedSentences", () => {
  it("removes an answer the model wrote twice", () => {
    expect(dropRepeatedSentences("Keep the pump off today; the soil has enough moisture.Keep the pump off today; the soil has enough moisture.")).toBe(
      "Keep the pump off today; the soil has enough moisture.",
    );
    expect(dropRepeatedSentences("آج پمپ بند رکھیں۔ آج پمپ بند رکھیں۔")).toBe("آج پمپ بند رکھیں۔");
  });

  it("keeps different sentences and decimals", () => {
    expect(dropRepeatedSentences("Run the pump 3.5 hours. Rain is not expected.")).toBe("Run the pump 3.5 hours. Rain is not expected.");
  });
});
