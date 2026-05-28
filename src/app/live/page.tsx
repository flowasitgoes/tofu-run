"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/components/LocaleProvider";
import { PageFooterNav } from "@/components/PageFooterNav";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TokenEarnedToast } from "@/components/TokenEarnedToast";
import { useLiveRoom } from "@/hooks/useLiveRoom";
import { useTokenRealtime } from "@/hooks/useTokenRealtime";
import { useLiveStatus } from "@/hooks/useLiveStatus";
import {
  clearStoredLiveSession,
  consumePendingTokenEarn,
  getStoredLiveContext,
  setStoredLiveRunnerId,
  syncStoredLiveWithActive,
} from "@/lib/liveSession";
import { useStoredGoingAccount } from "@/hooks/useStoredGoingAccount";
import { useStoredPlayerSnapshot } from "@/hooks/useStoredPlayer";
import { getCurrentPosition } from "@/lib/geolocation";
import { setStoredGoingAccount } from "@/lib/goingAccount";
import { getStoredPlayer, setStoredPlayer } from "@/lib/player";
import { LiveCompletedTimeWithRank } from "@/components/LiveCompletedTimeWithRank";
import { formatTaipeiTime } from "@/lib/format-time";
import { buildCompletionRanks } from "@/lib/live-completion-rank";
import { countCompletedBowls } from "@/lib/ground-completion";
import { normalizeRunnerId } from "@/lib/runner";
import { LiveActivityFeed } from "@/components/LiveActivityFeed";
import { LiveCompleteBadge } from "@/components/LiveCompleteBadge";
import { cumulativeDistanceFromTokenIds } from "@/lib/distance";
import {
  LiveParticipantTokenIcons,
  LiveTofuProgressRow,
} from "@/components/LiveParticipantTokenIcons";
import { LiveTokenScanner } from "@/components/LiveTokenScanner";

/** 上線：實心綠點（與 Ground 完成用的 ✓ 區隔） */
function OnlineBadge({ label }: { label: string }) {
  return (
    <span
      className="relative flex h-6 w-6 shrink-0 items-center justify-center"
      title={label}
      aria-label={label}
    >
      <span
        className="absolute h-6 w-6 rounded-full bg-mung-green/20"
        aria-hidden
      />
      <span
        className="relative h-3 w-3 rounded-full bg-mung-green ring-2 ring-cream"
        aria-hidden
      />
    </span>
  );
}

/** 下線：灰色圓點（與上線綠點同一位置、同一尺寸） */
function OfflineBadge({ label }: { label: string }) {
  return (
    <span
      className="relative flex h-6 w-6 shrink-0 items-center justify-center"
      title={label}
      aria-label={label}
    >
      <span
        className="absolute h-6 w-6 rounded-full bg-brown-sugar/12"
        aria-hidden
      />
      <span
        className="relative h-3 w-3 rounded-full bg-brown-sugar/35 ring-2 ring-cream"
        aria-hidden
      />
    </span>
  );
}

