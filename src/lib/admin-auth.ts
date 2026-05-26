export type AdminAuthResult =
  | { ok: true }
  | { ok: false; reason: "missing_env" | "unauthorized" };

/** 比對請求標頭與 process.env.ADMIN_SECRET（伺服器端） */
export function verifyAdminRequest(request: Request): AdminAuthResult {
  const expected = process.env.ADMIN_SECRET?.trim();
  if (!expected) {
    return { ok: false, reason: "missing_env" };
  }
  const provided = request.headers.get("x-admin-secret")?.trim() ?? "";
  if (provided !== expected) {
    return { ok: false, reason: "unauthorized" };
  }
  return { ok: true };
}

export function adminAuthErrorResponse(result: Exclude<AdminAuthResult, { ok: true }>) {
  if (result.reason === "missing_env") {
    return {
      status: 503 as const,
      body: {
        error:
          "伺服器未設定 ADMIN_SECRET，請在 .env.local 設定後重啟 npm run dev",
      },
    };
  }
  return {
    status: 401 as const,
    body: { error: "未授權" },
  };
}
