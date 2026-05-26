"use client";

import { MadeByCredit } from "@/components/MadeByCredit";
import { PageFooterNav } from "@/components/PageFooterNav";
import { PageShell } from "@/components/PageShell";
import { useLocale } from "@/components/LocaleProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useLobbyList } from "@/hooks/useLobbyList";
import { useStoredGoingAccount } from "@/hooks/useStoredGoingAccount";
import { signupDisplayName } from "@/lib/displayName";
import { formatSignupDateTime } from "@/lib/formatSignupTime";

export default function LobbyPage() {
  const { t } = useLocale();
  const { signups, count, loading, refreshing, error, reload } = useLobbyList();
  const { account: me, logout } = useStoredGoingAccount();

  const showEmpty = !loading && !error && signups.length === 0;
  const showList = signups.length > 0;

  return (
    <PageShell>
      <header className="mb-6">
        <p className="text-xs text-brown-sugar/60">{t("lobby.eyebrow")}</p>
        <h1 className="text-2xl font-bold text-brown-sugar">{t("lobby.title")}</h1>
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <p className="min-w-0 text-sm leading-relaxed text-brown-sugar/65">
            {t("lobby.subtitle")}
          </p>
          <MadeByCredit className="shrink-0 text-right" />
        </div>
        {me && (
          <p className="mt-2 text-sm text-twilight">
            {t("lobby.loggedInAs")}
            <span className="font-mono">{me.runnerId}</span>
          </p>
        )}
      </header>

      {!me && (
        <Card className="mb-4 border-sunset/30 bg-sunset/5">
          <p className="text-sm leading-relaxed text-brown-sugar/80">
            {t("lobby.guestHint")}
          </p>
          <div className="mt-3 flex gap-2">
            <Button href="/" variant="secondary" className="flex-1">
              {t("lobby.backHome")}
            </Button>
            <Button href="/passport" className="flex-1">
              {t("lobby.passportLogin")}
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-brown-sugar">{t("lobby.listTitle")}</h2>
            <p className="text-xs text-brown-sugar/50">
              {t("lobby.listCount", {
                count: loading && count === 0 ? "…" : count,
              })}
              {refreshing && (
                <span className="ml-1.5 text-brown-sugar/40">
                  {t("common.refreshing")}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void reload()}
            disabled={refreshing}
            className="text-xs text-brown-sugar/60 underline disabled:opacity-40"
          >
            {refreshing ? t("common.refreshing") : t("common.refresh")}
          </button>
        </div>

        {loading && (
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
            {t("lobby.empty")}
          </p>
        )}

        {showList && (
          <ul className="divide-y divide-brown-sugar/8">
            {signups.map((s) => {
              const isMe = me?.runnerId === s.runner_id;
              const displayName = signupDisplayName(s);
              const signedUpAt = s.created_at
                ? formatSignupDateTime(s.created_at)
                : null;

              return (
                <li
                  key={s.id}
                  className={`flex items-center justify-between gap-3 py-3 ${
                    isMe ? "-mx-1 rounded-xl bg-sunset/10 px-1" : ""
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
                        {t("common.you")}
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
        <p className="text-xs font-bold text-brown-sugar/60">{t("lobby.dateTbd")}</p>
        {me && (
          <button
            type="button"
            onClick={logout}
            className="shrink-0 cursor-pointer text-xs text-brown-sugar/50 underline hover:text-brown-sugar/70"
          >
            {t("lobby.logout")}
          </button>
        )}
      </div>

      <div className="mt-5 space-y-3">
        <Button href="/passport" variant="secondary" className="w-full">
          {t("lobby.myPassport")}
        </Button>
        <PageFooterNav />
      </div>
    </PageShell>
  );
}
