import type { NextConfig } from "next";

/** 社群分享爬蟲：改讀 public/index.html（與 middleware 並存，對齊 440c71c） */
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
