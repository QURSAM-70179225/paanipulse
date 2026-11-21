/**
 * The PaaniPulse team's phone and WhatsApp numbers, shown to a farmer who has no probe or pump box yet so he can ask for help.
 * Set SUPPORT_PHONE and (optionally) SUPPORT_WHATSAPP on the server, in any common Pakistani form: 0300-1234567, 03001234567,
 * +92 300 1234567. If SUPPORT_WHATSAPP is not set, the phone number is used for WhatsApp too. Nothing is shown when neither is set.
 */
import "server-only";
import { toInternational } from "./phone";

export interface SupportContact { tel: string | null; whatsapp: string | null; display: string | null }

export function supportContact(): SupportContact {
  const phone = toInternational(process.env.SUPPORT_PHONE);
  const wa = toInternational(process.env.SUPPORT_WHATSAPP) ?? phone;
  const display = process.env.SUPPORT_PHONE?.trim() || process.env.SUPPORT_WHATSAPP?.trim() || null;
  return { tel: phone ? `+${phone}` : null, whatsapp: wa, display };
}
