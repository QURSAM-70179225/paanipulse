import { describe, expect, it } from "vitest";
import { homeFor, normalisePhone, signSession, verifySession } from "@/lib/auth/token";

process.env.AUTH_SECRET = "test-secret-at-least-16-chars";

describe("auth", () => {
  it("normalises Pakistani mobile numbers", () => {
    expect(normalisePhone("0300 1234567")).toBe("03001234567");
    expect(normalisePhone("+92 300 1234567")).toBe("03001234567");
    expect(normalisePhone("0092-300-1234567")).toBe("03001234567");
    expect(normalisePhone("3001234567")).toBe("03001234567");
    expect(normalisePhone("042 1234567")).toBeNull();
    expect(normalisePhone("12345")).toBeNull();
  });
  it("signs and verifies sessions; rejects tampered tokens", async () => {
    const token = await signSession({ id: "u1", role: "FARMER", name: "Karamat" });
    expect(await verifySession(token)).toEqual({ id: "u1", role: "FARMER", name: "Karamat" });
    expect(await verifySession(token.slice(0, -2) + "xx")).toBeNull();
    expect(await verifySession(undefined)).toBeNull();
  });
  it("routes each role to its home", () => {
    expect(homeFor("FARMER")).toBe("/farmer");
    expect(homeFor("INSTALLER")).toBe("/installer");
    expect(homeFor("AUTHORITY")).toBe("/authority");
  });
});
