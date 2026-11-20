/**
 * Crop varieties and ripening time.
 *
 * The variety is the name the farmer knows the seed by. We record it (it helps the installer, the extension officer and the
 * pilot), but we do NOT change the water calculation from the variety's name: we found no official, consolidated table of
 * per-variety growth durations and will not invent one. What can change the calculation is the farmer's **ripening time**:
 * "normal / I don't know" (the typical crop), "early" (shorter duration) or "late" (longer duration). That setting stretches
 * or shrinks the growth stages by 10%: a rough, labelled assumption, to be confirmed with extension officers.
 */
import type { CropType } from "./config";

export const MATURITY = ["normal", "early", "late"] as const;
export type Maturity = (typeof MATURITY)[number];

/** How much the four growth stages stretch or shrink. Rough assumption (about 12 days on a 120-day crop). */
export const MATURITY_SCALE: Record<Maturity, number> = { normal: 1, early: 0.9, late: 1.1 };

export const isMaturity = (x: unknown): x is Maturity => typeof x === "string" && (MATURITY as readonly string[]).includes(x);
export const maturityScale = (m: string | null | undefined): number => (isMaturity(m) ? MATURITY_SCALE[m] : 1);

/**
 * Varieties offered in the form, by crop. A starting list of names found in Punjab Agriculture Department, AARI and Punjab Seed
 * Council material: NOT complete and NOT a recommendation. Farmers can choose "Other" and type the name from the seed bag.
 * Ask an extension officer to review and extend this list.
 */
export const VARIETIES: Record<CropType, readonly string[]> = {
  wheat: ["Akbar-2019", "Anaj-2017", "Dilkash-2020", "Subhani-2021", "Galaxy-2013", "Faisalabad-2008", "Arooj-2022", "MH-2021"],
  rice: ["Super Basmati", "Basmati-515", "Basmati-385", "KSK-133", "KS-282", "IRRI-6", "NIAB IRRI-9", "PK-386"],
  maize: ["FH-1046", "FH-949", "FH-810", "YH-1898", "YH-5482", "YH-5568"],
  cotton: ["FH-416", "CEMB-AAS-3", "Nibji-19"],
  sugarcane: ["CPF-246", "CPF-247", "CPF-248"],
};

/** Form values for "I do not know" and "another variety". */
export const VARIETY_UNKNOWN = "";
export const VARIETY_OTHER = "__other__";

/** Letters, digits, spaces, hyphens, dots and slashes only, trimmed, at most 40 characters. Returns null for empty or unsafe text. */
export function cleanVariety(input: string | null | undefined): string | null {
  const t = (input ?? "").trim().replace(/\s+/g, " ");
  if (!t || t.length > 40) return null;
  return /^[A-Za-z0-9][A-Za-z0-9 .\-/]*$/.test(t) ? t : null;
}
