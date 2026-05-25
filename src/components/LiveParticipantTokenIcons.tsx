import { BASE_TOFU_TOKEN_ID, TOKEN_TYPES } from "@/lib/constants";
import { TokenIcon } from "@/components/TokenIcon";

const OTHER_ICON_PX = 24;
const TOFU_ICON_PX = 40;

type LiveParticipantTokenIconsProps = {
  tokenIds: string[];
  className?: string;
};

const MAX_SLOTS = 6;

/** LIVE 進場名單：暱稱與在線狀態之間，依掃描順序由左至右（最多 6 格） */
export function LiveParticipantTokenIcons({
  tokenIds,
  className = "",
}: LiveParticipantTokenIconsProps) {
  const ordered = tokenIds.slice(0, MAX_SLOTS);
  const tokenById = new Map<string, (typeof TOKEN_TYPES)[number]>(
    TOKEN_TYPES.map((t) => [t.id, t])
  );

  return (
    <div
      className={`grid h-10 grid-cols-6 place-items-center ${className}`.trim()}
      aria-hidden={!ordered.length}
    >
      {Array.from({ length: MAX_SLOTS }, (_, i) => {
        const id = ordered[i];
        const tok = id ? tokenById.get(id) : undefined;
        const isTofu = id === BASE_TOFU_TOKEN_ID;
        const iconPx = isTofu ? TOFU_ICON_PX : OTHER_ICON_PX;
        return (
          <div
            key={i}
            className={
              isTofu
                ? "flex h-10 w-full max-w-10 items-center justify-center"
                : "flex h-6 w-full max-w-8 items-center justify-center"
            }
          >
            {tok ? (
              <TokenIcon
                src={tok.image}
                alt=""
                size={iconPx}
                className={
                  isTofu
                    ? "h-10 w-10 max-h-full max-w-full drop-shadow-none"
                    : "h-6 w-6 max-h-full max-w-full drop-shadow-none"
                }
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
