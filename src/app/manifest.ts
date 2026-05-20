import type { MetadataRoute } from "next";
import { seoAssets } from "@/lib/seo-assets";
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
      ...seoAssets.icons.map((icon) => ({
        src: icon.path,
        sizes: icon.sizes,
        type: icon.mimeType,
        purpose: "any" as const,
      })),
      {
        src: seoAssets.icons[3].path,
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "maskable",
      },
      {
        src: seoAssets.vectorIcon.path,
        sizes: "any",
        type: seoAssets.vectorIcon.mimeType,
        purpose: "any",
      },
    ],
  };
}
