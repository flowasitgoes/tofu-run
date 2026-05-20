import { seoAssets } from "@/lib/seo-assets";

/** 正式站自訂網域（OG / canonical 須與分享圖同網域，勿用 *.vercel.app） */
export const PRODUCTION_SITE_URL = "https://tofu-run.ifunlove.com";

/** 網站根網址（SEO、OG、sitemap）；與 pray 一致用 NEXT_PUBLIC_SITE_URL */
function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  const fromEnv = raw?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  if (process.env.VERCEL) {
    return PRODUCTION_SITE_URL;
  }

  return "http://localhost:3000";
}

/** 根網址（與 pray layout 的 siteUrl 同用途） */
export const siteUrl = getSiteUrl();

/** 絕對路徑 OG 圖（與 pray 的 ogImageUrl 同寫法） */
export const ogImageUrl = `${siteUrl.replace(/\/$/, "")}${seoAssets.og.path}`;

export const siteConfig = {
  name: "豆花慢跑",
  nameEn: "Tofu Run",
  tagline: "一起完成屬於你的一碗豆花。",
  taglineEn: "When the Tofu Pudding is Running ...",
  location: "高雄中央公園",
  city: "高雄",
  country: "TW",
  locale: "zh_TW",
  url: siteUrl,
  creator: "豆花慢跑",
  /** Google Search Console（HTML 標記驗證，可公開） */
  googleSiteVerification: "1mE1Zrt2Etrno4lAitDyxtA_S1Ihed-Y3or14Mlwawo",
  keywords: [
    "豆花慢跑",
    "Tofu Run",
    "高雄中央公園",
    "Kaohsiung Central Park",
    "高雄",
    "Kaohsiung",
    "Taiwan",
    "慢跑",
    "group run",
    "城市遊戲",
    "city game",
    "QR code 活動",
    "豆花",
    "tofu pudding",
    "團體慢跑",
    "city walk",
    "高雄活動",
    "checkpoint",
    "gamification",
  ],
  description:
    "豆花慢跑（Tofu Run）是高雄中央公園的城市團體加油慢跑遊戲。掃描 QR 加入、選擇豆花配料、到公園各區掃描 Token，收集你的豆花護照——跑、跑、跑，享用你們拾取的豆花。",
  descriptionEn:
    "Tofu Run is a city group cheer-run game at Kaohsiung Central Park, Taiwan. Sign up with Runner ID, pick tofu toppings, scan checkpoint Tokens, and complete your tofu passport.",
  shortDescription:
    "高雄中央公園的城市慢跑遊戲。掃 QR 加入、選豆花、收集 Token 與豆花護照。",
  shortDescriptionEn:
    "City run game at Kaohsiung Central Park: QR signup, tofu toppings, Tokens, digital passport.",
  /** Open Graph / Twitter / LINE 橫式分享圖（1200×630 PNG） */
  ogImage: seoAssets.og.path,
  ogImageAlt: seoAssets.og.alt,
  /** 網站圖示 / PWA / 加入主畫面（勿與 og:image 混用） */
  icons: {
    favicon32: seoAssets.icons[0].path,
    favicon64: seoAssets.icons[1].path,
    android192: seoAssets.icons[2].path,
    pwa512: seoAssets.icons[3].path,
  },
  appIcon: seoAssets.icons[3].path,
  appIconAlt: seoAssets.icons[3].alt,
  /** 活動日前先隱藏 LIVE 入口（Nav、護照、首頁） */
  showLiveEntry: false,
} as const;

export function absoluteUrl(path = ""): string {
  const base = siteConfig.url.replace(/\/$/, "");
  if (!path) return `${base}/`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

/** @deprecated 請用 ogImageUrl；保留以免舊引用 */
export function getShareOgImageUrl(): string {
  return ogImageUrl;
}
