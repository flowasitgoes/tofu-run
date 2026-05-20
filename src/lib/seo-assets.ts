/**
 * 對外 SEO／分享用靜態圖（public/）— 路徑、尺寸、alt 集中維護
 */
export const seoAssets = {
  og: {
    path: "/og.png",
    width: 1200,
    height: 630,
    mimeType: "image/png" as const,
    alt: "豆花慢跑 Tofu Run 分享圖：慢跑 RUN 橫幅、跑步豆花角色，花生・粉圓・芋圓・綠豆・紅豆配料圖示，高雄中央公園團體慢跑活動",
  },
  icons: [
    {
      path: "/32x32.jpg",
      sizes: "32x32",
      width: 32,
      height: 32,
      mimeType: "image/jpeg" as const,
      alt: "豆花慢跑 favicon：豆花星球居民跑步小圖示",
    },
    {
      path: "/64x64.jpg",
      sizes: "64x64",
      width: 64,
      height: 64,
      mimeType: "image/jpeg" as const,
      alt: "豆花慢跑 favicon 64×64：豆花星球居民跑步",
    },
    {
      path: "/192x192.jpg",
      sizes: "192x192",
      width: 192,
      height: 192,
      mimeType: "image/jpeg" as const,
      alt: "豆花慢跑 App 圖示 192×192：豆花星球居民跑步",
    },
    {
      path: "/512x512.jpg",
      sizes: "512x512",
      width: 512,
      height: 512,
      mimeType: "image/jpeg" as const,
      alt: "豆花慢跑 App 圖示 512×512：豆花星球居民跑步",
    },
  ],
  /** Next.js app/icon.svg（向量備援） */
  vectorIcon: {
    path: "/icon.svg",
    mimeType: "image/svg+xml" as const,
    alt: "豆花慢跑 🥣 網站圖示",
  },
} as const;

export type SeoIconAsset = (typeof seoAssets.icons)[number];
