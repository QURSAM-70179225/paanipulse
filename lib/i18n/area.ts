import { areaNumber, type LandUnit } from "@/lib/engine/landUnits";
import type { DictKey } from "./dict";

export const UNIT_KEY: Record<LandUnit, DictKey> = {
  acre: "unitAcre",
  kanal: "unitKanal",
  marla: "unitMarla",
  murabba: "unitMurabba",
  ghumaon: "unitGhumaon",
};

/** "12.5 acre" / "100 kanal" / "اتنے مربع": the area in the unit the farmer uses. */
export const areaText = (acres: number, unit: LandUnit, T: (k: DictKey) => string): string => `${areaNumber(acres, unit)} ${T(UNIT_KEY[unit])}`;
