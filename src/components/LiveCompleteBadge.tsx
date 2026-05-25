type LiveCompleteBadgeProps = {
  label: string;
  /** Ground 等：方格 ✓；LIVE：獲得 N 碗豆花文字 */
  variant?: "icon" | "earned";
  /** LIVE：已翻譯的「獲得{n}碗豆花!」 */
  earnedLabel?: string;
};

/** 路線完成戳記 */
export function LiveCompleteBadge({
  label,
  variant = "icon",
  earnedLabel,
}: LiveCompleteBadgeProps) {
  if (variant === "earned" && earnedLabel) {
    return (
      <span
        className="shrink-0 whitespace-nowrap rounded bg-sky-500 px-1.5 py-1 text-[10px] font-semibold leading-tight text-white"
        title={label}
        aria-label={label}
      >
        {earnedLabel}
      </span>
    );
  }

  return (
    <span
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-mung-green text-cream"
      title={label}
      aria-label={label}
    >
      <svg
        viewBox="0 0 16 16"
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 8.5l3 3 7-7" />
      </svg>
    </span>
  );
}
