import type { MetadataRoute } from "next";
import { absoluteSeoUrl } from "@/lib/seo-content";
import { absoluteUrl } from "@/lib/site";

/** 社群預覽爬蟲 */
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

/** 搜尋與 AI 助理爬蟲（明確允許，利於 Google / ChatGPT / Claude / Gemini 等收錄） */
const SEARCH_AND_AI_CRAWLERS = [
  "Googlebot",
  "Googlebot-Image",
  "Google-Extended",
  "Bingbot",
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "anthropic-ai",
  "PerplexityBot",
  "Bytespider",
  "cohere-ai",
  "Applebot",
  "Applebot-Extended",
  "CCBot",
] as const;

export default function robots(): MetadataRoute.Robots {
  const allowPublic = { allow: "/" as const };

  return {
    rules: [
      ...SOCIAL_CRAWLERS.map((userAgent) => ({
        userAgent,
        ...allowPublic,
      })),
      ...SEARCH_AND_AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        ...allowPublic,
        disallow: ["/admin", "/api/"],
      })),
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: new URL(absoluteSeoUrl("/")).host,
  };
}
