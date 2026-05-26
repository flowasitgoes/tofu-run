import { clearPassportCache } from "@/lib/passportCache";

/** 已「想參加」報名者的本機登入（護照） */
export const GOING_ACCOUNT_KEY = "tofu-run-going-account";

export type StoredGoingAccount = {
  runnerId: string;
};

export function getStoredGoingAccount(): StoredGoingAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(GOING_ACCOUNT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredGoingAccount;
  } catch {
    return null;
  }
}

export function setStoredGoingAccount(account: StoredGoingAccount): void {
  const nextId = account.runnerId.trim().toUpperCase();
  const prev = getStoredGoingAccount();
  if (prev?.runnerId && prev.runnerId.trim().toUpperCase() !== nextId) {
    clearPassportCache();
  }
  localStorage.setItem(
    GOING_ACCOUNT_KEY,
    JSON.stringify({ runnerId: nextId })
  );
}

const PASSPORT_PREFILL_KEY = "tofu-run-passport-prefill";

/** 從首頁帶入護照登入欄位（尚未寫入 going-account） */
export function setPassportPrefill(runnerId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PASSPORT_PREFILL_KEY, runnerId);
}

export function consumePassportPrefill(): string | null {
  if (typeof window === "undefined") return null;
  const value = sessionStorage.getItem(PASSPORT_PREFILL_KEY);
  if (value) sessionStorage.removeItem(PASSPORT_PREFILL_KEY);
  return value;
}

export function clearStoredGoingAccount(): void {
  localStorage.removeItem(GOING_ACCOUNT_KEY);
  // 與護照快取一併清除（避免登出後仍顯示舊資料）
  try {
    localStorage.removeItem("tofu-run-passport-cache");
    localStorage.removeItem("tofu-run-passport-cache-v2");
    localStorage.removeItem("tofu-run-passport-cache-v3");
    localStorage.removeItem("tofu-run-passport-cache-v4");
    localStorage.removeItem("tofu-run-passport-cache-v5");
  } catch {
    /* ignore */
  }
}
