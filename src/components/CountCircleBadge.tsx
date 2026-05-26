type CountCircleBadgeProps = {
  count: number;
  /** corner：圖示右下；below：圖示正下方（配料列） */
  placement?: "corner" | "below";
};

/** 小圓圈數字角標 */
export function CountCircleBadge({
  count,
  placement = "corner",
}: CountCircleBadgeProps) {
  if (placement === "below") {
    return (
      <span
        className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-[#fc8e0b] px-0.5 text-[10px] font-bold leading-none text-white shadow-sm"
        aria-hidden
      >
        {count}
      </span>
    );
  }

  return (
    <span
      className="pointer-events-none absolute right-0 bottom-0 z-10 flex h-4 min-w-4 -translate-y-px translate-x-px items-center justify-center rounded-full bg-[#fc8e0b] px-0.5 text-[10px] font-bold leading-none text-white shadow-sm"
      aria-hidden
    >
      {count}
    </span>
  );
}
