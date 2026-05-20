import { NextResponse } from "next/server";
import {
  MAX_TOPPING_PICKS,
  PURE_DOUHUA_GOAL,
  TOFU_TYPES,
  formatDouhuaGoal,
} from "@/lib/constants";
import { resolveDisplayName } from "@/lib/displayName";
import {
  getPoolUserByRunnerId,
  hasGoingJoinSignup,
  insertGoingSignup,
} from "@/lib/db";
import { normalizeRunnerId, RUNNER_ID_PATTERN } from "@/lib/runner";
import {
  customNameErrorMessage,
  validateCustomName,
} from "@/lib/validateCustomName";
import {
  isSupabaseConfigured,
  isSupabaseServiceConfigured,
} from "@/lib/supabase";

const VALID_INTENTS = ["join", "interested"] as const;
const VALID_TOPPING_IDS = TOFU_TYPES.map((t) => t.id);

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !isSupabaseServiceConfigured()) {
    return NextResponse.json(
      {
        error:
          "Supabase 尚未設定完整（需 NEXT_PUBLIC_* 與 SUPABASE_SERVICE_ROLE_KEY）",
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const {
      email,
      customName,
      intent,
      lineId,
      runnerId,
      preferredToppings,
      douhuaGoal,
      pureOnly,
    } = body as {
      email?: string;
      customName?: string;
      intent?: string;
      lineId?: string;
      runnerId?: string;
      preferredToppings?: string[];
      douhuaGoal?: string;
      pureOnly?: boolean;
    };

    const trimmedEmail = email?.trim().toLowerCase() ?? "";
    const trimmedCustomName = customName?.trim() ?? "";
    const trimmedLineId = lineId?.trim() || null;
    const trimmedRunnerId = runnerId ? normalizeRunnerId(runnerId) : "";

    if (!trimmedEmail) {
      return NextResponse.json({ error: "請填寫 Email" }, { status: 400 });
    }

    const customNameCheck = validateCustomName(trimmedCustomName);
    if (!customNameCheck.ok) {
      return NextResponse.json(
        { error: customNameErrorMessage(customNameCheck) },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json({ error: "Email 格式不正確" }, { status: 400 });
    }

    if (!intent || !VALID_INTENTS.includes(intent as (typeof VALID_INTENTS)[number])) {
      return NextResponse.json({ error: "請選擇參加意願" }, { status: 400 });
    }

    let poolRunnerName: string | null = null;

    if (intent === "join") {
      if (!trimmedRunnerId) {
        return NextResponse.json({ error: "請填寫 Runner ID" }, { status: 400 });
      }

      if (!RUNNER_ID_PATTERN.test(trimmedRunnerId)) {
        return NextResponse.json(
          { error: "Runner ID 格式不正確（例：DOG-214）" },
          { status: 400 }
        );
      }

      const poolUser = await getPoolUserByRunnerId(trimmedRunnerId);

      if (!poolUser) {
        return NextResponse.json(
          { error: "找不到此 Runner ID，請確認名額編號" },
          { status: 404 }
        );
      }

      poolRunnerName = poolUser.runner_name;

      if (await hasGoingJoinSignup(trimmedRunnerId)) {
        return NextResponse.json(
          { error: "此 Runner ID 已登記過想參加" },
          { status: 409 }
        );
      }
    }

    let toppings: string[] = [];
    let isPureOnly = false;
    if (intent === "join") {
      const raw = Array.isArray(preferredToppings) ? preferredToppings : [];
      isPureOnly = Boolean(pureOnly) || raw.includes("none");
      toppings = raw.filter((id) => id !== "none");

      if (isPureOnly && toppings.length > 0) {
        return NextResponse.json({ error: "「都不選」不可與配料同時選擇" }, { status: 400 });
      }

      if (toppings.length > MAX_TOPPING_PICKS) {
        return NextResponse.json(
          { error: `最多選擇 ${MAX_TOPPING_PICKS} 種配料` },
          { status: 400 }
        );
      }
      const invalid = toppings.some(
        (id) => !VALID_TOPPING_IDS.includes(id as (typeof VALID_TOPPING_IDS)[number])
      );
      if (invalid) {
        return NextResponse.json({ error: "配料選項無效" }, { status: 400 });
      }
      const unique = new Set(toppings);
      if (unique.size !== toppings.length) {
        return NextResponse.json({ error: "請勿重複選擇配料" }, { status: 400 });
      }
    }

    const goal =
      intent === "join"
        ? isPureOnly
          ? PURE_DOUHUA_GOAL
          : douhuaGoal?.trim() || formatDouhuaGoal(toppings)
        : null;

    const validatedCustomName = customNameCheck.value;

    const displayName = resolveDisplayName(
      validatedCustomName,
      intent === "join" ? poolRunnerName : null
    );

    const dbToppings = intent === "join" && !isPureOnly ? toppings : [];

    await insertGoingSignup({
      email: trimmedEmail,
      runner_id: intent === "join" ? trimmedRunnerId : null,
      runner_name: intent === "join" ? poolRunnerName : null,
      custom_name: validatedCustomName || null,
      nickname: displayName,
      line_id: trimmedLineId,
      intent,
      topping1: dbToppings[0] ?? null,
      topping2: dbToppings[1] ?? null,
      topping3: dbToppings[2] ?? null,
      goal: intent === "join" ? goal : null,
      preferred_toppings:
        intent === "join" ? (isPureOnly ? ["none"] : toppings) : [],
      douhua_goal: goal,
    });

    return NextResponse.json({ ok: true, douhuaGoal: goal });
  } catch (e) {
    console.error(e);
    const message =
      e instanceof Error && e.message.includes("SERVICE_ROLE")
        ? "伺服器缺少 SUPABASE_SERVICE_ROLE_KEY"
        : "送出失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
