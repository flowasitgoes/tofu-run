"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageFooterNav } from "@/components/PageFooterNav";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useLiveRoom } from "@/hooks/useLiveRoom";
import { useStoredGoingAccount } from "@/hooks/useStoredGoingAccount";
import { useStoredPlayerSnapshot } from "@/hooks/useStoredPlayer";
import { getCurrentPosition } from "@/lib/geolocation";
import { setStoredGoingAccount } from "@/lib/goingAccount";
import { setStoredPlayer } from "@/lib/player";
import { normalizeRunnerId } from "@/lib/runner";

function OnlineBadge() {
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mung-green text-cream"
      title="在線"
      aria-label="在線"
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 8.5l3 3 7-7" />
      </svg>
    </span>
  );
}

function LivePageContent() {
  const searchParams = useSearchParams();
  const fromQr = searchParams.get("from") === "qr";
  const { account: going, mounted: goingMounted } = useStoredGoingAccount();
  const { player, mounted: playerMounted } = useStoredPlayerSnapshot();
  const [enteredRunnerId, setEnteredRunnerId] = useState<string | null>(null);
  const [runnerIdInput, setRunnerIdInput] = useState("");
  const [entering, setEntering] = useState(false);
  const [enterError, setEnterError] = useState<string | null>(null);
  const autoEnterTriedRef = useRef(false);
  const mounted = goingMounted && playerMounted;
  const { participants, sessionDateLabel, count, onlineCount, loading, refreshing, error, reload } = useLiveRoom(enteredRunnerId);

  const enterLive = useCallback(async (rawId: string) => {
    const runnerId = normalizeRunnerId(rawId);
    if (!runnerId) { setEnterError("請輸入 Runner ID"); return; }
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
      if (!res.ok) throw new Error(data.error ?? "進入失敗");
      setStoredGoingAccount({ runnerId: data.runnerId });
      setStoredPlayer({ userId: data.userId, runnerId: data.runnerId, runnerName: data.runnerName });
      setEnteredRunnerId(data.runnerId);
    } catch (e) {
      setEnterError(e instanceof Error ? e.message : "進入失敗");
    } finally {
      setEntering(false);
    }
  }, [player]);

  useEffect(() => {
    if (!mounted || enteredRunnerId) return;
    const autoId = player?.runnerId ?? going?.runnerId;
    if (autoId && !runnerIdInput) setRunnerIdInput(autoId);
  }, [mounted, enteredRunnerId, player?.runnerId, going?.runnerId, runnerIdInput]);

  useEffect(() => {
    if (!mounted || enteredRunnerId || entering || autoEnterTriedRef.current) {
      return;
    }
    const autoId = player?.runnerId ?? going?.runnerId;
    if (!autoId) return;
    autoEnterTriedRef.current = true;
    void enterLive(autoId);
  }, [mounted, enteredRunnerId, entering, player?.runnerId, going?.runnerId, enterLive]);

  if (!mounted) {
    return <PageShell><p className="animate-pulse-soft py-16 text-center text-sm text-brown-sugar/60">載入中…</p></PageShell>;
  }

  if (!enteredRunnerId) {
    return (
      <PageShell>
        <header className="mb-6 text-center">
          <p className="text-xs font-medium tracking-wide text-red-bean">LIVE</p>
          <h1 className="mt-1 text-2xl font-bold text-brown-sugar">進入今日房間</h1>
          <p className="mt-2 text-sm leading-relaxed text-brown-sugar/70">
            {fromQr
              ? "掃碼成功！請輸入你的 Runner ID 進場。"
              : "須輸入 Runner ID 才能進入，我們才知道你是誰。"}
          </p>
        </header>
        <Card className="border-2 border-red-bean/20 bg-gradient-to-br from-red-bean/5 to-cream">
          <form onSubmit={(e) => { e.preventDefault(); void enterLive(runnerIdInput); }} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-brown-sugar/70">Runner ID</span>
              <input type="text" value={runnerIdInput} onChange={(e) => { setRunnerIdInput(e.target.value.toUpperCase()); setEnterError(null); }} placeholder="例如：DOG-214" autoComplete="off" className="w-full rounded-xl border border-brown-sugar/15 bg-cream px-4 py-3 font-mono text-sm tracking-wide text-brown-sugar outline-none focus:border-red-bean/50 focus:ring-2 focus:ring-red-bean/15" />
            </label>
            {enterError && <p className="rounded-lg bg-red-bean/10 px-3 py-2 text-xs text-red-bean">{enterError}</p>}
            <Button type="submit" className="w-full" disabled={entering || !runnerIdInput.trim()}>{entering ? "進入中…" : "進入 LIVE"}</Button>
          </form>
          <p className="mt-4 text-center text-[11px] text-brown-sugar/50">須先完成首頁「想參加」報名。</p>
          <div className="mt-3 flex gap-2">
            <Button href="/passport" variant="secondary" className="flex-1 text-xs">護照登入</Button>
            <Button href="/" variant="secondary" className="flex-1 text-xs">回首頁</Button>
          </div>
        </Card>
      </PageShell>
    );
  }

  const showEmpty = !loading && !error && participants.length === 0;
  const showList = participants.length > 0;

  return (
    <PageShell>
      <header className="mb-6">
        <p className="text-xs font-medium tracking-wide text-red-bean">LIVE</p>
        <h1 className="text-2xl font-bold text-brown-sugar">今日在場</h1>
        <p className="mt-1 text-sm text-brown-sugar/65">{sessionDateLabel || "今日"}</p>
        <p className="mt-2 text-sm text-twilight">你：<span className="font-mono font-semibold">{enteredRunnerId}</span></p>
      </header>
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-brown-sugar">進場的人</h2>
            <p className="text-xs text-brown-sugar/50">共 {loading && count === 0 ? "…" : count} 人 · 在線 {loading && onlineCount === 0 && count === 0 ? "…" : onlineCount} 人{refreshing && <span className="ml-1.5 text-brown-sugar/40">更新中</span>}</p>
          </div>
          <button type="button" onClick={() => void reload()} disabled={refreshing} className="text-xs text-brown-sugar/60 underline disabled:opacity-40">{refreshing ? "更新中…" : "重新整理"}</button>
        </div>
        {loading && !showList && (
          <p className="animate-pulse-soft py-8 text-center text-sm text-brown-sugar/60">
            載入中…
          </p>
        )}
        {error && !showList && (
          <p className="py-4 text-center text-sm text-red-bean">{error}</p>
        )}
        {error && showList && (
          <p className="mb-2 text-center text-xs text-red-bean/80">
            更新失敗，顯示的是上次資料
          </p>
        )}
        {showEmpty && (
          <p className="py-8 text-center text-sm text-brown-sugar/60">
            你是第一個進場的 🥣
          </p>
        )}
        {showList && (
          <ul className="divide-y divide-brown-sugar/8">
            {participants.map((p) => {
              const isMe = enteredRunnerId === p.runner_id;
              return (
                <li key={p.user_id} className={`flex items-center gap-3 py-3 ${isMe ? "bg-sunset/10 -mx-1 rounded-xl px-1" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold text-twilight">{p.runner_id}</p>
                    <p className="truncate text-sm text-brown-sugar">{p.display_name}</p>
                    {p.goal && <p className="mt-0.5 truncate text-xs text-mung-green">{p.goal}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {isMe && <span className="rounded-full bg-sunset/20 px-2 py-0.5 text-[10px] font-medium text-brown-sugar">你</span>}
                    {p.is_online ? <OnlineBadge /> : <span className="h-6 w-6 shrink-0 rounded-full border border-brown-sugar/15 bg-cream/80" aria-hidden />}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <p className="mt-4 text-center text-[11px] text-brown-sugar/50">綠色 ✓ 代表此刻也在 LIVE 頁面</p>
      <div className="mt-5 space-y-3">
        <Button href="/passport" variant="secondary" className="w-full">我的豆花護照</Button>
        <PageFooterNav />
      </div>
    </PageShell>
  );
}

export default function LivePage() {
  return (
    <Suspense fallback={<PageShell><p className="animate-pulse-soft py-16 text-center text-sm text-brown-sugar/60">載入中…</p></PageShell>}>
      <LivePageContent />
    </Suspense>
  );
}
