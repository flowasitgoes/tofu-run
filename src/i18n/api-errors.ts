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
  "找不到此 Runner ID 的「想參加」報名。請確認已送出成功，或 Table 是否為 going_signups。":
    "api.passportSignupNotFound",
  "找不到此 Runner ID 的「想參加」報名。請前往首頁報名且成功，或聯繫豆仔 ~":
    "api.passportSignupNotFound",
  "此 Runner ID 已登記過想參加": "api.runnerAlreadySigned",
  "「都不選」不可與配料同時選擇": "api.noneWithToppings",
  "配料選項無效": "api.toppingsInvalid",
  "請勿重複選擇配料": "api.toppingsDuplicate",
  "請提供 Runner ID": "api.runnerIdRequired",
  "查詢失敗": "api.lookupFailed",
  "活動尚未開始或已結束，請等候主辦開放 LIVE": "api.liveNotActive",
  "請先開啟活動後再分配豆花": "api.adminLiveRequired",
  "未授權": "admin.unauthorized",
  "伺服器未設定 ADMIN_SECRET，請在 .env.local 設定後重啟 npm run dev":
    "admin.serverSecretMissing",
  "資料庫尚未建立 LIVE 場次欄位。請在 .env.local 加上 DATABASE_URL（Supabase → Project Settings → Database → Connection string），重啟 dev server 後再按「開啟活動」；或於 SQL Editor 執行 supabase/sessions_live_status.sql":
    "admin.schemaSetupRequired",
  "此日期已舉辦過活動，請選擇其他日期": "api.sessionDateUsed",
  "不可選擇過去的日期": "api.sessionDatePast",
  "已有進行中的活動，請先結束後再開啟": "api.sessionAlreadyActive",
  "目前沒有進行中的活動": "api.noActiveSession",
  "請先輸入 Runner ID 進入 LIVE": "api.liveEnterFirst",
  "讀取 LIVE 失敗": "api.liveReadFailed",
  "請輸入有效的 Runner ID": "api.invalidRunnerId",
  "讀取護照失敗": "api.passportReadFailed",
  "載入失敗": "common.loadFailed",
  "進入失敗": "common.enterFailed",
  "掃描失敗": "common.scanFailed",
  "你已經收集過此 Token": "api.tokenAlreadyCollected",
  "此 Token 不在你的豆花路線": "api.tokenNotOnRoute",
  "您才剛領過豆花噎ㄝ , 客人!": "api.scanTofuCooldown",
  "豆花 Token 需間隔 40 秒後才能再掃": "api.scanTofuCooldown",
  "豆花 Token 需間隔 1 分鐘後才能再掃": "api.scanTofuCooldown",
  "配料 Token 需間隔 1 分鐘後才能再掃": "api.scanToppingCooldown",
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
  "api.liveNotActive":
    "LIVE is closed — wait for the host to open the event",
  "api.adminLiveRequired": "Start an event before assigning tofu",
  "api.sessionDateUsed": "This date was already used — pick another",
  "api.sessionDatePast": "Cannot pick a past date",
  "api.sessionAlreadyActive": "An event is already running — end it first",
  "api.noActiveSession": "No event is currently running",
  "api.liveEnterFirst": "Enter LIVE with your Runner ID first",
  "api.liveReadFailed": "Could not load LIVE",
  "api.passportReadFailed": "Could not load passport",
  "api.passportSignupNotFound":
    "No Join signup found for this Runner ID. Please sign up on the home page first, or contact the bean team~",
  "api.submitFailed": "Submit failed",
  "api.tokenAlreadyCollected": "You already collected this Token",
  "api.tokenNotOnRoute": "This Token is not on your tofu route",
  "api.scanSameToppingConsecutive":
    "You just picked up this topping — scan another one first!",
  "api.scanTofuCooldown":
    "You just picked up tofu — give it a moment before scanning again!",
  "api.scanToppingCooldown":
    "Wait 1 minute before scanning another topping Token",
  "api.pureRouteNoScan": "Plain tofu route — no topping Tokens to scan",
  "api.userNotFound": "User not found",
  "api.groundReadFailed": "Could not load Ground board",
  "admin.unauthorized": "Wrong secret or not authorized",
  "admin.serverSecretMissing":
    "ADMIN_SECRET is not set on the server — add it to .env.local and restart the dev server",
  "admin.schemaSetupRequired":
    "LIVE session columns missing — set DATABASE_URL or run sessions_live_status.sql",
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

  const toppingCooldown =
    message.match(/^您剛剛才領過(.+?)配料呢客人!$/) ??
    message.match(/^您已經剛領過(.+?)配料了!$/);
  if (toppingCooldown) {
    const zh = toppingCooldown[1];
    const enName: Record<string, string> = {
      紅豆: "red bean",
      綠豆: "mung bean",
      芋圓: "taro ball",
      粉圓: "tapioca",
      花生: "peanut",
    };
    const label = enName[zh] ?? zh;
    return `You just picked up ${label} topping — wait a minute before scanning it again!`;
  }

  const maxToppings = message.match(/^最多選擇 (\d+) 種配料$/);
  if (maxToppings) {
    return `Pick at most ${maxToppings[1]} toppings`;
  }

  return message;
}
