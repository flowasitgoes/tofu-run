"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { MadeByCredit } from "@/components/MadeByCredit";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  PURE_DOUHUA_GOAL,
  TOFU_TYPES,
  getTokenLabel,
} from "@/lib/constants";
import type { TokenTypeId } from "@/lib/constants";
import {
  getTokenLabelLocalized,
  getTokenZoneLocalized,
  getTofuLabelLocalized,
} from "@/lib/i18n-labels";
import {
  clearStoredGoingAccount,
  consumePassportPrefill,
  getStoredGoingAccount,
  setStoredGoingAccount,
} from "@/lib/goingAccount";
import {
  getPassportCache,
  setPassportCache,
} from "@/lib/passportCache";
import { TokenEarnedToast } from "@/components/TokenEarnedToast";
import { useTokenRealtime } from "@/hooks/useTokenRealtime";
import { useStoredPlayerSnapshot } from "@/hooks/useStoredPlayer";
import { clearStoredPlayer } from "@/lib/player";
import { tokenScanCounts } from "@/lib/ground-completion";
import {
  formatDurationMinutes,
  getTodayDateString,
} from "@/lib/session";
import { siteConfig } from "@/lib/site";
import type { PassportAccount, PassportRun } from "@/types/database";

export default function PassportPage() {
  const { locale, t, localizeError } = useLocale();
  const recordEmpty = t("common.recordEmpty");
  const [runnerIdInput, setRunnerIdInput] = useState("");
  const [sessionRunnerId, setSessionRunnerId] = useState<string | null>(null);
  const [account, setAccount] = useState<PassportAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [earnedTokenType, setEarnedTokenType] = useState<string | null>(null);

  const loadAccount = useCallback(
    async (runnerId: string, options?: { force?: boolean }) => {
      const cached = !options?.force ? getPassportCache(runnerId) : null;

      if (cached) {
        setAccount(cached.account);
        setSessionRunnerId(runnerId);
        setStoredGoingAccount({ runnerId });
        setError(null);
        setLoading(false);

        if (!cached.stale) return;

        setRefreshing(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const res = await fetch(
          `/api/passport?runnerId=${encodeURIComponent(runnerId)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? t("common.loadFailed"));
        const next = data as PassportAccount;
        setAccount(next);
        setSessionRunnerId(runnerId);
        setStoredGoingAccount({ runnerId });
        setPassportCache(runnerId, next);
        setError(null);
      } catch (e) {
        if (!cached) {
          setError(
            e instanceof Error
              ? localizeError(e.message)
              : t("common.loadFailed")
          );
          setAccount(null);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [localizeError, t]
  );

  useEffect(() => {
    const prefill = consumePassportPrefill();
    if (prefill) {
      const id = prefill.trim().toUpperCase();
      setRunnerIdInput(id);
      setStoredGoingAccount({ runnerId: id });
      void loadAccount(id);
      return;
    }
    const stored = getStoredGoingAccount();
    if (stored?.runnerId) {
      void loadAccount(stored.runnerId);
      return;
    }
    setLoading(false);
  }, [loadAccount]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const id = runnerIdInput.trim().toUpperCase();
    if (!id) return;
    setLoginLoading(true);
    await loadAccount(id);
    setLoginLoading(false);
  }

  function handleLogout() {
    clearStoredGoingAccount();
    clearStoredPlayer();
    setSessionRunnerId(null);
    setAccount(null);
    setRunnerIdInput("");
    setError(null);
  }

  const { player } = useStoredPlayerSnapshot();
  const hasJoinedToday =
    player && sessionRunnerId && player.runnerId === sessionRunnerId;

  useTokenRealtime({
    userId: account?.user?.id ?? null,
    sessionId: account?.todaySessionId ?? null,
    onTokenEarned: ({ token }) => {
      setEarnedTokenType(token.token_type);
      if (sessionRunnerId) {
        void loadAccount(sessionRunnerId, { force: true });
      }
    },
    enabled: Boolean(sessionRunnerId && account?.user?.id),
  });

  if (!sessionRunnerId && !loading) {
    return (
      <PageShell>
        <Card className="mt-8 text-center">
          <p className="text-4xl mb-4">📔</p>
          <h1 className="text-xl font-bold text-brown-sugar">
            {t("passport.title")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-brown-sugar/70">
            {t("passport.loginHint")}
          </p>
        </Card>

        <form onSubmit={handleLogin} className="mt-5 space-y-3">
          <label className="block text-left">
            <div className="mb-2.5 flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-brown-sugar/70">
                {t("common.runnerId")}
              </span>
              <MadeByCredit className="shrink-0 text-right" />
            </div>
            <input
              type="text"
              value={runnerIdInput}
              onChange={(e) =>
                setRunnerIdInput(e.target.value.toUpperCase())
              }
              placeholder={t("common.exampleRunnerId")}
              className="w-full rounded-xl border border-brown-sugar/15 bg-cream px-4 py-3 font-mono text-sm text-brown-sugar outline-none focus:border-sunset/60 focus:ring-2 focus:ring-sunset/20"
            />
          </label>
          {error && (
            <p className="rounded-lg bg-red-bean/10 px-3 py-2 text-xs text-red-bean">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loginLoading}>
            {loginLoading ? t("passport.loggingIn") : t("passport.login")}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-brown-sugar/50">
          {t("passport.notSignedUp")}
          <Link href="/" className="ml-1 underline">
            {t("passport.backHomeSignup")}
          </Link>
        </p>
      </PageShell>
    );
  }

  const signup = account?.signup;
  const displayNickname = signup?.nickname ?? signup?.runner_name ?? "—";

  const tofuEmoji = (id: string | null) =>
    TOFU_TYPES.find((t) => t.id === id)?.emoji ?? "🥣";

  const todayDate = getTodayDateString();
  const activityRuns: PassportRun[] =
    !signup || loading
      ? []
      : account && account.runs.length > 0
        ? account.runs
        : [
            {
              session_date: todayDate,
              tofu_type: null,
              completed_at: null,
              joined_at: "",
              tokens: [],
              bowls_completed: 0,
              required_token_ids: (account?.collectTargets ?? []).map(
                (t) => t.id
              ),
            },
          ];

  const todayRun = activityRuns.find((r) => r.session_date === todayDate);
  const todayTokenCounts = tokenScanCounts(
    todayRun?.required_token_ids ?? [],
    todayRun?.tokens.map((tok) => tok.token_type) ?? []
  );

  function tokenGroupsForRun(run: PassportRun) {
    const counts = tokenScanCounts(
      run.required_token_ids,
      run.tokens.map((tok) => tok.token_type)
    );
    return run.required_token_ids
      .map((id) => ({
        id,
        count: counts.get(id) ?? 0,
      }))
      .filter((row) => row.count > 0);
  }

  return (
    <PageShell>
      {earnedTokenType && (
        <TokenEarnedToast
          tokenType={earnedTokenType}
          onDone={() => setEarnedTokenType(null)}
        />
      )}
      <header className="mb-6 text-center">
        <p className="text-4xl mb-2">📔</p>
        <h1 className="text-2xl font-bold text-brown-sugar">{t("passport.title")}</h1>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <p className="font-mono text-sm text-twilight">{sessionRunnerId}</p>
          <MadeByCredit className="shrink-0 text-right" />
        </div>
        <p className="mt-1 text-base font-medium text-brown-sugar">
          {displayNickname}
        </p>
        {signup?.runner_name &&
          signup.custom_name &&
          signup.runner_name !== signup.nickname && (
            <p className="mt-0.5 text-xs text-brown-sugar/50">
              {t("passport.originalName")}
              {signup.runner_name}
            </p>
          )}
      </header>

      {refreshing && !loading && (
        <p className="mb-2 text-center text-[10px] text-brown-sugar/45">
          {t("common.refreshing")}
        </p>
      )}

      {loading && (
        <p className="animate-pulse-soft text-center text-sm text-brown-sugar/60">
          {t("common.loading")}
        </p>
      )}

      {error && !loading && (
        <Card className="mb-4">
          <p className="text-red-bean text-sm">{error}</p>
        </Card>
      )}

      {signup && !loading && (
        <Card className="mb-4 border-2 border-mung-green/20 bg-mung-green/5">
          <p className="text-xs font-medium text-brown-sugar/60">
            {t("passport.myGoal")}
          </p>
          <p className="mt-1 text-lg font-bold text-mung-green">
            {signup.goal ?? "—"}
          </p>
          {(account?.collectTargets ?? []).length > 0 && (
            <div className="mt-4">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <p className="text-xs font-medium text-brown-sugar/60">
                  {t("passport.collectTokens")}
                </p>
                {(todayRun?.bowls_completed ?? 0) > 0 && (
                  <p className="text-xs font-semibold text-mung-green">
                    {t("passport.bowlsToday", {
                      count: todayRun!.bowls_completed,
                    })}
                  </p>
                )}
              </div>
              <ul className="space-y-2">
                {(account?.collectTargets ?? []).map((target) => {
                  const scanCount = todayTokenCounts.get(target.id) ?? 0;
                  return (
                    <li
                      key={target.id}
                      className="flex items-center justify-between rounded-xl bg-cream/80 px-3 py-2 text-sm"
                    >
                      <span className="flex items-center gap-2 font-medium text-brown-sugar">
                        {getTokenLabelLocalized(
                          target.id as TokenTypeId,
                          locale
                        )}
                        {target.id === "tofu" && (
                          <span className="rounded-full bg-sunset/25 px-1.5 py-0.5 text-[10px] font-medium text-brown-sugar/80">
                            {t("passport.baseTofuRequired")}
                          </span>
                        )}
                      </span>
                      <span className="text-right text-xs text-brown-sugar/55">
                        <span className="block">
                          {getTokenZoneLocalized(
                            target.id as TokenTypeId,
                            locale
                          )}
                        </span>
                        {scanCount > 0 ? (
                          <span className="mt-0.5 block font-medium text-mung-green">
                            {t("passport.tokenScanned", { count: scanCount })}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {signup.goal === PURE_DOUHUA_GOAL && (
            <p className="mt-3 text-xs text-brown-sugar/60">
              {t("passport.pureRouteHint")}
            </p>
          )}
        </Card>
      )}

      {signup && !loading && (
        <div className="mb-4 space-y-2">
          {siteConfig.showLiveEntry && (
            <Button href="/live" className="w-full">
              {t("passport.enterLive")}
            </Button>
          )}
          {/* Ground 看板暫停使用
          {hasJoinedToday && siteConfig.showLiveEntry && (
            <Button href="/live/ground" variant="secondary" className="w-full">
              {t("live.viewGround")}
            </Button>
          )}
          */}
          <Button href="/lobby" variant="secondary" className="w-full">
            {t("passport.viewLobby")}
          </Button>
        </div>
      )}

      {hasJoinedToday && siteConfig.showLiveEntry && (
        <p className="mb-4 text-center text-xs text-mung-green">
          {t("passport.joinedToday")}
        </p>
      )}

      {signup && !loading && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold leading-none text-brown-sugar/70">
              {t("passport.activityLog")}
            </h2>
            <button
              type="button"
              onClick={handleLogout}
              className="shrink-0 cursor-pointer text-xs font-medium leading-none text-brown-sugar/55 underline underline-offset-2 hover:text-brown-sugar/80"
            >
              {t("passport.logout")}
            </button>
          </div>
          {activityRuns.length > 0 &&
            activityRuns.map((run) => {
            const duration =
              run.completed_at &&
              formatDurationMinutes(run.joined_at, run.completed_at);
            const tokenGroups = tokenGroupsForRun(run);

            return (
              <Card
                key={run.session_date}
                className="border-l-4 border-sunset/50"
              >
                <p className="text-lg font-semibold text-brown-sugar">
                  {t("passport.earned")}
                  {signup?.goal ? (
                    signup.goal
                  ) : run.tofu_type ? (
                    <>
                      {tofuEmoji(run.tofu_type)}{" "}
                      {getTofuLabelLocalized(run.tofu_type, locale)}
                    </>
                  ) : (
                    <span className="text-brown-sugar/50">{recordEmpty}</span>
                  )}
                </p>
                {run.bowls_completed > 0 ? (
                  <p className="mt-1 text-sm font-medium text-mung-green">
                    {t("passport.bowlsCompleted", {
                      count: run.bowls_completed,
                    })}
                  </p>
                ) : null}
                <p className="mt-0.5 text-xs text-brown-sugar/50">
                  {run.session_date}
                </p>
                <div className="mt-2 text-sm text-brown-sugar">
                  <span className="text-brown-sugar/60">Token</span>
                  {tokenGroups.length > 0 ? (
                    <ul className="mt-1 space-y-1">
                      {tokenGroups.map((row) => (
                        <li key={row.id}>
                          ·{" "}
                          {getTokenLabelLocalized(row.id as TokenTypeId, locale)}{" "}
                          ×{row.count}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="ml-1 text-brown-sugar/50">
                      {recordEmpty}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-mung-green">
                  {t("passport.completionTime")}
                  {duration != null ? (
                    `${duration} ${t("common.minutes")}`
                  ) : (
                    <span className="text-brown-sugar/50">{recordEmpty}</span>
                  )}
                </p>
              </Card>
            );
          })}
        </section>
      )}

      {hasJoinedToday && (
        <div className="mt-6 pb-4">
          <Button href="/lobby" variant="secondary" className="w-full">
            {t("passport.goLobby")}
          </Button>
        </div>
      )}
    </PageShell>
  );
}
