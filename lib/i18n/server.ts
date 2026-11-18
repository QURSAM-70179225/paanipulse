import "server-only";
import { cookies } from "next/headers";
import { isLang, LANG_COOKIE, type Lang } from "./dict";

/** Language from the user's cookie, else the given fallback (e.g. the farm's preferred language). */
export async function getLang(fallback: Lang = "en"): Promise<Lang> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(v) ? v : fallback;
}
