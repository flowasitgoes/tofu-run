"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/LocaleProvider";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useStoredGoingAccount } from "@/hooks/useStoredGoingAccount";
import { usePlayer } from "@/hooks/usePlayer";

export default function JoinPage() {
  const { t, localizeError } = useLocale();
  const router = useRouter();
  const { account: going, mounted } = useStoredGoingAccount();
  const { player, loading, join } = usePlayer();
  const [status, setStatus] = useState<"idle" | "joining" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    runnerId: string;
    runnerName: string;
  } | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!going?.runnerId) return;
    if (player && player.runnerId === going.runnerId && status === "idle") {
      handleJoin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, player, going?.runnerId]);

  async function handleJoin() {
    if (!going?.runnerId) return;
    setStatus("joining");
    setError(null);
    try {
      const p = await join();
      setResult({ runnerId: p.runnerId, runnerName: p.runnerName });
      setTimeout(() => router.push("/lobby"), 2500);
    } catch (e) {
      setStatus("error");
      setError(
        e instanceof Error ? localizeError(e.message) : t("common.joinFailed")
      );
    }
  }

  if (!mounted) {
    return (
      <PageShell showNav={false}>
        <div className="flex min-h-[70dvh] items-center justify-center">
          <p className="animate-pulse-soft text-brown-sugar/60">
            {t("common.loading")}
          </p>
        </div>
      </PageShell>
    );
  }

  if (!going?.runnerId) {
    return (
      <PageShell showNav={false}>
        <div className="flex min-h-[70dvh] flex-col items-center justify-center px-4 text-center">
          <p className="mb-4 text-5xl">📔</p>
          <h1 className="text-2xl font-bold text-brown-sugar">
            {t("join.loginFirstTitle")}
          </h1>
          <p className="mt-3 text-sm text-brown-sugar/70">
            {t("join.loginFirstBody")}
          </p>
          <Button href="/passport" className="mt-8 w-full max-w-sm">
            {t("join.goPassport")}
          </Button>
          <Link
            href="/"
            className="mt-4 text-xs text-brown-sugar/50 underline"
          >
            {t("join.backHomeSignup")}
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell showNav={false}>
      <div className="flex min-h-[70dvh] flex-col items-center justify-center text-center">
        <p className="mb-4 animate-float text-5xl">🥣</p>
        <h1 className="text-2xl font-bold text-brown-sugar">{t("join.title")}</h1>
        <p className="mt-2 font-mono text-sm text-twilight">{going.runnerId}</p>

        {status === "joining" && (
          <Card className="mt-8 w-full">
            <p className="animate-pulse-soft text-brown-sugar/80">
              {t("join.joining")}
            </p>
            <p className="mt-2 text-xs text-brown-sugar/50">
              {t("join.joiningHint")}
            </p>
          </Card>
        )}

        {result && (
          <Card className="mt-8 w-full border-2 border-mung-green/30">
            <p className="text-sm text-brown-sugar/60">{t("join.welcome")}</p>
            <p className="mt-2 text-2xl font-bold text-brown-sugar">
              {result.runnerName}
            </p>
            <p className="mt-1 font-mono text-sm text-twilight">
              RUN ID: {result.runnerId}
            </p>
            <p className="mt-4 text-xs text-brown-sugar/50">
              {t("join.goingLobby")}
            </p>
          </Card>
        )}

        {status === "error" && (
          <Card className="mt-8 w-full border-red-bean/30">
            <p className="text-red-bean">{error}</p>
            <Button className="mt-4 w-full" onClick={handleJoin}>
              {t("common.retry")}
            </Button>
          </Card>
        )}

        {status === "idle" && !result && (
          <Button className="mt-8 w-full" onClick={handleJoin}>
            {t("join.startJoin")}
          </Button>
        )}
      </div>
    </PageShell>
  );
}
