"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/components/LocaleProvider";
import { PageFooterNav } from "@/components/PageFooterNav";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TokenEarnedToast } from "@/components/TokenEarnedToast";
import { useLiveRoom } from "@/hooks/useLiveRoom";
import { useTokenRealtime } from "@/hooks/useTokenRealtime";
import {
  consumePendingTokenEarn,
  getStoredLiveRunnerId,
  setStoredLiveRunnerId,
} from "@/lib/liveSession";
import { useStoredGoingAccount } from "@/hooks/useStoredGoingAccount";
import { useStoredPlayerSnapshot } from "@/hooks/useStoredPlayer";
import { getCurrentPosition } from "@/lib/geolocation";
import { setStoredGoingAccount } from "@/lib/goingAccount";
import { setStoredPlayer } from "@/lib/player";
import { normalizeRunnerId } from "@/lib/runner";
import { LiveParticipantTokenIcons } from "@/components/LiveParticipantTokenIcons";

/** 在線：實心綠點（與 Ground 完成用的 ✓ 區隔） */
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

function LivePageContent() {
  const { t, localizeError } = useLocale();
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
  const autoEnterTriedRef = useRef(false);
  const mounted = goingMounted && playerMounted;
  const {
    participants,
    sessionDateLabel,
    sessionId,
    count,
    onlineCount,
    loading,
    refreshing,
    error,
    hasCachedData,
    reload,
  } = useLiveRoom(enteredRunnerId);

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
      setStoredLiveRunnerId(data.runnerId);
    } catch (e) {
      setEnterError(
        e instanceof Error ? localizeError(e.message) : t("common.enterFailed")
      );
    } finally {
      setEntering(false);
    }
  }, [player, localizeError, t]);

  useEffect(() => {
    if (!mounted || enteredRunnerId) return;
    const autoId = player?.runnerId ?? going?.runnerId;
    if (autoId && !runnerIdInput) setRunnerIdInput(autoId);
  }, [mounted, enteredRunnerId, player?.runnerId, going?.runnerId, runnerIdInput]);

  useEffect(() => {
    if (!mounted) return;
    const pending = consumePendingTokenEarn();
    if (pending) setEarnedTokenType(pending.tokenType);
    const restored = getStoredLiveRunnerId();
    if (restored) {
      setEnteredRunnerId(restored);
      autoEnterTriedRef.current = true;
    }
    setStorageReady(true);
  }, [mounted]);

  useEffect(() => {
    if (!mounted || enteredRunnerId || entering || autoEnterTriedRef.current) {
      return;
    }
    const autoId = player?.runnerId ?? going?.runnerId;
    if (!autoId) return;
    autoEnterTriedRef.current = true;
    void enterLive(autoId);
  }, [mounted, enteredRunnerId, entering, player?.runnerId, going?.runnerId, enterLive]);

  if (!mounted || !storageReady) {
    return (
      <PageShell>
        <p className="animate-pulse-soft py-16 text-center text-sm text-brown-sugar/60">
          {t("common.loading")}
        </p>
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
        <h1 className="text-2xl font-bold text-brown-sugar">{t("live.todayOnSite")}</h1>
        <p className="mt-1 text-sm text-brown-sugar/65">{sessionDateLabel || t("common.today")}</p>
        <p className="mt-2 text-sm text-twilight">{t("live.youLabel")}<span className="font-mono font-semibold">{enteredRunnerId}</span></p>
      </header>
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-brown-sugar">{t("live.participants")}</h2>
            <p className="text-xs text-brown-sugar/50">{t("live.countOnline", { count: loading && count === 0 ? "…" : count, online: loading && onlineCount === 0 && count === 0 ? "…" : onlineCount })}{refreshing && <span className="ml-1.5 text-brown-sugar/40">{t("common.refreshing")}</span>}</p>
          </div>
          <button type="button" onClick={() => void reload()} disabled={refreshing} className="text-xs text-brown-sugar/60 underline disabled:opacity-40">{refreshing ? t("common.refreshing") : t("common.refresh")}</button>
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
              return (
                <li key={p.user_id} className={`flex items-center gap-2 py-3 ${isMe ? "bg-sunset/10 -mx-1 rounded-xl px-1" : ""}`}>
                  <div className="w-[6.75rem] min-w-0 shrink-0">
                    <p className="truncate font-mono text-sm font-semibold text-twilight">{p.runner_id}</p>
                    <p className="truncate text-sm text-brown-sugar">{p.display_name}</p>
                    {p.goal && <p className="mt-0.5 truncate text-xs text-mung-green">{p.goal}</p>}
                  </div>
                  <LiveParticipantTokenIcons tokenIds={p.earned_token_ids ?? []} className="min-w-0 flex-1" />
                  <div className="flex shrink-0 items-center gap-2">
                    {isMe && <span className="rounded-full bg-sunset/20 px-2 py-0.5 text-[10px] font-medium text-brown-sugar">{t("common.you")}</span>}
                    {p.is_online ? <OnlineBadge label={t("live.online")} /> : <span className="h-6 w-6 shrink-0 rounded-full border border-brown-sugar/15 bg-cream/80" aria-hidden />}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <p className="mt-4 text-center text-[11px] text-brown-sugar/50">{t("live.onlineHint")}</p>
      <div className="mt-5 space-y-3">
        <Button href="/live/ground" className="w-full">
          {t("live.viewGround")}
        </Button>
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
