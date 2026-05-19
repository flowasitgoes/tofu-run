"use client";

import { MadeByCredit } from "@/components/MadeByCredit";
import { PageFooterNav } from "@/components/PageFooterNav";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useLobbyList } from "@/hooks/useLobbyList";
import { useStoredGoingAccount } from "@/hooks/useStoredGoingAccount";
import { formatSignupDateTime } from "@/lib/formatSignupTime";

export default function LobbyPage() {
  const { signups, count, loading, refreshing, error, reload } = useLobbyList();
  const { account: me, logout } = useStoredGoingAccount();

  const showEmpty = !loading && !error && signups.length === 0;
  const showList = signups.length > 0;

  return (
    <PageShell>
      <header className="mb-6">
        <p className="text-xs text-brown-sugar/60">Lobby即將開始的活動</p>
        <h1 className="text-2xl font-bold text-brown-sugar">想參加名單…</h1>
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <p className="min-w-0 text-sm leading-relaxed text-brown-sugar/65">
            敬請期待一齊到現場的遊樂
          </p>
          <MadeByCredit className="shrink-0 text-right" />
        </div>
        {me && (
          <p className="mt-2 text-sm text-twilight">
            你已登入：<span className="font-mono">{me.runnerId}</span>
          </p>
        )}
      </header>

      {!me && (
        <Card className="mb-4 border-sunset/30 bg-sunset/5">
          <p className="text-sm leading-relaxed text-brown-sugar/80">
            到首頁點選想參加、或完成、或登入護照，開始熱身。
          </p>
          <div className="mt-3 flex gap-2">
            <Button href="/" variant="secondary" className="flex-1">
              回首頁報名
            </Button>
            <Button href="/passport" className="flex-1">
              護照登入
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-brown-sugar">想參加的人</h2>
            <p className="text-xs text-brown-sugar/50">
              共 {loading && count === 0 ? "…" : count} 人
              {refreshing && (
                <span className="ml-1.5 text-brown-sugar/40">更新中</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void reload()}
            disabled={refreshing}
            className="text-xs text-brown-sugar/60 underline disabled:opacity-40"
          >
            {refreshing ? "更新中…" : "重新整理"}
          </button>
        </div>

        {loading && (
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
            還沒有人報名，成為第一碗豆花吧 🥣
          </p>
        )}

        {showList && (
          <ul className="divide-y divide-brown-sugar/8">
            {signups.map((s) => {
              const isMe = me?.runnerId === s.runner_id;
              const displayName =
                s.nickname?.trim() || s.runner_name?.trim() || "—";
              const signedUpAt = s.created_at
                ? formatSignupDateTime(s.created_at)
                : null;

              return (
                <li
                  key={s.id}
                  className={`flex items-center justify-between gap-3 py-3 ${
                    isMe ? "bg-sunset/10 -mx-1 rounded-xl px-1" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold text-twilight">
                      {s.runner_id}
                    </p>
                    <p className="truncate text-sm text-brown-sugar">
                      {displayName}
                    </p>
                    {s.goal && (
                      <p className="mt-0.5 truncate text-xs text-mung-green">
                        {s.goal}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {signedUpAt && (
                      <time
                        dateTime={s.created_at}
                        className="flex items-center gap-1.5 whitespace-nowrap text-[10px] tabular-nums text-brown-sugar/45"
                      >
                        <span>{signedUpAt.date}</span>
                        <span>{signedUpAt.time}</span>
                      </time>
                    )}
                    {isMe && (
                      <span className="rounded-full bg-sunset/20 px-2 py-0.5 text-[10px] font-medium text-brown-sugar">
                        你
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-brown-sugar/60">
          開跑日期稍候公佈...
        </p>
        {me && (
          <button
            type="button"
            onClick={logout}
            className="shrink-0 cursor-pointer text-xs text-brown-sugar/50 underline hover:text-brown-sugar/70"
          >
            登出護照
          </button>
        )}
      </div>

      <div className="mt-5 space-y-3">
        <Button href="/passport" variant="secondary" className="w-full">
          我的豆花護照
        </Button>
        <PageFooterNav />
      </div>
    </PageShell>
  );
}
