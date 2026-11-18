import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "PaaniPulse · پانی پلس",
    short_name: "PaaniPulse",
    description: "Solar tube-well water meter and Urdu irrigation advisor. سولر ٹیوب ویل کا پانی میٹر اور اردو مشیر۔",
    start_url: "/farmer",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#047857",
    lang: "ur",
    dir: "auto",
    categories: ["agriculture", "utilities", "weather"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Assistant · مددگار", url: "/farmer", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
