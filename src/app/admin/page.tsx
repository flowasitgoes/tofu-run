"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TOFU_TYPES } from "@/lib/constants";
import { getTofuLabelLocalized, getTofuShortLocalized } from "@/lib/i18n-labels";
import type { TofuTypeId } from "@/lib/constants";
import { formatDisplayDate } from "@/lib/session";

type AdminPlayer = {
  id: string;
  user_id: string;
  runner_id: string;
  runner_name: string;
  tofu_type: string | null;
  completed_at: string | null;
  joined_at: string;
};

const ADMIN_KEY = "tofu-run-admin-secret";

export default function AdminPage() {
  const { locale, t, localizeError } = useLocale();
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [taken, setTaken] = useState<string[]>([]);
  const [sessionDate, setSessionDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(ADMIN_KEY);
    if (saved) {
      setSecret(saved);
      setAuthed(true);
    }
  }, []);

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
      const res = await fetch("/api/admin/assign", { headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPlayers(data.players);
      setTaken(data.takenTofuTypes);
      setSessionDate(data.sessionDate);
      setMessage(null);
    } catch (e) {
      setMessage(
        e instanceof Error ? localizeError(e.message) : t("common.loadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [secret, headers]);

  useEffect(() => {
    if (authed) load();
  }, [authed, load]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    sessionStorage.setItem(ADMIN_KEY, secret);
    setAuthed(true);
  }

  async function assign(userSessionId: string, tofuType: string) {
    setMessage(null);
    const res = await fetch("/api/admin/assign", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ userSessionId, tofuType, action: "assign" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(
        data.error ? localizeError(data.error) : t("admin.assignFailed")
      );
      return;
    }
    await load();
  }

  async function complete(userSessionId: string) {
    await fetch("/api/admin/assign", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ userSessionId, action: "complete" }),
    });
    await load();
  }

  async function clearTofu(userSessionId: string) {
    await fetch("/api/admin/assign", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ userSessionId, action: "clear" }),
    });
    await load();
  }

  if (!authed) {
    return (
      <PageShell showNav={false}>
        <Card className="mx-auto mt-16 max-w-sm">
          <h1 className="text-xl font-bold text-brown-sugar">{t("admin.loginTitle")}</h1>
          <p className="mt-1 text-xs text-brown-sugar/60">{t("admin.loginHint")}</p>
          <form onSubmit={handleLogin} className="mt-4 space-y-3">
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder={t("admin.secretPlaceholder")}
              className="w-full rounded-xl border border-brown-sugar/20 bg-cream px-4 py-3 text-sm outline-none focus:border-brown-sugar/40"
            />
            <Button type="submit" className="w-full">
              {t("admin.enter")}
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
          {sessionDate ? formatDisplayDate(sessionDate) : ""} · {t("admin.assignTofu")}
        </p>
      </header>

      {message && (
        <p className="mb-4 rounded-xl bg-red-bean/10 px-4 py-2 text-sm text-red-bean">
          {message}
        </p>
      )}

      {loading && <p className="text-sm text-brown-sugar/60">{t("common.loading")}</p>}

      <div className="space-y-4">
        {players.map((p) => (
          <Card key={p.id}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{p.runner_name}</p>
                <p className="font-mono text-xs text-twilight">{p.runner_id}</p>
              </div>
              {p.completed_at && (
                <span className="rounded-full bg-mung-green/20 px-2 py-0.5 text-xs text-mung-green">
                  {t("admin.completed")}
                </span>
              )}
            </div>

            <p className="mt-2 text-sm">
              {t("admin.current")}{" "}
              <strong>
                {p.tofu_type
                  ? getTofuLabelLocalized(p.tofu_type, locale)
                  : t("tokens.unassigned")}
              </strong>
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {TOFU_TYPES.map((tofu) => {
                const isTaken = taken.includes(tofu.id) && p.tofu_type !== tofu.id;
                return (
                  <button
                    key={tofu.id}
                    type="button"
                    disabled={isTaken}
                    onClick={() => assign(p.id, tofu.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs transition-colors ${
                      p.tofu_type === tofu.id
                        ? "bg-brown-sugar text-cream"
                        : isTaken
                          ? "cursor-not-allowed bg-brown-sugar/5 text-brown-sugar/30"
                          : "bg-tofu-white hover:bg-sunset/20"
                    }`}
                  >
                    {tofu.emoji}{" "}
                    {getTofuShortLocalized(tofu.id as TofuTypeId, locale)}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => complete(p.id)}
                className="text-xs text-mung-green underline"
              >
                {t("admin.markComplete")}
              </button>
              <button
                type="button"
                onClick={() => clearTofu(p.id)}
                className="text-xs text-brown-sugar/50 underline"
              >
                {t("admin.clearTofu")}
              </button>
            </div>
          </Card>
        ))}
      </div>

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
