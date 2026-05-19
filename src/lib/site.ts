/** 正式站自訂網域（OG / canonical 須與分享圖同網域，勿用 *.vercel.app） */
export const PRODUCTION_SITE_URL = "https://tofu-run.ifunlove.com";

/** 網站根網址（SEO、OG、sitemap） */
function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  if (process.env.VERCEL) {
    return PRODUCTION_SITE_URL;
  }

  return "http://localhost:3000";
}

export const siteConfig = {
  name: "豆花慢跑",
  nameEn: "Tofu Run",
  tagline: "一起完成屬於你的一碗豆花。",
  taglineEn: "When the Tofu Pudding is Running ...",
  location: "高雄中央公園",
  city: "高雄",
  country: "TW",
  locale: "zh_TW",
  url: getSiteUrl(),
  creator: "豆花慢跑",
  keywords: [
    "豆花慢跑",
    "Tofu Run",
    "高雄中央公園",
    "慢跑",
    "城市遊戲",
    "QR code 活動",
    "豆花",
    "團體慢跑",
    "city walk",
    "高雄活動",
  ],
  description:
    "豆花慢跑（Tofu Run）是高雄中央公園的城市團體加油慢跑遊戲。掃描 QR 加入、選擇豆花配料、到公園各區掃描 Token，收集你的豆花護照——跑、跑、跑，享用你們拾取的豆花。",
  shortDescription:
    "高雄中央公園的城市慢跑遊戲。掃 QR 加入、選豆花、收集 Token 與豆花護照。",
  /** Open Graph / Twitter / LINE 橫式分享圖（1200×630） */
  ogImage: "/1200x630.jpg",
  ogImageAlt:
    "豆花慢跑 Tofu Run 宣傳圖：芋圓、粉圓、花生、綠豆、紅豆配料圖示與「慢跑 RUN」字樣，高雄中央公園團體慢跑活動",
  /** 網站圖示 / PWA / 加入主畫面（1080×1080 等僅放 public/，不寫入 og:image） */
  icons: {
    favicon32: "/32x32.jpg",
    favicon64: "/64x64.jpg",
    android192: "/192x192.jpg",
    pwa512: "/512x512.jpg",
  },
  appIcon: "/512x512.jpg",
  appIconAlt:
    "豆花慢跑 Tofu Run 吉祥物：豆花星球居民跑步圖示",
  /** 活動日前先隱藏 LIVE 入口（Nav、護照、首頁） */
  showLiveEntry: false,
} as const;

export function absoluteUrl(path = ""): string {
  const base = siteConfig.url.replace(/\/$/, "");
  if (!path) return `${base}/`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

/** 分享用大圖（與 og:url 同網域） */
export function getShareOgImageUrl(): string {
  return absoluteUrl(siteConfig.ogImage);
}
