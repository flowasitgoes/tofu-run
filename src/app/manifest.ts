import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.shortDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#fff8f0",
    theme_color: "#fff8f0",
    lang: "zh-Hant",
    icons: [
      {
        src: siteConfig.appIcons["192"],
        sizes: "192x192",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: siteConfig.appIcons["512"],
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: siteConfig.appIcons["512"],
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "maskable",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
