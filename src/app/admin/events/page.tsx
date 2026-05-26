"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Session } from "@/types/database";

const ADMIN_KEY = "tofu-run-admin-secret";

function getStoredAdminSecret(): string | null {
  if (typeof window === "undefined") return null;
  return (
    sessionStorage.getItem(ADMIN_KEY) || localStorage.getItem(ADMIN_KEY) || null
  );
}

function prettyDate(date: string): string {
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return date;
  return `${m[1]}/${m[2]}/${m[3]}`;
}

export default function AdminEventsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const secret = getStoredAdminSecret();
    if (!secret) {
      setError("尚未登入管理員，請先到 /admin 登入");
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        const res = await fetch("/api/admin/events", {
          headers: { "x-admin-secret": secret },
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "讀取活動清單失敗");
        setSessions(data.sessions ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "讀取活動清單失敗");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <PageShell showNav={false}>
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-brown-sugar">過往活動快照</h1>
        <p className="text-sm text-brown-sugar/60">
          點選任一活動，查看當下進場名單與 Token 進度快照
        </p>
      </header>

      <Card>
        {loading ? (
          <p className="py-8 text-center text-sm text-brown-sugar/60">載入中…</p>
        ) : error ? (
          <p className="py-4 text-center text-sm text-red-bean">{error}</p>
        ) : sessions.length === 0 ? (
          <p className="py-8 text-center text-sm text-brown-sugar/60">
            尚無活動紀錄
          </p>
        ) : (
          <ul className="divide-y divide-brown-sugar/8">
            {sessions.map((s) => (
              <li key={s.id} className="py-3">
                <Link
                  href={`/admin/events/${s.id}`}
                  className="flex items-center justify-between rounded-xl px-2 py-2 hover:bg-cream/70"
                >
                  <span className="font-medium text-brown-sugar">
                    {prettyDate(s.date)}
                  </span>
                  <span className="text-xs text-brown-sugar/60">
                    {s.status === "active" ? "進行中（暫時可查看）" : "已結束"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Button href="/admin" variant="ghost" className="mt-4 w-full">
        返回管理頁
      </Button>
    </PageShell>
  );
}
