import { CountCircleBadge } from "@/components/CountCircleBadge";
import {
  BASE_TOFU_TOKEN_ID,
  LIVE_TOKEN_ICON_SLOTS,
  TOKEN_TYPES,
} from "@/lib/constants";
import {
  countCompletedTofuSets,
  isTofuProgressToken,
  tofuProgressFilledSlots,
  TOFU_PROGRESS_COUNT,
} from "@/lib/tofu-progress";
import { TokenIcon } from "@/components/TokenIcon";

const OTHER_ICON_PX = 24;
const LIVE_OTHER_ICON_PX = 32;
const TOFU_ICON_PX = 44;
const MAX_SLOTS = LIVE_TOKEN_ICON_SLOTS;
const MAX_TOPPING_SLOTS = MAX_SLOTS - 1;
/** LIVE 格線統一尺寸，角標對齊右下 */
const LIVE_CELL_CLASS =
  "relative flex h-11 w-11 shrink-0 items-center justify-center overflow-visible";

type LiveParticipantTokenIconsProps = {
  tokenIds: string[];
  className?: string;
  /** grid：LIVE 名單固定 4 格（豆花 + 最多 3 配料）；flow：Ground 等 */
  layout?: "grid" | "flow";
  /** LIVE：依掃描次數在圖示右下顯示數字（含 1） */
  showScanCounts?: boolean;
};

/** 全場次掃描次數加總；格位最多 4 種 Token（同種合併、右下角數字） */
function aggregateScans(
  tokenIds: string[]
): { id: string; count: number }[] {
  const order: string[] = [];
  const counts = new Map<string, number>();
  for (const id of tokenIds) {
    if (isTofuProgressToken(id) || id === BASE_TOFU_TOKEN_ID) continue;
    if (!TOKEN_TYPES.some((t) => t.id === id)) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
    if (!order.includes(id)) order.push(id);
  }
  return order
    .slice(0, MAX_SLOTS)
    .map((id) => ({ id, count: counts.get(id)! }));
}

function TokenIconCell({
  id,
  variant = "default",
  count,
}: {
  id: string;
  variant?: "default" | "live";
  count?: number;
}) {
  const tok = TOKEN_TYPES.find((t) => t.id === id);
  if (!tok) return null;
  const isTofu = id === BASE_TOFU_TOKEN_ID || id.startsWith("tofu-");
  const iconPx = isTofu
    ? TOFU_ICON_PX
    : variant === "live"
      ? LIVE_OTHER_ICON_PX
      : OTHER_ICON_PX;
  const showBadge = variant === "live" && count != null && count > 0;

  if (variant === "live") {
    if (showBadge) {
      return (
        <div className="flex flex-col items-center justify-center gap-0.5">
          <div className="flex h-8 w-11 items-center justify-center">
            <TokenIcon
              src={tok.image}
              alt=""
              size={LIVE_OTHER_ICON_PX}
              className="h-8 w-8 drop-shadow-none"
            />
          </div>
          <CountCircleBadge count={count!} placement="below" />
        </div>
      );
    }

    return (
      <div className={LIVE_CELL_CLASS}>
        <TokenIcon
          src={tok.image}
          alt=""
          size={iconPx}
          className={
            isTofu
              ? "h-11 w-11 drop-shadow-none"
              : "h-8 w-8 drop-shadow-none"
          }
        />
        {showBadge ? <CountCircleBadge count={count} /> : null}
      </div>
    );
  }

  return (
    <div
      className={
        isTofu
          ? "flex h-10 shrink-0 items-center justify-center"
          : "flex h-6 shrink-0 items-center justify-center"
      }
    >
      <TokenIcon
        src={tok.image}
        alt=""
        size={iconPx}
        className={
          isTofu
            ? "h-10 w-10 drop-shadow-none"
            : "h-6 w-6 drop-shadow-none"
        }
      />
    </div>
  );
}

/** LIVE 名單：豆花圖示 + 六格進度（放在 goal 下方） */
export function LiveTofuProgressRow({
  tokenIds,
  className = "",
}: {
  tokenIds: string[];
  className?: string;
}) {
  const filledSlots = tofuProgressFilledSlots(tokenIds);

  return (
    <div
      className={`flex min-w-0 items-center gap-1.5 overflow-visible ${className}`.trim()}
      aria-label="豆花進度"
    >
      <div className="grid w-full max-w-[5.5rem] shrink-0 grid-cols-6 gap-px">
        {Array.from({ length: TOFU_PROGRESS_COUNT }, (_, i) => (
          <span
            key={i}
            className={`h-3 min-w-0 rounded-[2px] border ${
              filledSlots[i]
                ? "border-sky-400 bg-sky-300"
                : "border-brown-sugar/20 bg-brown-sugar/10"
            }`}
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}

/** 依掃描順序顯示 Token 圖示（可合併同類型並顯示次數） */
export function LiveParticipantTokenIcons({
  tokenIds,
  className = "",
  layout = "grid",
  showScanCounts = false,
}: LiveParticipantTokenIconsProps) {
  const aggregated = showScanCounts ? aggregateScans(tokenIds) : null;
  const ordered = tokenIds.slice(0, MAX_SLOTS);
  const tokenById = new Map<string, (typeof TOKEN_TYPES)[number]>(
    TOKEN_TYPES.map((t) => [t.id, t])
  );

  if (layout === "flow") {
    return (
      <div
        className={`flex h-10 min-w-0 flex-1 items-center justify-start gap-1 ${className}`.trim()}
        aria-hidden={!ordered.length}
      >
        {ordered.map((id, i) => (
          <TokenIconCell key={`${id}-${i}`} id={id} />
        ))}
      </div>
    );
  }

  const gridEntries = aggregated ?? ordered.map((id) => ({ id, count: 1 }));

  if (showScanCounts && aggregated) {
    const completedTofu = countCompletedTofuSets(tokenIds);
    const toppingEntries = aggregated.slice(0, MAX_TOPPING_SLOTS);

    return (
      <div
        className={`grid h-11 grid-cols-4 place-items-center gap-x-1 overflow-visible ${className}`.trim()}
        aria-hidden={false}
      >
        <div className="flex h-11 w-full items-center justify-center">
          <TokenIconCell
            id={BASE_TOFU_TOKEN_ID}
            variant="live"
            count={completedTofu > 0 ? completedTofu : undefined}
          />
        </div>
        {Array.from({ length: MAX_TOPPING_SLOTS }, (_, i) => {
          const entry = toppingEntries[i];
          const id = entry?.id;
          const tok = id ? tokenById.get(id) : undefined;
          return (
            <div key={`topping-${i}`} className="flex h-11 w-full items-center justify-center">
              {tok && id ? (
                <TokenIconCell id={id} variant="live" count={entry.count} />
              ) : (
                <span className="h-11 w-11 shrink-0" aria-hidden />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={`grid h-11 grid-cols-4 place-items-center gap-x-1 overflow-visible ${className}`.trim()}
      aria-hidden={!gridEntries.length}
    >
      {Array.from({ length: MAX_SLOTS }, (_, i) => {
        const entry = gridEntries[i];
        const id = entry?.id;
        const tok = id ? tokenById.get(id) : undefined;
        const count = aggregated ? entry?.count : undefined;
        return (
          <div key={i} className="flex h-11 w-full items-center justify-center">
            {tok && id ? (
              <TokenIconCell
                id={id}
                variant="live"
                count={showScanCounts ? count : undefined}
              />
            ) : (
              <span className="h-11 w-11 shrink-0" aria-hidden />
            )}
          </div>
        );
      })}
    </div>
  );
}
