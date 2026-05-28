"use client";

import { use, useEffect, useState } from "react";
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

type MovementScanRow = {
  token_id: string;
  token_type: string;
  scanned_at: string;
  scan_lat: number | null;
  scan_lng: number | null;
  effective_lat: number | null;
  effective_lng: number | null;
  location_source: "scan" | "checkpoint" | "none";
  moved_from_token_type: string | null;
  moved_from_scanned_at: string | null;
  segment_distance_m: number | null;
};

type MovementParticipant = {
  user_id: string;
  runner_id: string;
  display_name: string;
  total_distance_m: number;
  scans: MovementScanRow[];
};

function prettyDate(date: string): string {
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return date;
  return `${m[1]}/${m[2]}/${m[3]}`;
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("zh-TW", {
      timeZone: "Asia/Taipei",
      hour12: false,
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtCoord(v: number | null): string {
  return typeof v === "number" ? v.toFixed(6) : "—";
}

function fmtMeters(v: number | null): string {
  return v != null ? `${v.toFixed(1)} m` : "—";
}

export default function AdminEventCalculatePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<MovementParticipant[]>([]);
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
        const res = await fetch(`/api/admin/events/${sessionId}/calculate`, {
          headers: { "x-admin-secret": secret },
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "讀取移動分析失敗");
        setSession(data.session ?? null);
        setParticipants(data.participants ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "讀取移動分析失敗");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  return (
    <PageShell showNav={false} mainClassName="max-w-none">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-brown-sugar">移動距離計算</h1>
        <p className="text-sm text-brown-sugar/60">
          {session ? `${prettyDate(session.date)} · ${session.status}` : "讀取中…"}
        </p>
      </header>

      <Card>
        {loading ? (
          <p className="py-8 text-center text-sm text-brown-sugar/60">載入中…</p>
        ) : error ? (
          <p className="py-4 text-center text-sm text-red-bean">{error}</p>
        ) : participants.length === 0 ? (
          <p className="py-8 text-center text-sm text-brown-sugar/60">
            此活動尚無掃描資料
          </p>
        ) : (
          <div className="space-y-4">
            {participants.map((p) => (
              <div
                key={p.user_id}
                className="rounded-2xl border border-brown-sugar/10 bg-cream/50 p-3"
              >
                <p className="font-mono text-sm font-semibold text-twilight">
                  {p.runner_id}
                </p>
                <p className="text-sm text-brown-sugar">{p.display_name}</p>
                <p className="mt-1 text-xs font-semibold text-mung-green">
                  總移動距離：{p.total_distance_m.toFixed(1)} m
                </p>

                <div className="mt-2">
                  <table className="w-full table-auto text-left text-xs">
                    <thead>
                      <tr className="text-brown-sugar/70">
                        <th className="px-2 py-1">掃描時間</th>
                        <th className="px-2 py-1">Token</th>
                        <th className="px-2 py-1">掃描定位</th>
                        <th className="px-2 py-1">採用定位</th>
                        <th className="px-2 py-1">移動來源</th>
                        <th className="px-2 py-1">本段距離</th>
                        <th className="px-2 py-1">累計距離</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        let cumulative = 0;
                        return p.scans.map((s) => {
                          if (s.segment_distance_m != null) {
                            cumulative += s.segment_distance_m;
                          }
                          return (
                            <tr key={s.token_id} className="border-t border-brown-sugar/8">
                              <td className="px-2 py-1.5">{fmtTime(s.scanned_at)}</td>
                              <td className="px-2 py-1.5">{s.token_type}</td>
                              <td className="px-2 py-1.5">
                                {fmtCoord(s.scan_lat)}, {fmtCoord(s.scan_lng)}
                              </td>
                              <td className="px-2 py-1.5">
                                {fmtCoord(s.effective_lat)}, {fmtCoord(s.effective_lng)}
                              </td>
                              <td className="px-2 py-1.5">
                                {s.moved_from_token_type ?? "—"}
                              </td>
                              <td className="px-2 py-1.5">
                                {fmtMeters(s.segment_distance_m)}
                              </td>
                              <td className="px-2 py-1.5 font-medium text-mung-green">
                                {fmtMeters(cumulative)}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="mt-4 flex flex-col gap-2">
        <Button href={`/admin/events/${sessionId}`} variant="secondary" className="w-full">
          回活動快照
        </Button>
        <Button href="/admin/events" variant="ghost" className="w-full">
          回活動列表
        </Button>
      </div>
    </PageShell>
  );
}
