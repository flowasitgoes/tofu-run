"use client";

import Link from "next/link";
import { PageShell } from "@/components/PageShell";

/** Ground 看板暫停使用；原實作見檔案底部註解 */
export default function LiveGroundPage() {
  return (
    <PageShell mainClassName="max-w-2xl">
      <p className="py-16 text-center text-sm text-brown-sugar/60">
        Ground 看板暫停使用
      </p>
      <Link
        href="/live"
        className="block text-center text-sm text-brown-sugar/70 underline"
      >
        返回 LIVE
      </Link>
    </PageShell>
  );
}

/*
"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { LiveGroundBoard } from "@/components/LiveGroundBoard";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useLiveGround } from "@/hooks/useLiveGround";
import { useStoredPlayerSnapshot } from "@/hooks/useStoredPlayer";

export default function LiveGroundPage() {
  const { t } = useLocale();
  const { player } = useStoredPlayerSnapshot();
  const runnerId = player?.runnerId ?? null;
  const { data, loading, refreshing, error, hasCachedData, reload } =
    useLiveGround(runnerId);

  return (
    <PageShell mainClassName="max-w-2xl">
      <header className="mb-5">
        <p className="text-xs font-medium tracking-wide text-red-bean">LIVE</p>
        <h1 className="text-2xl font-bold text-brown-sugar">{t("ground.title")}</h1>
        <p className="mt-1 text-sm text-brown-sugar/65">
          {data?.sessionDateLabel ?? t("common.today")}
        </p>
        <p className="mt-1 text-xs text-brown-sugar/50">{t("ground.subtitle")}</p>
      </header>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-brown-sugar">{t("ground.board")}</h2>
          <button
            type="button"
            onClick={() => void reload()}
            disabled={refreshing}
            className="text-xs text-brown-sugar/60 underline disabled:opacity-40"
          >
            {refreshing ? t("common.refreshing") : t("common.refresh")}
          </button>
        </div>

        {loading && !data && !hasCachedData && (
          <p className="animate-pulse-soft py-10 text-center text-sm text-brown-sugar/60">
            {t("common.loading")}
          </p>
        )}
        {error && !data && !hasCachedData && (
          <p className="py-6 text-center text-sm text-red-bean">{error}</p>
        )}
        {data && (
          <LiveGroundBoard
            payload={data}
            highlightRunnerId={runnerId}
          />
        )}
      </Card>

      <p className="mt-3 text-center text-[11px] text-brown-sugar/45">
        {t("ground.realtimeHint")}
      </p>

      <div className="mt-5 flex flex-col gap-2">
        <Button href="/live" variant="secondary" className="w-full">
          {t("ground.backLive")}
        </Button>
        <Button href="/passport" variant="secondary" className="w-full">
          {t("ground.myPassport")}
        </Button>
        <Link
          href="/"
          className="text-center text-xs text-brown-sugar/50 underline"
        >
          {t("nav.backHome")}
        </Link>
      </div>
    </PageShell>
  );
}
*/
