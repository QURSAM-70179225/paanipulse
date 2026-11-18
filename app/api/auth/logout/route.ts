import { relativeRedirect } from "@/lib/http/redirect";
import { endSession } from "@/lib/auth/session";

export async function POST() {
  await endSession();
  return relativeRedirect("/");
}
