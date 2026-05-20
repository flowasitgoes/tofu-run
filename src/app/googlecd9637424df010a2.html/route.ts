/** Google Search Console 擁有權驗證（App Router 有時不會直接提供 public/*.html） */
const VERIFICATION_BODY = "google-site-verification: googlecd9637424df010a2.html";

export const dynamic = "force-static";

export function GET() {
  return new Response(VERIFICATION_BODY, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
