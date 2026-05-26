import { createSupabaseServiceClient } from "@/lib/supabase";
import { Client } from "pg";

const PG_STATEMENTS = [
  `alter table sessions add column if not exists status text not null default 'closed'`,
  `alter table sessions add column if not exists ended_at timestamptz`,
  `alter table sessions drop constraint if exists sessions_status_check`,
  `alter table sessions add constraint sessions_status_check check (status in ('active', 'closed'))`,
  `update sessions set status = 'closed' where status is null or status not in ('active', 'closed')`,
  `create unique index if not exists idx_sessions_one_active on sessions ((true)) where status = 'active'`,
  `create index if not exists idx_sessions_date on sessions (date)`,
  `
create or replace function public.ensure_sessions_live_status()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  alter table sessions add column if not exists status text not null default 'closed';
  alter table sessions add column if not exists ended_at timestamptz;
  alter table sessions drop constraint if exists sessions_status_check;
  alter table sessions add constraint sessions_status_check check (status in ('active', 'closed'));
  update sessions set status = 'closed' where status is null or status not in ('active', 'closed');
  create unique index if not exists idx_sessions_one_active on sessions ((true)) where status = 'active';
  create index if not exists idx_sessions_date on sessions (date);
end;
$$`,
  `revoke all on function public.ensure_sessions_live_status() from public`,
  `grant execute on function public.ensure_sessions_live_status() to service_role`,
];

function isMissingStatusColumn(error: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!error?.message) return false;
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    /status|ended_at/i.test(error.message)
  );
}

async function probeSessionsStatusColumn(): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("sessions").select("status").limit(1);
  if (!error) return true;
  if (isMissingStatusColumn(error)) return false;
  throw error;
}

async function applyViaPg(databaseUrl: string): Promise<void> {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    for (const sql of PG_STATEMENTS) {
      await client.query(sql);
    }
  } finally {
    await client.end();
  }
}

async function applyViaRpc(): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.rpc("ensure_sessions_live_status");
  if (!error) return true;
  if (error.code === "PGRST202") return false;
  throw error;
}

/**
 * 確保 sessions 具備 LIVE 開關欄位（status / ended_at）。
 * 優先 RPC（若已在 Supabase 建立函式），否則用 DATABASE_URL 直接 DDL。
 */
export async function ensureSessionsLiveSchema(): Promise<void> {
  if (await probeSessionsStatusColumn()) return;

  if (await applyViaRpc()) {
    if (await probeSessionsStatusColumn()) return;
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      "資料庫尚未建立 LIVE 場次欄位。請在 .env.local 加上 DATABASE_URL（Supabase → Project Settings → Database → Connection string），重啟 dev server 後再按「開啟活動」；或於 SQL Editor 執行 supabase/sessions_live_status.sql"
    );
  }

  await applyViaPg(databaseUrl);

  if (!(await probeSessionsStatusColumn())) {
    throw new Error("自動更新資料庫結構失敗，請聯繫技術或手動執行 migration");
  }
}
