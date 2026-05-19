import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** 社群分享爬蟲：首頁改讀 public/index.html（靜態 OG，與 pray 類似） */
const SOCIAL_BOT_UA =
  /facebookexternalhit|Facebot|meta-externalagent|Twitterbot|LinkedInBot|Slackbot|Discordbot|Line/i;

export function middleware(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? "";
  if (SOCIAL_BOT_UA.test(ua) && request.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/index.html", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
