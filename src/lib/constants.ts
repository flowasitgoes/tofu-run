export const RUNNER_ID_PREFIXES = ["TOFU", "BEAN", "MUNG"] as const;

export const RUNNER_NAMES = [
  "紅豆獵人",
  "小綠豆",
  "粉圓旅人",
  "黑糖漫遊者",
  "芋圓騎士",
  "花生行者",
  "豆花旅伴",
  "夕陽慢跑者",
  "中央公園豆友",
  "糖水探險家",
  "糯米團子",
  "仙草漫遊",
] as const;

export const TOFU_TYPES = [
  {
    id: "redbean",
    label: "紅豆豆花",
    shortName: "紅豆",
    emoji: "🫘",
    color: "#B85C5C",
    image: "/tokens/redbean.png",
  },
  {
    id: "mungbean",
    label: "綠豆豆花",
    shortName: "綠豆",
    emoji: "🌿",
    color: "#7BA05B",
    image: "/tokens/mungbean.png",
  },
  {
    id: "peanut",
    label: "花生豆花",
    shortName: "花生",
    emoji: "🥜",
    color: "#C4A574",
    image: "/tokens/peanut.png",
  },
  {
    id: "tapioca",
    label: "粉圓豆花",
    shortName: "粉圓",
    emoji: "⚪",
    color: "#9B8B7A",
    image: "/tokens/tapioca.png",
  },
  {
    id: "taro",
    label: "芋圓豆花",
    shortName: "芋圓",
    emoji: "💜",
    color: "#9B7EBD",
    image: "/tokens/taro.png",
  },
] as const;

export const MAX_TOPPING_PICKS = 3;
/** LIVE 名單圖示格：豆花 1 + 配料最多 3 */
export const LIVE_TOKEN_ICON_SLOTS = 1 + MAX_TOPPING_PICKS;
export const PURE_DOUHUA_GOAL = "純粹豆花";

/** 依選擇的配料 id 組出目標豆花名稱，例如「紅豆花生芋圓豆花」 */
export function formatDouhuaGoal(
  toppingIds: string[],
  pureOnly = false
): string {
  if (pureOnly) return PURE_DOUHUA_GOAL;
  const names = toppingIds
    .map((id) => TOFU_TYPES.find((t) => t.id === id)?.shortName)
    .filter(Boolean);
  if (names.length === 0) return "";
  return `${names.join("")}豆花`;
}

export type TofuTypeId = (typeof TOFU_TYPES)[number]["id"];

/** 全員必掃的起點 Token（邏輯用；實際掃描為 tofu-01…04） */
export const BASE_TOFU_TOKEN_ID = "tofu" as const;

/** 豆花起點 4 站 QR，集滿一輪 = 1 顆豆花 Token */
export const TOFU_PROGRESS_TOKEN_IDS = [
  "tofu-01",
  "tofu-02",
  "tofu-03",
  "tofu-04",
] as const;

export type TofuProgressTokenId = (typeof TOFU_PROGRESS_TOKEN_IDS)[number];

export const TOFU_PROGRESS_COUNT = TOFU_PROGRESS_TOKEN_IDS.length;

const TOFU_CHECKPOINT_ZONE = "純白豆花底";
const TOFU_CHECKPOINT_IMAGE = "/tokens/tofu.png";

export const TOFU_PROGRESS_CHECKPOINTS = TOFU_PROGRESS_TOKEN_IDS.map(
  (id, index) => ({
    id,
    label: `白豆花 Token ${String(index + 1).padStart(2, "0")}`,
    zone: TOFU_CHECKPOINT_ZONE,
    image: TOFU_CHECKPOINT_IMAGE,
  })
);

const TOPPING_CHECKPOINTS = [
  {
    id: "redbean",
    label: "紅豆 Token",
    zone: "水池區",
    image: "/tokens/redbean.png",
  },
  {
    id: "mungbean",
    label: "綠豆 Token",
    zone: "樹林區",
    image: "/tokens/mungbean.png",
  },
  {
    id: "peanut",
    label: "花生 Token",
    zone: "城市光廊區",
    image: "/tokens/peanut.png",
  },
  {
    id: "tapioca",
    label: "粉圓 Token",
    zone: "草地區",
    image: "/tokens/tapioca.png",
  },
  {
    id: "taro",
    label: "芋圓 Token",
    zone: "捷運出口區",
    image: "/tokens/taro.png",
  },
] as const;

/** 護照／路線顯示 + 掃描站定義（含 4 站豆花 QR） */
export const TOKEN_TYPES = [
  {
    id: BASE_TOFU_TOKEN_ID,
    label: "白豆花 Token",
    zone: TOFU_CHECKPOINT_ZONE,
    image: TOFU_CHECKPOINT_IMAGE,
  },
  ...TOFU_PROGRESS_CHECKPOINTS,
  ...TOPPING_CHECKPOINTS,
] as const;

export type TokenTypeId = (typeof TOKEN_TYPES)[number]["id"];

/** 可掃描的 checkpoint（不含邏輯用 tofu） */
export const SCANNABLE_TOKEN_IDS: string[] = [
  "start",
  ...TOFU_PROGRESS_TOKEN_IDS,
  ...TOPPING_CHECKPOINTS.map((t) => t.id),
];

/** 豆花圖略大於其他 Token，視覺上較飽滿 */
const TOFU_ICON_EXTRA_PX = 4;

export function resolveTokenIconSize(
  id: TokenTypeId | string,
  base: number
): number {
  return id === BASE_TOFU_TOKEN_ID || id.startsWith("tofu-")
    ? base + TOFU_ICON_EXTRA_PX
    : base;
}

export const STORAGE_KEY = "tofu-run-player";

export const GATHERING_SLOTS = [
  { time: "週一 7:30 PM", mood: "夏夜晚風" },
  { time: "週四 7:30 PM", mood: "璀璨夕陽" },
] as const;

export function getTofuLabel(id: string | null | undefined): string {
  return TOFU_TYPES.find((t) => t.id === id)?.label ?? "尚未分配";
}

export function getTokenLabel(id: string): string {
  return TOKEN_TYPES.find((t) => t.id === id)?.label ?? id;
}
