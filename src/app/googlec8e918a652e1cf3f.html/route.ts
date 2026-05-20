/** Google Search Console 擁有權驗證（URL 前置字元資源用） */
const VERIFICATION_BODY =
  "google-site-verification: googlec8e918a652e1cf3f.html";

export const dynamic = "force-static";

export function GET() {
  return new Response(VERIFICATION_BODY, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
