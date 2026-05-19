"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MadeByCredit } from "@/components/MadeByCredit";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  PURE_DOUHUA_GOAL,
  TOFU_TYPES,
  getTokenLabel,
  getTofuLabel,
} from "@/lib/constants";
import {
  clearStoredGoingAccount,
  getStoredGoingAccount,
  setStoredGoingAccount,
} from "@/lib/goingAccount";
import {
  getPassportCache,
  setPassportCache,
} from "@/lib/passportCache";
import { useStoredPlayerSnapshot } from "@/hooks/useStoredPlayer";
import { clearStoredPlayer } from "@/lib/player";
import {
  formatDurationMinutes,
  getTodayDateString,
} from "@/lib/session";
import { siteConfig } from "@/lib/site";
import type { PassportAccount, PassportRun } from "@/types/database";

const RECORD_EMPTY = "---";

export default function PassportPage() {
  const [runnerIdInput, setRunnerIdInput] = useState("");
  const [sessionRunnerId, setSessionRunnerId] = useState<string | null>(null);
  const [account, setAccount] = useState<PassportAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
        if (!res.ok) throw new Error(data.error ?? "載入失敗");
        const next = data as PassportAccount;
        setAccount(next);
        setSessionRunnerId(runnerId);
        setStoredGoingAccount({ runnerId });
        setPassportCache(runnerId, next);
        setError(null);
      } catch (e) {
        if (!cached) {
          setError(e instanceof Error ? e.message : "載入失敗");
          setAccount(null);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    const stored = getStoredGoingAccount();
    if (stored?.runnerId) {
      loadAccount(stored.runnerId);
    } else {
      setLoading(false);
    }
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

  if (!sessionRunnerId && !loading) {
    return (
      <PageShell>
        <Card className="mt-8 text-center">
          <p className="text-4xl mb-4">📔</p>
          <h1 className="text-xl font-bold text-brown-sugar">豆花護照</h1>
          <p className="mt-2 text-sm leading-relaxed text-brown-sugar/70">
            完成首頁「想參加」後，用 Runner ID 登入即可查看你的帳戶與豆花目標。
          </p>
        </Card>

        <form onSubmit={handleLogin} className="mt-5 space-y-3">
          <label className="block text-left">
            <div className="mb-2.5 flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-brown-sugar/70">
                Runner ID
              </span>
              <MadeByCredit className="shrink-0 text-right" />
            </div>
            <input
              type="text"
              value={runnerIdInput}
              onChange={(e) =>
                setRunnerIdInput(e.target.value.toUpperCase())
              }
              placeholder="例如：DOG-214"
              className="w-full rounded-xl border border-brown-sugar/15 bg-cream px-4 py-3 font-mono text-sm text-brown-sugar outline-none focus:border-sunset/60 focus:ring-2 focus:ring-sunset/20"
            />
          </label>
          {error && (
            <p className="rounded-lg bg-red-bean/10 px-3 py-2 text-xs text-red-bean">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loginLoading}>
            {loginLoading ? "登入中…" : "登入護照"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-brown-sugar/50">
          還沒報名？
          <Link href="/" className="ml-1 underline">
            回首頁想參加
          </Link>
        </p>
      </PageShell>
    );
  }

  const signup = account?.signup;
  const displayNickname = signup?.nickname ?? signup?.runner_name ?? "—";

  const tofuEmoji = (id: string | null) =>
    TOFU_TYPES.find((t) => t.id === id)?.emoji ?? "🥣";

  const activityRuns: PassportRun[] =
    !signup || loading
      ? []
      : account && account.runs.length > 0
        ? account.runs
        : [
            {
              session_date: getTodayDateString(),
              tofu_type: null,
              completed_at: null,
              joined_at: "",
              tokens: [],
            },
          ];

  return (
    <PageShell>
      <header className="mb-6 text-center">
        <p className="text-4xl mb-2">📔</p>
        <h1 className="text-2xl font-bold text-brown-sugar">豆花護照</h1>
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
              名額原名：{signup.runner_name}
            </p>
          )}
      </header>

      {refreshing && !loading && (
        <p className="mb-2 text-center text-[10px] text-brown-sugar/45">
          更新中…
        </p>
      )}

      {loading && (
        <p className="animate-pulse-soft text-center text-sm text-brown-sugar/60">
          載入中…
        </p>
      )}

      {error && !loading && (
        <Card className="mb-4">
          <p className="text-red-bean text-sm">{error}</p>
        </Card>
      )}

      {signup && !loading && (
        <Card className="mb-4 border-2 border-mung-green/20 bg-mung-green/5">
          <p className="text-xs font-medium text-brown-sugar/60">我的目標</p>
          <p className="mt-1 text-lg font-bold text-mung-green">
            {signup.goal ?? "—"}
          </p>
          {signup.goal && signup.goal !== PURE_DOUHUA_GOAL && (
            <div className="mt-4">
              <p className="text-xs font-medium text-brown-sugar/60 mb-2">
                活動日要收集的 Token
              </p>
              <ul className="space-y-2">
                {(account?.collectTargets ?? []).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between rounded-xl bg-cream/80 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-brown-sugar">
                      {t.label}
                    </span>
                    <span className="text-xs text-brown-sugar/55">
                      {t.zone}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {signup.goal === PURE_DOUHUA_GOAL && (
            <p className="mt-3 text-xs text-brown-sugar/60">
              純粹豆花路線，無需收集配料 Token。
            </p>
          )}
        </Card>
      )}

      {signup && !loading && (
        <div className="mb-4 space-y-2">
          {siteConfig.showLiveEntry && (
            <Button href="/live" className="w-full">
              進入 LIVE 房間
            </Button>
          )}
          <Button href="/lobby" variant="secondary" className="w-full">
            查看想參加名單
          </Button>
        </div>
      )}

      {hasJoinedToday && siteConfig.showLiveEntry && (
        <p className="mb-4 text-center text-xs text-mung-green">
          今日已加入活動，可進 LIVE 或掃描 Token
        </p>
      )}

      {signup && !loading && activityRuns.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-brown-sugar/70">
            活動紀錄
          </h2>
          {activityRuns.map((run) => {
            const duration =
              run.completed_at &&
              formatDurationMinutes(run.joined_at, run.completed_at);

            return (
              <Card
                key={run.session_date + (run.joined_at || "placeholder")}
                className="border-l-4 border-sunset/50"
              >
                <p className="text-lg font-semibold text-brown-sugar">
                  獲得：
                  {run.tofu_type ? (
                    <>
                      {tofuEmoji(run.tofu_type)}{" "}
                      {getTofuLabel(run.tofu_type)}
                    </>
                  ) : (
                    <span className="text-brown-sugar/50">{RECORD_EMPTY}</span>
                  )}
                </p>
                <div className="mt-2 text-sm text-brown-sugar">
                  <span className="text-brown-sugar/60">Token</span>
                  {run.tokens.length > 0 ? (
                    <ul className="mt-1 space-y-1">
                      {run.tokens.map((t) => (
                        <li key={t.id}>· {getTokenLabel(t.token_type)}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="ml-1 text-brown-sugar/50">
                      {RECORD_EMPTY}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-mung-green">
                  完成時間：
                  {duration != null ? (
                    `${duration} 分鐘`
                  ) : (
                    <span className="text-brown-sugar/50">{RECORD_EMPTY}</span>
                  )}
                </p>
              </Card>
            );
          })}
        </section>
      )}

      <div className="mt-6 space-y-2 pb-4">
        {hasJoinedToday && (
          <Button href="/lobby" variant="secondary" className="w-full">
            前往 Lobby
          </Button>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="block w-full cursor-pointer text-center text-xs text-brown-sugar/50 underline hover:text-brown-sugar/70"
        >
          登出護照
        </button>
      </div>
    </PageShell>
  );
}
