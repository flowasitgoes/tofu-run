import type { NextConfig } from "next";

/** 社群爬蟲：首頁改讀 public/index.html（僅 next.config rewrite，無 middleware）
 *  Next.js `has.value` 會包成 ^…$，須能匹配「整段」 UA，不能只寫 bot 名稱。 */
const SOCIAL_BOT_UA =
  ".*(facebookexternalhit|Facebot|meta-externalagent|Twitterbot|LinkedInBot|Slackbot|Discordbot|line-poker).*";

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
              value: SOCIAL_BOT_UA,
            },
          ],
          destination: "/index.html",
        },
      ],
    };
  },
};

export default nextConfig;
