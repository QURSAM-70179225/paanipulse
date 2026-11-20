import type { Metadata, Viewport } from "next";
import "@fontsource/noto-nastaliq-urdu/400.css";
import "@fontsource/noto-nastaliq-urdu/700.css";
import "./globals.css";
import { getLang } from "@/lib/i18n/server";
import { dictFor, dirFor } from "@/lib/i18n/dict";
import { InstallPrompt } from "@/components/InstallPrompt";
import { ListenMode } from "@/components/ListenMode";

export const metadata: Metadata = {
  title: "PaaniPulse",
  description: "A virtual water and energy meter for solar tube wells — no extra hardware.",
  applicationName: "PaaniPulse",
  appleWebApp: { capable: true, title: "PaaniPulse", statusBarStyle: "default" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#047857",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const lang = await getLang("en");
  const d = dictFor(lang);
  return (
    <html lang={lang}>
      <body className="min-h-screen antialiased">
        {children}
        <ListenMode
          lang={lang}
          labels={{ start: d.listenStart, stop: d.listenStop, hint: d.listenHint, voice: d.listenVoice, unavailable: d.voiceUnavailable }}
        />
        <InstallPrompt
          dir={dirFor(lang)}
          labels={{ title: d.installTitle, body: d.installBody, install: d.installButton, later: d.installLater, iosBody: d.installIosBody, installed: d.installed }}
        />
      </body>
    </html>
  );
}
