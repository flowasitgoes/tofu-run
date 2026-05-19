import type { NextConfig } from "next";

/** 社群分享爬蟲：改讀 public/index.html（靜態 OG meta） */
const SOCIAL_BOT_UA =
  "(facebookexternalhit|Facebot|meta-externalagent|Twitterbot|LinkedInBot|Slackbot|Discordbot|Line)";

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
