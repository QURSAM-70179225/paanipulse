/** "0300-1234567" → "923001234567" (digits with Pakistan's country code), or null if it does not look like a phone number. Pure. */
export function toInternational(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("0092")) d = d.slice(2);
  else if (d.startsWith("0")) d = `92${d.slice(1)}`;
  return d.length >= 11 && d.length <= 15 ? d : null;
}
