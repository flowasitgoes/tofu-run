import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * 社群預覽爬蟲（勿用 /Line/i：LINE App 內建瀏覽器 UA 含 "Safari Line/x.x" 會誤判）
 * LINE 預覽多為 facebookexternalhit/1.1;line-poker/1.0，已由 facebookexternalhit 涵蓋
 */
const SOCIAL_BOT_UA =
  /facebookexternalhit|Facebot|meta-externalagent|Twitterbot|LinkedInBot|Slackbot|Discordbot|line-poker/i;

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
