"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/LocaleProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ToppingPicker } from "@/components/ToppingPicker";
import { formatDouhuaGoal, type TofuTypeId } from "@/lib/constants";
import { resolveDisplayName } from "@/lib/displayName";
import {
  setPassportPrefill,
  setStoredGoingAccount,
} from "@/lib/goingAccount";
import { formatDouhuaGoalLocalized } from "@/lib/i18n-labels";
import {
  CUSTOM_NAME_MAX_GRAPHEMES,
  countGraphemes,
  sanitizeCustomNameInput,
  validateCustomName,
} from "@/lib/validateCustomName";

type Intent = "join" | "interested";

export function InterestSignup() {
  const router = useRouter();
  const { locale, t, localizeError } = useLocale();
  const [intent, setIntent] = useState<Intent | null>(null);
  const [passportAlreadyRegistered, setPassportAlreadyRegistered] =
    useState(false);
  const [passportEntryLoading, setPassportEntryLoading] = useState(false);
  const [runnerId, setRunnerId] = useState("");
  const [runnerName, setRunnerName] = useState<string | null>(null);
  const [runnerLookup, setRunnerLookup] = useState(false);
  const [customName, setCustomName] = useState("");
  const [email, setEmail] = useState("");
  const [lineId, setLineId] = useState("");
  const [toppings, setToppings] = useState<TofuTypeId[]>([]);
  const [pickNone, setPickNone] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const prevIntentRef = useRef<Intent | null>(null);
  const customNameComposingRef = useRef(false);

  const intentLabel = (value: Intent) =>
    value === "join" ? t("signup.intentJoin") : t("signup.intentInterested");

  function validationMessage(
    result: Extract<ReturnType<typeof validateCustomName>, { ok: false }>
  ) {
    if (result.errorKey === "tooLong") {
      return t("validation.tooLong", {
        max: result.max ?? CUSTOM_NAME_MAX_GRAPHEMES,
      });
    }
    return t(`validation.${result.errorKey}`);
  }

  function scrollSignupIntoView() {
    const el = rootRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  useEffect(() => {
    if (intent && !prevIntentRef.current) {
      scrollSignupIntoView();
    }
    prevIntentRef.current = intent;
  }, [intent]);

  useEffect(() => {
    if (status !== "success") return;

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(scrollSignupIntoView);
    });
  }, [status]);

  async function openForm(selected: Intent) {
    setError(null);

    if (selected === "join") {
      const id = runnerId.trim().toUpperCase();
      if (!id) {
        setError(t("signup.enterRunnerId"));
        return;
      }

      setRunnerLookup(true);
      setRunnerName(null);
      try {
        const res = await fetch(
          `/api/runner?runnerId=${encodeURIComponent(id)}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? t("signup.lookupFailed"));
        setRunnerId(data.runnerId);
        setRunnerName(data.runnerName);
        setIntent("join");
        setStatus("idle");
      } catch (err) {
        setError(
          err instanceof Error
            ? localizeError(err.message)
            : t("signup.lookupFailed")
        );
      } finally {
        setRunnerLookup(false);
      }
      return;
    }

    setIntent(selected);
    setStatus("idle");
    setToppings([]);
    setPickNone(false);
  }

  function goToPassport() {
    const id = runnerId.trim().toUpperCase();
    if (id) setStoredGoingAccount({ runnerId: id });
    router.push("/passport");
  }

  async function handlePassportLogin() {
    setError(null);
    const id = runnerId.trim().toUpperCase();
    if (!id) {
      setError(t("signup.enterRunnerId"));
      return;
    }

    setPassportEntryLoading(true);
    setPassportAlreadyRegistered(false);
    try {
      const res = await fetch(
        `/api/going/passport-entry?runnerId=${encodeURIComponent(id)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("signup.lookupFailed"));
      setRunnerId(data.runnerId);
      setRunnerName(data.runnerName ?? null);
      if (data.registered) {
        setPassportAlreadyRegistered(true);
        return;
      }
      setPassportPrefill(data.runnerId);
      router.push("/passport");
    } catch (err) {
      setError(
        err instanceof Error
          ? localizeError(err.message)
          : t("signup.lookupFailed")
      );
    } finally {
      setPassportEntryLoading(false);
    }
  }

  function closeForm() {
    setIntent(null);
    setPassportAlreadyRegistered(false);
    setRunnerId("");
    setRunnerName(null);
    setCustomName("");
    setEmail("");
    setLineId("");
    setToppings([]);
    setPickNone(false);
    setError(null);
    setStatus("idle");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!intent) return;

    setStatus("submitting");
    setError(null);

    const customNameCheck = validateCustomName(customName);
    if (!customNameCheck.ok) {
      setStatus("error");
      setError(validationMessage(customNameCheck));
      return;
    }

    try {
      const res = await fetch("/api/going", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          runnerId:
            intent === "join" ? runnerId.trim().toUpperCase() : undefined,
          customName: customNameCheck.value || undefined,
          email: email.trim(),
          lineId: lineId.trim() || undefined,
          preferredToppings:
            intent === "join"
              ? pickNone
                ? ["none"]
                : toppings
              : undefined,
          pureOnly: intent === "join" ? pickNone : undefined,
          douhuaGoal:
            intent === "join"
              ? formatDouhuaGoal(toppings, pickNone)
              : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("signup.submitFailed"));
      if (intent === "join" && runnerId.trim()) {
        setStoredGoingAccount({ runnerId: runnerId.trim().toUpperCase() });
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error
          ? localizeError(err.message)
          : t("signup.submitFailed")
      );
    }
  }

  const displayName = resolveDisplayName(customName, runnerName);

  const successGoal =
    intent === "join" && (pickNone || toppings.length > 0)
      ? formatDouhuaGoalLocalized(toppings, pickNone, locale)
      : null;

  if (status === "success") {
    return (
      <div id="interest-signup" ref={rootRef} className="mb-5 scroll-mt-6">
        <Card className="border-2 border-mung-green/30 bg-gradient-to-br from-mung-green/12 to-tofu-white text-center shadow-md shadow-mung-green/10">
          <p className="animate-float text-4xl">🥣</p>
          <h2 className="mt-3 text-xl font-bold text-brown-sugar">
            {t("signup.successTitle")}
          </h2>
          <p className="mt-1 text-xs text-mung-green/90">
            {t("signup.successSubtitle")}
          </p>

          {intent === "join" && runnerId && (
            <div className="mt-4 rounded-2xl bg-cream/90 px-4 py-3">
              <p className="font-mono text-base font-semibold text-twilight">
                {runnerId.trim().toUpperCase()}
              </p>
              {displayName && (
                <p className="mt-1 text-sm font-medium text-brown-sugar">
                  {displayName}
                </p>
              )}
            </div>
          )}

          {successGoal && (
            <p className="mt-3 rounded-xl border border-mung-green/15 bg-mung-green/5 px-4 py-2.5 text-base font-semibold text-brown-sugar">
              {t("signup.goalLabel")}
              {successGoal}
            </p>
          )}

          <p className="mt-4 text-sm leading-relaxed text-brown-sugar/75">
            {t("signup.successMessage")}
          </p>

          {intent === "join" ? (
            <div className="mt-5 flex flex-col gap-2">
              <Link
                href="/passport"
                className="flex-1 rounded-2xl bg-brown-sugar px-4 py-3.5 text-center text-sm font-medium text-cream shadow-md shadow-brown-sugar/15 transition-transform active:scale-[0.98]"
              >
                {t("signup.viewPassport")}
              </Link>
              <Link
                href="/lobby"
                className="flex-1 rounded-2xl border-2 border-brown-sugar/20 bg-cream px-4 py-3.5 text-center text-sm font-medium text-brown-sugar transition-colors hover:border-brown-sugar/35 active:scale-[0.98]"
              >
                {t("signup.viewLobby")}
              </Link>
            </div>
          ) : (
            <p className="mt-4 text-xs text-brown-sugar/55">
              {t("signup.interestedNotify")}
            </p>
          )}

          <button
            type="button"
            onClick={closeForm}
            className="mt-4 text-xs text-brown-sugar/45 underline-offset-2 hover:text-brown-sugar/65 hover:underline"
          >
            {t("signup.closeBrowse")}
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div id="interest-signup" ref={rootRef} className="mb-5 scroll-mt-6">
      <Card className="overflow-hidden border-2 border-brown-sugar/10 bg-gradient-to-br from-cream to-tofu-white">
        <p className="text-center text-xs font-medium tracking-wide text-sunset">
          {t("signup.preview")}
        </p>
        <h2 className="mt-1 text-center text-lg font-semibold text-brown-sugar">
          {t("signup.heading")}
        </h2>
        <p className="mt-2 whitespace-pre-line text-center text-sm leading-relaxed text-brown-sugar/70">
          {t("signup.subheading")}
        </p>

        {!intent ? (
          passportAlreadyRegistered ? (
            <div className="mt-5 space-y-4 text-center">
              <p className="text-4xl">📔</p>
              <p className="text-base font-semibold text-brown-sugar">
                {t("signup.alreadyRegistered")}
              </p>
              <div className="rounded-2xl bg-cream/90 px-4 py-3">
                <p className="font-mono text-base font-semibold text-twilight">
                  {runnerId.trim().toUpperCase()}
                </p>
                {displayName && (
                  <p className="mt-1 text-sm font-medium text-brown-sugar">
                    {displayName}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={goToPassport}
                className="w-full rounded-2xl bg-brown-sugar px-4 py-3.5 text-sm font-medium text-cream shadow-md shadow-brown-sugar/15 transition-transform active:scale-[0.98]"
              >
                {t("signup.viewMyPassport")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPassportAlreadyRegistered(false);
                  setError(null);
                }}
                className="text-xs text-brown-sugar/45 underline-offset-2 hover:text-brown-sugar/65 hover:underline"
              >
                {t("signup.backToSignupForm")}
              </button>
            </div>
          ) : (
          <div className="mt-5 space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-brown-sugar/70">
                {t("common.runnerId")}
              </span>
              <input
                type="text"
                value={runnerId}
                onChange={(e) => {
                  setRunnerId(e.target.value.toUpperCase());
                  setRunnerName(null);
                  setError(null);
                }}
                placeholder={t("common.exampleRunnerId")}
                className="w-full rounded-xl border border-brown-sugar/15 bg-cream px-4 py-3 font-mono text-sm tracking-wide text-brown-sugar outline-none transition-colors placeholder:font-sans placeholder:text-brown-sugar/35 focus:border-sunset/60 focus:ring-2 focus:ring-sunset/20"
              />
              <p className="mt-1 text-[10px] text-brown-sugar/45">
                {t("signup.runnerIdHint")}
              </p>
            </label>

            {error && (
              <p className="rounded-lg bg-red-bean/10 px-3 py-2 text-xs text-red-bean">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => openForm("join")}
                disabled={runnerLookup || passportEntryLoading}
                className="flex-1 rounded-2xl bg-brown-sugar px-4 py-3.5 text-sm font-medium text-cream shadow-md shadow-brown-sugar/15 transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                {runnerLookup
                  ? t("signup.lookingUp")
                  : t("signup.intentJoin")}
              </button>
              <button
                type="button"
                onClick={() => void handlePassportLogin()}
                disabled={runnerLookup || passportEntryLoading}
                className="flex-1 rounded-2xl border-2 border-brown-sugar/25 bg-cream px-4 py-3.5 text-sm font-medium text-brown-sugar transition-colors hover:border-brown-sugar/40 active:scale-[0.98] disabled:opacity-60"
              >
                {passportEntryLoading
                  ? t("signup.lookingUp")
                  : t("signup.passportLogin")}
              </button>
            </div>
          </div>
          )
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="relative flex min-h-[5.5rem] flex-col rounded-xl bg-sunset/10 px-3 py-2 pb-7 text-xs text-brown-sugar">
              <p className="text-left">
                {t("signup.youChose")}
                <span className="font-semibold"> {intentLabel(intent)}</span>
              </p>
              {intent === "join" && runnerId && (
                <p className="flex flex-1 items-center justify-center gap-2 py-1 text-sm font-bold text-mung-green">
                  <span className="font-mono">
                    {runnerId.trim().toUpperCase()}
                  </span>
                  {displayName && <span>{displayName}</span>}
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setIntent(null);
                  setRunnerName(null);
                }}
                className="absolute bottom-2 right-3 text-[10px] text-brown-sugar/50 underline"
              >
                {t("signup.changeIntent")}
              </button>
            </div>

            <label className="block">
              <span className="mb-1.5 flex items-baseline gap-1.5 text-xs font-medium text-brown-sugar/70">
                {t("signup.customName")}
                <span className="font-normal text-brown-sugar/40">
                  {t("common.optional")}
                </span>
              </span>
              <input
                type="text"
                value={customName}
                onCompositionStart={() => {
                  customNameComposingRef.current = true;
                }}
                onCompositionEnd={(e) => {
                  customNameComposingRef.current = false;
                  setCustomName(
                    sanitizeCustomNameInput(e.currentTarget.value)
                  );
                }}
                onChange={(e) => {
                  const next = e.target.value;
                  if (customNameComposingRef.current) {
                    setCustomName(next);
                    return;
                  }
                  setCustomName(sanitizeCustomNameInput(next));
                }}
                placeholder={
                  intent === "join" && runnerName
                    ? t("signup.customNamePlaceholderWithDefault", {
                        name: runnerName,
                      })
                    : t("signup.customNamePlaceholder")
                }
                className="w-full rounded-xl border border-brown-sugar/15 bg-cream px-4 py-3 text-sm text-brown-sugar outline-none transition-colors placeholder:text-brown-sugar/35 focus:border-sunset/60 focus:ring-2 focus:ring-sunset/20"
              />
              <p className="mt-1 text-[11px] text-brown-sugar/45">
                {t("signup.customNameHint", {
                  max: CUSTOM_NAME_MAX_GRAPHEMES,
                  count: countGraphemes(customName),
                })}
              </p>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-brown-sugar/70">
                {t("signup.email")}
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-xl border border-brown-sugar/15 bg-cream px-4 py-3 text-sm text-brown-sugar outline-none transition-colors placeholder:text-brown-sugar/35 focus:border-sunset/60 focus:ring-2 focus:ring-sunset/20"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-baseline gap-1.5 text-xs font-medium text-brown-sugar/70">
                {t("signup.lineId")}
                <span className="font-normal text-brown-sugar/40">
                  {t("common.optional")}
                </span>
              </span>
              <input
                type="text"
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
                placeholder="@your_line_id"
                className="w-full rounded-xl border border-brown-sugar/15 bg-cream px-4 py-3 text-sm text-brown-sugar outline-none transition-colors placeholder:text-brown-sugar/35 focus:border-sunset/60 focus:ring-2 focus:ring-sunset/20"
              />
            </label>

            {intent === "join" && (
              <ToppingPicker
                selected={toppings}
                pickNone={pickNone}
                onChange={setToppings}
                onPickNone={setPickNone}
              />
            )}

            {error && (
              <p className="rounded-lg bg-red-bean/10 px-3 py-2 text-xs text-red-bean">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                type="submit"
                className="flex-1"
                disabled={status === "submitting"}
              >
                {status === "submitting"
                  ? t("common.submitting")
                  : t("common.submit")}
              </Button>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-2xl px-4 py-3 text-sm text-brown-sugar/60 hover:text-brown-sugar"
              >
                {t("common.cancel")}
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
