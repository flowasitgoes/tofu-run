"use client";

import { use, useEffect, useState } from "react";
import { AdminSessionScheduleSummary } from "@/components/AdminSessionScheduleSummary";
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
  checkpoint_lat: number | null;
  checkpoint_lng: number | null;
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

type TrailParticipant = {
  user_id: string;
  runner_id: string;
  display_name: string;
  point_count: number;
  total_distance_m: number;
  first_recorded_at: string | null;
  last_recorded_at: string | null;
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
  const [trailParticipants, setTrailParticipants] = useState<TrailParticipant[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [trailLoading, setTrailLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trailError, setTrailError] = useState<string | null>(null);

  useEffect(() => {
    const secret = getStoredAdminSecret();
    if (!secret) {
      setError("尚未登入管理員，請先到 /admin 登入");
      setLoading(false);
      return;
    }

    void (async () => {
      const headers = { "x-admin-secret": secret };
      const [movementRes, trailRes] = await Promise.all([
        fetch(`/api/admin/events/${sessionId}/calculate`, {
          headers,
          cache: "no-store",
        }),
        fetch(`/api/admin/events/${sessionId}/trail`, {
          headers,
          cache: "no-store",
        }),
      ]);

      try {
        const movementData = await movementRes.json();
        if (!movementRes.ok) {
          throw new Error(movementData.error ?? "讀取移動分析失敗");
        }
        setSession(movementData.session ?? null);
        setParticipants(movementData.participants ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "讀取移動分析失敗");
      } finally {
        setLoading(false);
      }

      try {
        const trailData = await trailRes.json();
        if (!trailRes.ok) {
          throw new Error(trailData.error ?? "讀取 GPS 軌跡失敗");
        }
        setTrailParticipants(trailData.participants ?? []);
      } catch (e) {
        setTrailError(e instanceof Error ? e.message : "讀取 GPS 軌跡失敗");
      } finally {
        setTrailLoading(false);
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

      {session ? <AdminSessionScheduleSummary session={session} /> : null}

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
                        <th className="px-2 py-1">Token 定位</th>
                        <th className="px-2 py-1">實際掃描</th>
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
                                {fmtCoord(s.checkpoint_lat)}, {fmtCoord(s.checkpoint_lng)}
                              </td>
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

      <section className="mt-8">
        <h2 className="mb-2 text-lg font-bold text-brown-sugar">GPS 軌跡</h2>
        <p className="mb-3 text-xs text-brown-sugar/60">
          依 LIVE 前景連續定位記錄（與上方掃描 Token 距離表分開）。原始點保留 30
          天。
        </p>
        <Card>
          {trailLoading ? (
            <p className="py-8 text-center text-sm text-brown-sugar/60">載入中…</p>
          ) : trailError ? (
            <p className="py-4 text-center text-sm text-red-bean">{trailError}</p>
          ) : trailParticipants.length === 0 ? (
            <p className="py-8 text-center text-sm text-brown-sugar/60">
              此活動尚無 GPS 軌跡資料
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto text-left text-xs">
                <thead>
                  <tr className="text-brown-sugar/70">
                    <th className="px-2 py-2">Runner</th>
                    <th className="px-2 py-2">顯示名稱</th>
                    <th className="px-2 py-2">軌跡點數</th>
                    <th className="px-2 py-2">軌跡總距離</th>
                    <th className="px-2 py-2">首點時間</th>
                    <th className="px-2 py-2">末點時間</th>
                  </tr>
                </thead>
                <tbody>
                  {trailParticipants.map((p) => (
                    <tr
                      key={p.user_id}
                      className="border-t border-brown-sugar/8"
                    >
                      <td className="px-2 py-2 font-mono font-semibold text-twilight">
                        {p.runner_id}
                      </td>
                      <td className="px-2 py-2">{p.display_name}</td>
                      <td className="px-2 py-2">{p.point_count}</td>
                      <td className="px-2 py-2 font-medium text-mung-green">
                        {fmtMeters(p.total_distance_m)}
                      </td>
                      <td className="px-2 py-2">
                        {p.first_recorded_at ? fmtTime(p.first_recorded_at) : "—"}
                      </td>
                      <td className="px-2 py-2">
                        {p.last_recorded_at ? fmtTime(p.last_recorded_at) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

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
