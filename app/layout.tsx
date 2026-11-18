import type { Metadata, Viewport } from "next";
import "@fontsource/noto-nastaliq-urdu/400.css";
import "@fontsource/noto-nastaliq-urdu/700.css";
import "./globals.css";
import { getLang } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "PaaniPulse",
  description: "A virtual water and energy meter for solar tube wells — no extra hardware.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#047857",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const lang = await getLang("en");
  return (
    <html lang={lang}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
