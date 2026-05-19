import type { Metadata } from "next";
import Image from "next/image";
import { MadeByCredit } from "@/components/MadeByCredit";
import { InterestSignup } from "@/components/InterestSignup";
import { PageShell } from "@/components/PageShell";
import { ParkMap } from "@/components/ParkMap";
import { TokenIcon } from "@/components/TokenIcon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";
import { GATHERING_SLOTS, TOKEN_TYPES } from "@/lib/constants";

export const metadata: Metadata = createMetadata({
  path: "/",
});

export default function HomePage() {
  return (
    <PageShell>
      <header className="mb-8 text-center">
        <p className="mb-2 text-4xl">🥣</p>
        <h1 className="text-3xl font-bold tracking-tight text-brown-sugar">
          豆花慢跑
        </h1>
        <p className="mt-2 text-sm text-brown-sugar/70">
          一起完成屬於你的一碗豆花。
        </p>
        <p className="mt-1 text-xs text-twilight/80">Tofu Run · 高雄中央公園</p>
        <p className="mt-1 text-xs italic text-brown-sugar/50">
          When the Tofu Pudding is Running ...
        </p>
      </header>

      <InterestSignup />

      <Card className="mb-5">
        <h2 className="mb-2 font-semibold text-brown-sugar">這是什麼？</h2>
        <p className="text-sm leading-relaxed text-brown-sugar/80">
          城市裡的團體加油慢跑遊戲。<br/>掃描 QR 加入、選擇一碗豆花配料、到公園各區探尋美味
          Token，<br/>收集你的豆花護照 — 跑.. 跑.. 跑... 享用你們拾取的豆花。
        </p>
      </Card>

      <Card className="mb-5">
        {/* <h2 className="mb-3 font-semibold text-brown-sugar">遊戲設定</h2> */}
        <div className="overflow-hidden rounded-2xl border border-brown-sugar/10 bg-cream/40">
          <Image
            src="/run.intro.jpg"
            alt="豆花星球居民角色設定：開跑、衝線、補充能量與表情包"
            width={1254}
            height={1254}
            className="h-auto w-full"
            sizes="(max-width: 448px) 100vw, 400px"
          />
        </div>
      </Card>

      <Card className="mb-5 bg-gradient-to-br from-sunset/10 to-tofu-white">
        <h2 className="mb-2 font-semibold text-brown-sugar">平日集合的瞬間</h2>
        <ul className="space-y-2">
          {GATHERING_SLOTS.map((slot) => (
            <li key={slot.time} className="text-base font-medium text-red-bean">
              {slot.time}
              <span className="font-normal text-brown-sugar/70">
                （{slot.mood}）
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 rounded-xl bg-cream/60 px-3 py-2 text-sm leading-relaxed text-brown-sugar/75">
          現場會提供 QR，掃描即可加入當日的慢跑群。
        </p>
      </Card>

      <section className="mb-5">
        <h2 className="mb-3 text-center text-sm font-semibold text-brown-sugar">
          中央公園 · Checkpoint 地圖
        </h2>
        <ParkMap />
      </section>

      <Card className="mb-5">
        <h2 className="mb-3 font-semibold text-brown-sugar">Checkpoint 一覽</h2>
        <ul className="space-y-2">
          {TOKEN_TYPES.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-xl bg-cream/60 px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <TokenIcon src={t.image} alt={t.label} size={28} />
                {t.zone}
              </span>
              <span className="text-brown-sugar/60">{t.label}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="space-y-3 border-t border-brown-sugar/10 pt-6 pb-4">
        <p className="text-center text-xs font-medium text-brown-sugar/55">
          已報名？
        </p>
        <Button href="/passport" variant="secondary" className="w-full">
          我的護照（登入）
        </Button>
        <Button href="/lobby" variant="secondary" className="w-full">
          查看想參加名單
        </Button>
        <MadeByCredit className="mt-2 text-center" />
        {siteConfig.showLiveEntry && (
          <Button href="/live" className="w-full">
            進入 LIVE（活動當日）
          </Button>
        )}
      </div>
    </PageShell>
  );
}
