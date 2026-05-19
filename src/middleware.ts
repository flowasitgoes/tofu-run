import { NextResponse, type NextRequest } from "next/server";
import { absoluteUrl, getShareOgImageUrl, siteConfig } from "@/lib/site";

/** Facebook / Meta / LINE 等分享預覽爬蟲（含 Meta 新版 meta-externalagent） */
const SOCIAL_BOT_UA =
  /facebookexternalhit|facebot|meta-externalagent|twitterbot|linkedinbot|slackbot|discordbot|line\//i;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

/** 首頁給爬蟲極簡 HTML（含完整 OG），避免被擋時讀不到 meta */
function socialBotHtml(): string {
  const title = `${siteConfig.name} | ${siteConfig.nameEn}`;
  const url = absoluteUrl("/");
  const image = getShareOgImageUrl();
  const description = siteConfig.description;

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<meta property="og:type" content="website"/>
<meta property="og:url" content="${escapeHtml(url)}"/>
<meta property="og:site_name" content="${escapeHtml(siteConfig.name)}"/>
<meta property="og:title" content="${escapeHtml(title)}"/>
<meta property="og:description" content="${escapeHtml(description)}"/>
<meta property="og:image" content="${escapeHtml(image)}"/>
<meta property="og:image:secure_url" content="${escapeHtml(image)}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:image:type" content="image/jpeg"/>
<meta property="og:image:alt" content="${escapeHtml(siteConfig.ogImageAlt)}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${escapeHtml(title)}"/>
<meta name="twitter:description" content="${escapeHtml(description)}"/>
<meta name="twitter:image" content="${escapeHtml(image)}"/>
</head>
<body><p>${escapeHtml(title)}</p></body>
</html>`;
}

export function middleware(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? "";
  if (request.method !== "GET" || !SOCIAL_BOT_UA.test(ua)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname !== "/") {
    return NextResponse.next();
  }

  return new NextResponse(socialBotHtml(), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export const config = {
  matcher: "/",
};
