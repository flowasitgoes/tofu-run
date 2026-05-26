"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { LiveParticipantsList } from "@/components/LiveParticipantsList";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDisplayDate } from "@/lib/session";
import type { LiveParticipant } from "@/types/database";

const ADMIN_KEY = "tofu-run-admin-secret";

export default function AdminPage() {
  const { t, localizeError } = useLocale();
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [count, setCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [sessionDate, setSessionDate] = useState("");
  const [livePhase, setLivePhase] = useState<"idle" | "active">("idle");
  const [usedDates, setUsedDates] = useState<string[]>([]);
  const [minSelectableDate, setMinSelectableDate] = useState("");
  const [startDateInput, setStartDateInput] = useState("");
  const [liveBusy, setLiveBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const verifySecret = useCallback(
    async (candidate: string): Promise<boolean> => {
      const trimmed = candidate.trim();
      if (!trimmed) return false;
      const res = await fetch("/api/admin/live", {
        headers: { "x-admin-secret": trimmed },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return true;
      setMessage(
        typeof data.error === "string"
          ? localizeError(data.error)
          : t("admin.unauthorized")
      );
      return false;
    },
    [localizeError, t]
  );

  useEffect(() => {
    const saved = sessionStorage.getItem(ADMIN_KEY);
    if (!saved) return;
    setSecret(saved);
    void (async () => {
      const ok = await verifySecret(saved);
      if (ok) {
        setAuthed(true);
      } else {
        sessionStorage.removeItem(ADMIN_KEY);
      }
    })();
  }, [verifySecret]);

  const headers = useCallback(
    () => ({
      "Content-Type": "application/json",
      "x-admin-secret": secret,
    }),
    [secret]
  );

  const load = useCallback(async () => {
    if (!secret) return;
    setLoading(true);
    try {
      const liveRes = await fetch("/api/admin/live", {
        headers: headers(),
        cache: "no-store",
      });
      const liveData = await liveRes.json();
      if (liveRes.status === 401) {
        sessionStorage.removeItem(ADMIN_KEY);
        setAuthed(false);
        throw new Error(liveData.error ?? t("admin.unauthorized"));
      }
      if (!liveRes.ok) throw new Error(liveData.error);

      setLivePhase(liveData.phase === "active" ? "active" : "idle");
      setUsedDates(liveData.usedDates ?? []);
      setMinSelectableDate(liveData.minSelectableDate ?? "");
      setStartDateInput((prev) =>
        prev || liveData.minSelectableDate || prev
      );
      setSessionDate(liveData.sessionDate ?? "");
      setParticipants(liveData.participants ?? []);
      setCount(liveData.count ?? 0);
      setOnlineCount(liveData.onlineCount ?? 0);
      setMessage(null);
    } catch (e) {
      setMessage(
        e instanceof Error ? localizeError(e.message) : t("common.loadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [secret, headers, localizeError, t]);

  useEffect(() => {
    if (authed) load();
  }, [authed, load]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    const trimmed = secret.trim();
    const ok = await verifySecret(trimmed);
    setLoading(false);
    if (!ok) return;
    sessionStorage.setItem(ADMIN_KEY, trimmed);
    setSecret(trimmed);
    setAuthed(true);
  }

  async function startLive() {
    if (!startDateInput) return;
    setLiveBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/live", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ action: "start", date: startDateInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await load();
    } catch (e) {
      setMessage(
        e instanceof Error ? localizeError(e.message) : t("admin.liveStartFailed")
      );
    } finally {
      setLiveBusy(false);
    }
  }

  async function endLive() {
    setLiveBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/live", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ action: "end" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await load();
    } catch (e) {
      setMessage(
        e instanceof Error ? localizeError(e.message) : t("admin.liveEndFailed")
      );
    } finally {
      setLiveBusy(false);
    }
  }

  if (!authed) {
    return (
      <PageShell showNav={false}>
        <Card className="mx-auto mt-16 max-w-sm">
          <h1 className="text-xl font-bold text-brown-sugar">
            {t("admin.loginTitle")}
          </h1>
          <p className="mt-1 text-xs text-brown-sugar/60">{t("admin.loginHint")}</p>
          <form onSubmit={handleLogin} className="mt-4 space-y-3">
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder={t("admin.secretPlaceholder")}
              className="w-full rounded-xl border border-brown-sugar/20 bg-cream px-4 py-3 text-sm outline-none focus:border-brown-sugar/40"
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("common.loading") : t("admin.enter")}
            </Button>
          </form>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell showNav={false}>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-brown-sugar">{t("admin.title")}</h1>
        <p className="text-sm text-brown-sugar/60">
          {sessionDate ? formatDisplayDate(sessionDate) : ""} ·{" "}
          {t("admin.sessionRoster")}
        </p>
      </header>

      {message && (
        <p className="mb-4 rounded-xl bg-red-bean/10 px-4 py-2 text-sm text-red-bean">
          {message}
        </p>
      )}

      <Card className="mb-6 border-2 border-mung-green/25 bg-mung-green/5">
        <h2 className="text-sm font-semibold text-brown-sugar">
          {t("admin.liveControl")}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-brown-sugar/60">
          {livePhase === "active"
            ? t("admin.liveActiveHint", {
                date: sessionDate ? formatDisplayDate(sessionDate) : "",
              })
            : t("admin.liveIdleHint")}
        </p>
        {usedDates.length > 0 ? (
          <p className="mt-2 text-[11px] text-brown-sugar/50">
            {t("admin.usedDates")}{" "}
            {usedDates.map((d) => formatDisplayDate(d)).join("、")}
          </p>
        ) : null}

        {livePhase === "active" ? (
          <Button
            type="button"
            className="mt-4 w-full"
            disabled={liveBusy}
            onClick={() => void endLive()}
          >
            {liveBusy ? t("common.loading") : t("admin.endLive")}
          </Button>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-brown-sugar/70">
                {t("admin.pickEventDate")}
              </span>
              <input
                type="date"
                value={startDateInput}
                min={minSelectableDate || undefined}
                onChange={(e) => setStartDateInput(e.target.value)}
                className="w-full rounded-xl border border-brown-sugar/15 bg-cream px-4 py-3 text-sm text-brown-sugar outline-none focus:border-mung-green/50"
              />
            </label>
            <Button
              type="button"
              className="w-full"
              disabled={
                liveBusy ||
                !startDateInput ||
                usedDates.includes(startDateInput) ||
                Boolean(
                  minSelectableDate && startDateInput < minSelectableDate
                )
              }
              onClick={() => void startLive()}
            >
              {liveBusy ? t("common.loading") : t("admin.startLive")}
            </Button>
          </div>
        )}
      </Card>

      {livePhase === "active" ? (
        <Card>
          <LiveParticipantsList
            participants={participants}
            count={count}
            onlineCount={onlineCount}
            dateLabel={sessionDate ? formatDisplayDate(sessionDate) : null}
            loading={loading}
            onRefresh={() => void load()}
          />
          <p className="mt-4 whitespace-pre-line text-center text-[11px] leading-relaxed text-brown-sugar/50">
            {t("live.onlineHint")}
          </p>
        </Card>
      ) : (
        !loading && (
          <p className="text-center text-xs text-brown-sugar/50">
            {t("admin.assignWhenLiveOpen")}
          </p>
        )
      )}

      <Button
        variant="ghost"
        className="mt-6 w-full"
        onClick={() => {
          sessionStorage.removeItem(ADMIN_KEY);
          setAuthed(false);
        }}
      >
        {t("admin.logout")}
      </Button>
    </PageShell>
  );
}
