/** A short name for a farm in lists and the switcher: the farmer's own name for it, else "district · crop (variety)". Pure. */
import { CROP_NAMES } from "./advisoryText";
import type { CropType } from "@/lib/engine";

export const MAX_FARMS_PER_ACCOUNT = 10;

/** Letters (any script, so Urdu works), digits, spaces and a few marks; 1–40 characters. Anything else is stored as "no name". */
export function cleanNickname(input: string | null | undefined): string | null {
  const t = (input ?? "").trim().replace(/\s+/g, " ");
  if (!t || t.length > 40) return null;
  return /^[\p{L}\p{N}][\p{L}\p{N} .\-/'()]*$/u.test(t) ? t : null;
}

export function farmLabel(f: { nickname: string | null; district: string; cropType: string; variety: string | null }, lang: "ur" | "en"): string {
  if (f.nickname) return f.nickname;
  const crop = CROP_NAMES[f.cropType as CropType]?.[lang] ?? f.cropType;
  return `${f.district} · ${crop}${f.variety ? ` (${f.variety})` : ""}`;
}
