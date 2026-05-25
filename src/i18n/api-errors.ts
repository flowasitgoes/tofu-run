import type { Locale } from "./types";
import { createTranslator } from "./index";

/** Maps known API / validation error strings (zh) to localized text */
const API_ERROR_KEYS: Record<string, string> = {
  "Supabase 尚未設定完整": "api.supabaseIncomplete",
  "Supabase 尚未設定": "api.supabaseMissing",
  "請提供有效的 Runner ID": "api.invalidRunnerId",
  "請先完成首頁「想參加」報名，才能加入今日活動": "api.signupBeforeJoin",
  "請先完成首頁「想參加」報名，才能進入 LIVE": "api.signupBeforeLive",
  身份不符: "api.identityMismatch",
  "找不到此 Runner ID 的名額，請確認編號": "api.runnerSlotNotFound",
  "加入失敗": "common.joinFailed",
  "請填寫 Email": "api.emailRequired",
  "Email 格式不正確": "api.emailInvalid",
  "請選擇參加意願": "api.intentRequired",
  "請填寫 Runner ID": "api.runnerIdRequired",
  "Runner ID 格式不正確（例：DOG-214）": "api.runnerIdFormat",
  "找不到此 Runner ID，請確認名額編號": "api.runnerNotFound",
  "此 Runner ID 已登記過想參加": "api.runnerAlreadySigned",
  "「都不選」不可與配料同時選擇": "api.noneWithToppings",
  "配料選項無效": "api.toppingsInvalid",
  "請勿重複選擇配料": "api.toppingsDuplicate",
  "請提供 Runner ID": "api.runnerIdRequired",
  "查詢失敗": "api.lookupFailed",
  "請先輸入 Runner ID 進入 LIVE": "api.liveEnterFirst",
  "讀取 LIVE 失敗": "api.liveReadFailed",
  "請輸入有效的 Runner ID": "api.invalidRunnerId",
  "讀取護照失敗": "api.passportReadFailed",
  "載入失敗": "common.loadFailed",
  "進入失敗": "common.enterFailed",
  "掃描失敗": "common.scanFailed",
  "你已經收集過此 Token": "api.tokenAlreadyCollected",
  "此 Token 不在你的豆花路線": "api.tokenNotOnRoute",
  "純粹豆花路線無需掃描配料 Token": "api.pureRouteNoScan",
  "找不到使用者": "api.userNotFound",
  "讀取 Ground 失敗": "api.groundReadFailed",
  "送出失敗": "api.submitFailed",
  "暱稱僅能使用中文字、英文字母與空格，不可含數字或標點":
    "validation.invalidChars",
  "暱稱含有不適當用字，請修改": "validation.profanity",
};

const enApiExtras: Record<string, string> = {
  "api.supabaseIncomplete": "Supabase is not fully configured",
  "api.supabaseMissing": "Supabase is not configured",
  "api.invalidRunnerId": "Please provide a valid Runner ID",
  "api.signupBeforeJoin": "Complete Join on the home page before today's session",
  "api.signupBeforeLive": "Complete Join on the home page before LIVE",
  "api.identityMismatch": "Identity mismatch",
  "api.runnerSlotNotFound": "No slot found for this Runner ID",
  "api.emailRequired": "Email is required",
  "api.emailInvalid": "Invalid email format",
  "api.intentRequired": "Please choose how you want to participate",
  "api.runnerIdRequired": "Runner ID is required",
  "api.runnerIdFormat": "Invalid Runner ID format (e.g. DOG-214)",
  "api.runnerNotFound": "Runner ID not found — check your code",
  "api.runnerAlreadySigned": "This Runner ID already signed up",
  "api.noneWithToppings": "Cannot pick “None” together with toppings",
  "api.toppingsInvalid": "Invalid topping selection",
  "api.toppingsDuplicate": "Do not pick the same topping twice",
  "api.lookupFailed": "Lookup failed",
  "api.liveEnterFirst": "Enter LIVE with your Runner ID first",
  "api.liveReadFailed": "Could not load LIVE",
  "api.passportReadFailed": "Could not load passport",
  "api.submitFailed": "Submit failed",
  "api.tokenAlreadyCollected": "You already collected this Token",
  "api.tokenNotOnRoute": "This Token is not on your tofu route",
  "api.pureRouteNoScan": "Plain tofu route — no topping Tokens to scan",
  "api.userNotFound": "User not found",
  "api.groundReadFailed": "Could not load Ground board",
};

export function localizeErrorMessage(
  message: string,
  locale: Locale
): string {
  if (locale === "zh") return message;

  const key = API_ERROR_KEYS[message];
  if (key) {
    if (key.startsWith("validation.") || key.startsWith("common.")) {
      const t = createTranslator("en");
      if (key === "validation.tooLong" || message.includes("最多")) {
        const match = message.match(/(\d+)/);
        return t("validation.tooLong", { max: match?.[1] ?? "10" });
      }
      return t(key);
    }
    return enApiExtras[key] ?? message;
  }

  const maxMatch = message.match(/^自訂暱稱最多 (\d+) 個字$/);
  if (maxMatch) {
    return createTranslator("en")("validation.tooLong", {
      max: maxMatch[1],
    });
  }

  const maxToppings = message.match(/^最多選擇 (\d+) 種配料$/);
  if (maxToppings) {
    return `Pick at most ${maxToppings[1]} toppings`;
  }

  return message;
}
