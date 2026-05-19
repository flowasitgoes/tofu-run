import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

const SOCIAL_CRAWLERS = [
  "facebookexternalhit",
  "Facebot",
  "meta-externalagent",
  "Twitterbot",
  "LinkedInBot",
  "Slackbot",
  "Discordbot",
  "Line",
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...SOCIAL_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
      })),
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
