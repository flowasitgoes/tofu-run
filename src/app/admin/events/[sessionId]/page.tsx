"use client";

import { use, useEffect, useState } from "react";
import { LiveParticipantsList } from "@/components/LiveParticipantsList";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { LiveParticipant, Session } from "@/types/database";

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

export default function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [count, setCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
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
        const res = await fetch(`/api/admin/events/${sessionId}`, {
          headers: { "x-admin-secret": secret },
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "讀取活動快照失敗");
        setSession(data.session ?? null);
        setParticipants(data.participants ?? []);
        setCount(data.count ?? 0);
        setOnlineCount(data.onlineCount ?? 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : "讀取活動快照失敗");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  return (
    <PageShell showNav={false}>
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-brown-sugar">活動快照</h1>
        <p className="text-sm text-brown-sugar/60">
          {session ? `${prettyDate(session.date)} · ${session.status}` : "讀取中…"}
        </p>
      </header>

      <Card>
        {error ? (
          <p className="py-4 text-center text-sm text-red-bean">{error}</p>
        ) : (
          <>
            <LiveParticipantsList
              participants={participants}
              count={count}
              onlineCount={onlineCount}
              dateLabel={session ? prettyDate(session.date) : null}
              loading={loading}
            />
            <p className="mt-4 whitespace-pre-line text-center text-[11px] leading-relaxed text-brown-sugar/50">
              綠色圓點＝上線、灰色圓點＝下線；完成時間旁紫框數字＝完成名次；
              {"\n"}圓角標右下角數字＝獲得的配料!
            </p>
          </>
        )}
      </Card>

      <div className="mt-4 flex flex-col gap-2">
        <Button
          href={`/admin/events/${sessionId}/calculate`}
          variant="secondary"
          className="w-full"
        >
          查看移動距離計算
        </Button>
        <Button href="/admin/events" variant="secondary" className="w-full">
          回活動列表
        </Button>
        <Button href="/admin" variant="ghost" className="w-full">
          回管理頁
        </Button>
      </div>
    </PageShell>
  );
}
