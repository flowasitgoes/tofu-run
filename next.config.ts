import type { NextConfig } from "next";

/** 社群爬蟲：首頁改讀 public/index.html（僅 next.config rewrite，無 middleware）
 *  Next.js `has.value` 會包成 ^…$，須能匹配「整段」 UA，不能只寫 bot 名稱。 */
/** 社群預覽 + 主要搜尋／AI 爬蟲：首頁改讀輕量 public/index.html */
const CRAWLER_BOT_UA =
  ".*(facebookexternalhit|Facebot|meta-externalagent|Twitterbot|LinkedInBot|Slackbot|Discordbot|line-poker|Googlebot|GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|anthropic-ai|PerplexityBot|Bytespider|cohere-ai|Applebot).*";

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          has: [
            {
              type: "header",
              key: "user-agent",
              value: CRAWLER_BOT_UA,
            },
          ],
          destination: "/index.html",
        },
      ],
    };
  },
};

export default nextConfig;
