import type { Metadata, Viewport } from "next";
import "@fontsource/noto-nastaliq-urdu/400.css";
import "@fontsource/noto-nastaliq-urdu/700.css";
import "./globals.css";
import { getLang } from "@/lib/i18n/server";
import { dictFor, dirFor, type Lang } from "@/lib/i18n/dict";
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

const listenLabels = (l: Lang) => {
  const x = dictFor(l);
  return { start: x.listenStart, stop: x.listenStop, hint: x.listenHint, voice: x.listenVoice, unavailable: x.voiceUnavailable };
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const lang = await getLang("en");
  const d = dictFor(lang);
  return (
    <html lang={lang}>
      <body className="min-h-screen antialiased">
        {children}
        <ListenMode labels={{ ur: listenLabels("ur"), en: listenLabels("en") }} />
        <InstallPrompt
          dir={dirFor(lang)}
          labels={{ title: d.installTitle, body: d.installBody, install: d.installButton, later: d.installLater, iosBody: d.installIosBody, installed: d.installed }}
        />
      </body>
    </html>
  );
}
