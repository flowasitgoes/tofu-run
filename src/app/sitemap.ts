import type { MetadataRoute } from "next";
import { absoluteSeoUrl } from "@/lib/seo-content";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: absoluteSeoUrl("/"),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteSeoUrl("/lobby"),
      lastModified,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: absoluteSeoUrl("/passport"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: absoluteSeoUrl("/join"),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: absoluteSeoUrl("/live"),
      lastModified,
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];
}