function LivePageContent() {
  const { locale, t, localizeError } = useLocale();
  const searchParams = useSearchParams();
  const fromQr = searchParams.get("from") === "qr";
  const { account: going, mounted: goingMounted } = useStoredGoingAccount();
  const { player, mounted: playerMounted } = useStoredPlayerSnapshot();
  const [enteredRunnerId, setEnteredRunnerId] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [earnedTokenType, setEarnedTokenType] = useState<string | null>(null);
  const [runnerIdInput, setRunnerIdInput] = useState("");
  const [entering, setEntering] = useState(false);
  const [enterError, setEnterError] = useState<string | null>(null);
  const [distanceVisibleByUser, setDistanceVisibleByUser] = useState<
    Record<string, boolean>
  >({});
  const autoEnterTriedRef = useRef(false);
  const hydratePlayerTriedRef = useRef(false);
  const prevBowlsByUserRef = useRef<Record<string, number>>({});
  const distanceTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );
  const distanceInitDoneRef = useRef(false);
  const mounted = goingMounted && playerMounted;
  const {
    status: liveStatus,
    loading: liveStatusLoading,
    refresh: refreshLiveStatus,
  } = useLiveStatus();
  const activeSessionId = liveStatus.sessionId;

  const {
    participants,
    feed,
    sessionDateLabel,
    sessionId,
    count,
    onlineCount,
    loading,
    refreshing,
    error,
    hasCachedData,
    reload,
    applyTokenEarned,
  } = useLiveRoom(enteredRunnerId, activeSessionId);

  const completionRanks = useMemo(
    () => buildCompletionRanks(participants),
    [participants]
  );

  const handleTokenScanned = useCallback(
    (event: Parameters<typeof applyTokenEarned>[0]) => {
      setEarnedTokenType(event.tokenType);
      applyTokenEarned(event);
    },
    [applyTokenEarned]
  );

  useTokenRealtime({
    userId: player?.runnerId === enteredRunnerId ? player.userId : null,
    sessionId: sessionId ?? null,
    onTokenEarned: ({ token }) => setEarnedTokenType(token.token_type),
    enabled: Boolean(enteredRunnerId && sessionId && player?.userId),
  });

  const enterLive = useCallback(async (rawId: string) => {
    const runnerId = normalizeRunnerId(rawId);
    if (!runnerId) {
      setEnterError(t("live.enterRunnerId"));
      return;
    }
    setEntering(true);
    setEnterError(null);
    try {
      const geo = await getCurrentPosition();
      const res = await fetch("/api/live/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runnerId,
          userId: player?.runnerId === runnerId ? player.userId : undefined,
          lat: geo?.lat ?? null,
          lng: geo?.lng ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("common.enterFailed"));
      setStoredGoingAccount({ runnerId: data.runnerId });
      setStoredPlayer({ userId: data.userId, runnerId: data.runnerId, runnerName: data.runnerName });
      setEnteredRunnerId(data.runnerId);
      setStoredLiveRunnerId(
        data.runnerId,
        data.sessionId as string,
        data.sessionDate as string
      );
      void refreshLiveStatus();
    } catch (e) {
      setEnterError(
        e instanceof Error ? localizeError(e.message) : t("common.enterFailed")
      );
    } finally {
      setEntering(false);
    }
  }, [player, localizeError, t, refreshLiveStatus]);

  useEffect(() => {
    syncStoredLiveWithActive(activeSessionId);
    if (liveStatus.phase !== "active" && enteredRunnerId) {
      setEnteredRunnerId(null);
    }
  }, [liveStatus.phase, activeSessionId, enteredRunnerId]);

  useEffect(() => {
    if (!mounted || enteredRunnerId) return;
    const autoId = player?.runnerId ?? going?.runnerId;
    if (autoId && !runnerIdInput) setRunnerIdInput(autoId);
  }, [mounted, enteredRunnerId, player?.runnerId, going?.runnerId, runnerIdInput]);

  useEffect(() => {
    if (!mounted) return;
    const pending = consumePendingTokenEarn(activeSessionId);
    if (pending) setEarnedTokenType(pending.tokenType);
    const restored = getStoredLiveContext();
    if (
      restored &&
      activeSessionId &&
      restored.sessionId === activeSessionId
    ) {
      setEnteredRunnerId(restored.runnerId);
      const stored = getStoredPlayer();
      if (
        stored?.userId &&
        normalizeRunnerId(stored.runnerId) ===
          normalizeRunnerId(restored.runnerId)
      ) {
        autoEnterTriedRef.current = true;
      }
    } else if (
      restored &&
      activeSessionId &&
      restored.sessionId !== activeSessionId
    ) {
      clearStoredLiveSession();
    }
    setStorageReady(true);
  }, [mounted, activeSessionId]);

  useEffect(() => {
    if (!mounted || enteredRunnerId || entering || autoEnterTriedRef.current) {
      return;
    }
    const autoId = player?.runnerId ?? going?.runnerId;
    if (!autoId) return;
    autoEnterTriedRef.current = true;
    void enterLive(autoId);
  }, [mounted, enteredRunnerId, entering, player?.runnerId, going?.runnerId, enterLive]);

  /** 僅還原 runnerId、本地無護照 userId 時，再 enter 一次以顯示頁首掃描鈕 */
  useEffect(() => {
    if (
      !mounted ||
      !storageReady ||
      !enteredRunnerId ||
      player?.userId ||
      entering ||
      hydratePlayerTriedRef.current
    ) {
      return;
    }
    hydratePlayerTriedRef.current = true;
    void enterLive(enteredRunnerId);
  }, [
    mounted,
    storageReady,
    enteredRunnerId,
    player?.userId,
    entering,
    enterLive,
  ]);

  useEffect(() => {
    const nextBowlsByUser: Record<string, number> = {};
    for (const p of participants) {
      nextBowlsByUser[p.user_id] = countCompletedBowls(
        p.required_token_ids ?? [],
        p.earned_token_ids ?? []
      );
    }

    if (!distanceInitDoneRef.current) {
      prevBowlsByUserRef.current = nextBowlsByUser;
      distanceInitDoneRef.current = true;
      return;
    }

    for (const [userId, bowls] of Object.entries(nextBowlsByUser)) {
      const prevBowls = prevBowlsByUserRef.current[userId] ?? 0;
      if (bowls > prevBowls) {
        setDistanceVisibleByUser((prevState) => ({ ...prevState, [userId]: true }));

        if (distanceTimersRef.current[userId]) {
          clearTimeout(distanceTimersRef.current[userId]);
        }

        distanceTimersRef.current[userId] = setTimeout(() => {
          setDistanceVisibleByUser((prevState) => ({
            ...prevState,
            [userId]: false,
          }));
          delete distanceTimersRef.current[userId];
        }, 5000);
      }
    }

    prevBowlsByUserRef.current = nextBowlsByUser;
  }, [participants]);

  useEffect(() => {
    return () => {
      for (const timer of Object.values(distanceTimersRef.current)) {
        clearTimeout(timer);
      }
    };
  }, []);

  if (!mounted || !storageReady || liveStatusLoading) {
    return (
      <PageShell>
        <p className="animate-pulse-soft py-16 text-center text-sm text-brown-sugar/60">
          {t("common.loading")}
        </p>
      </PageShell>
    );
  }

  if (liveStatus.phase !== "active") {
    return (
      <PageShell>
        <header className="mb-6 text-center">
          <p className="text-xs font-medium tracking-wide text-red-bean">LIVE</p>
          <h1 className="mt-1 text-2xl font-bold text-brown-sugar">
            {t("live.inactiveTitle")}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-brown-sugar/70">
            {t("live.inactiveHint")}
          </p>
        </header>
        <Card className="border border-brown-sugar/15 bg-cream">
          <div className="flex flex-col gap-2">
            <Button href="/passport" variant="secondary" className="w-full">
              {t("live.myPassport")}
            </Button>
            <Button href="/" variant="secondary" className="w-full">
              {t("live.backHome")}
            </Button>
          </div>
        </Card>
        <div className="mt-5">
          <PageFooterNav />
        </div>
      </PageShell>
    );
  }

  if (!enteredRunnerId) {
    return (
      <PageShell>
        <header className="mb-6 text-center">
          <p className="text-xs font-medium tracking-wide text-red-bean">LIVE</p>
          <h1 className="mt-1 text-2xl font-bold text-brown-sugar">
            {t("live.enterTitle")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-brown-sugar/70">
            {fromQr ? t("live.fromQr") : t("live.enterHint")}
          </p>
        </header>
        <Card className="border-2 border-red-bean/20 bg-gradient-to-br from-red-bean/5 to-cream">
          <form onSubmit={(e) => { e.preventDefault(); void enterLive(runnerIdInput); }} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-brown-sugar/70">
                {t("common.runnerId")}
              </span>
              <input type="text" value={runnerIdInput} onChange={(e) => { setRunnerIdInput(e.target.value.toUpperCase()); setEnterError(null); }} placeholder={t("common.exampleRunnerId")} autoComplete="off" className="w-full rounded-xl border border-brown-sugar/15 bg-cream px-4 py-3 font-mono text-sm tracking-wide text-brown-sugar outline-none focus:border-red-bean/50 focus:ring-2 focus:ring-red-bean/15" />
            </label>
            {enterError && <p className="rounded-lg bg-red-bean/10 px-3 py-2 text-xs text-red-bean">{enterError}</p>}
            <Button type="submit" className="w-full" disabled={entering || !runnerIdInput.trim()}>{entering ? t("live.entering") : t("live.enter")}</Button>
          </form>
          <p className="mt-4 text-center text-[11px] text-brown-sugar/50">{t("live.signupFirst")}</p>
          <div className="mt-3 flex gap-2">
            <Button href="/passport" variant="secondary" className="flex-1 text-xs">{t("live.passportLogin")}</Button>
            <Button href="/" variant="secondary" className="flex-1 text-xs">{t("live.backHome")}</Button>
          </div>
        </Card>
      </PageShell>
    );
  }

  const showEmpty =
    !loading && !error && participants.length === 0 && !hasCachedData;
  const showList = participants.length > 0 || (hasCachedData && loading);

  return (
    <PageShell>
      {earnedTokenType && (
        <TokenEarnedToast
          tokenType={earnedTokenType}
          onDone={() => setEarnedTokenType(null)}
        />
      )}
      <header className="mb-6">
        <p className="text-xs font-medium tracking-wide text-red-bean">LIVE</p>
        <div className="mt-0.5 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-brown-sugar">
              {t("live.todayOnSite")}
            </h1>
            <p className="mt-1 text-sm text-brown-sugar/65">
              {sessionDateLabel ||
                liveStatus.sessionDateLabel ||
                t("common.today")}
            </p>
            <p className="mt-2 text-sm text-twilight">
              {t("live.youLabel")}
              <span className="font-mono font-semibold">{enteredRunnerId}</span>
            </p>
          </div>
          {player?.userId ? (
            <LiveTokenScanner
              placement="header"
              userId={player.userId}
              runnerId={player.runnerId}
              runnerName={player.runnerName}
              disabled={refreshing}
              onScanned={handleTokenScanned}
            />
          ) : null}
        </div>
      </header>
      <Card>
        <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          <div className="min-w-0">
            <h2 className="font-semibold text-brown-sugar">{t("live.participants")}</h2>
            <p className="text-xs text-brown-sugar/50">
              {t("live.countOnline", {
                count: loading && count === 0 ? "…" : count,
                online:
                  loading && onlineCount === 0 && count === 0 ? "…" : onlineCount,
              })}
              {refreshing && (
                <span className="ml-1.5 text-brown-sugar/40">
                  {t("common.refreshing")}
                </span>
              )}
            </p>
          </div>
          <h2 className="pt-0.5 text-center text-sm font-semibold text-brown-sugar whitespace-nowrap">
            {t("live.tokenProgress")}
          </h2>
          <button
            type="button"
            onClick={() => void reload()}
            disabled={refreshing}
            className="justify-self-end text-xs text-brown-sugar/60 underline disabled:opacity-40"
          >
            {refreshing ? t("common.refreshing") : t("common.refresh")}
          </button>
        </div>
        {loading && !showList && !hasCachedData && (
          <p className="animate-pulse-soft py-8 text-center text-sm text-brown-sugar/60">
            {t("common.loading")}
          </p>
        )}
        {error && !showList && (
          <p className="py-4 text-center text-sm text-red-bean">{error}</p>
        )}
        {error && showList && (
          <p className="mb-2 text-center text-xs text-red-bean/80">
            {t("common.refreshFailed")}
          </p>
        )}
        {showEmpty && (
          <p className="py-8 text-center text-sm text-brown-sugar/60">
            {t("live.firstIn")}
          </p>
        )}
        {showList && (
          <ul className="divide-y divide-brown-sugar/8">
            {participants.map((p) => {
              const isMe = enteredRunnerId === p.runner_id;
              const isReady = (p.earned_token_ids ?? []).includes("start");
              const cumulativeMeters =
                cumulativeDistanceFromTokenIds(p.earned_token_ids ?? []) * 1.3;
              const completionRank = completionRanks.get(p.user_id);
              const bowlsDone = countCompletedBowls(
                p.required_token_ids ?? [],
                p.earned_token_ids ?? []
              );
              return (
                <li key={p.user_id} className={`flex items-start gap-2 py-3 ${isMe ? "bg-sunset/10 -mx-1 rounded-xl px-1" : ""}`}>
                  <div className="min-w-0 shrink-0">
                    <p className="flex items-center gap-1 truncate font-mono text-sm font-semibold text-twilight">
                      <span className="truncate">{p.runner_id}</span>
                      {isReady ? (
                        <span className="rounded-full bg-mung-green px-1.5 py-0.5 text-[10px] font-semibold leading-none text-cream">
                          ready
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-sm text-brown-sugar">{p.display_name}</p>
                    {p.goal && <p className="mt-0.5 truncate text-xs text-mung-green">{p.goal}</p>}
                    <LiveTofuProgressRow
                      tokenIds={p.earned_token_ids ?? []}
                      className="mt-1.5"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1 overflow-visible">
                    {bowlsDone > 0 ? (
                      <div className="flex justify-center">
                        <LiveCompleteBadge
                          variant="earned"
                          earnedLabel={t("live.earnedBowls", {
                            count: bowlsDone,
                          })}
                          label={t("ground.completeDone")}
                        />
                      </div>
                    ) : null}
                    <LiveParticipantTokenIcons
                      tokenIds={p.earned_token_ids ?? []}
                      className="min-w-0 w-full max-w-[128px] overflow-visible"
                      showScanCounts
                    />
                    {/*
                    <p
                      className={`mt-[7px] text-center text-[11px] text-brown-sugar/60 transition-opacity duration-300 ${
                        distanceVisibleByUser[p.user_id]
                          ? "opacity-100"
                          : "opacity-0"
                      }`}
                    >
                      累計距離：{cumulativeMeters.toFixed(1)} m
                    </p>
                    */}
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-0 self-center pl-0.5">
                      {isMe ? (
                        <span className="-mt-1 mb-0.5 rounded-full bg-sunset/20 px-2 py-0.5 text-[10px] font-medium leading-none text-brown-sugar">
                          {t("common.you")}
                        </span>
                      ) : null}
                      <div className="my-1">
                        {p.is_online ? (
                          <OnlineBadge label={t("live.online")} />
                        ) : (
                          <OfflineBadge label={t("live.offline")} />
                        )}
                      </div>
                      {p.is_complete && p.completed_at && completionRank ? (
                        <LiveCompletedTimeWithRank
                          completedAt={p.completed_at}
                          rank={completionRank}
                          locale={locale}
                          rankAriaLabel={t("live.completionRank", {
                            rank: completionRank,
                          })}
                        />
                      ) : p.is_complete && p.completed_at ? (
                        <time
                          dateTime={p.completed_at}
                          className="mr-1.5 text-[10px] text-brown-sugar/60 whitespace-nowrap"
                        >
                          {formatTaipeiTime(p.completed_at, locale)}
                        </time>
                      ) : (
                        <span
                          className="mr-1.5 text-[10px] text-brown-sugar/30"
                          aria-hidden
                        >
                          —
                        </span>
                      )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <p className="mt-4 whitespace-pre-line text-center text-[11px] leading-relaxed text-brown-sugar/50">
        {t("live.onlineHint")}
      </p>
      {enteredRunnerId ? <LiveActivityFeed feed={feed} /> : null}
      <div className="mt-4">
        <img
          src="/full-stops.jpg"
          alt="活動地圖與補給點"
          className="w-full rounded-2xl border border-brown-sugar/10 shadow-sm"
          loading="lazy"
        />
      </div>
      <div className="mt-5 space-y-3">
        <Button href="/passport" variant="secondary" className="w-full">{t("live.myPassport")}</Button>
        <PageFooterNav />
      </div>
    </PageShell>
  );
}

export default function LivePage() {
  return (
    <Suspense fallback={<PageShell><p className="animate-pulse-soft py-16 text-center text-sm text-brown-sugar/60">Loading…</p></PageShell>}>
      <LivePageContent />
    </Suspense>
  );
}
