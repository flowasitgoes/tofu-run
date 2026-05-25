type CountCircleBadgeProps = {
  count: number;
};

/** 小圓圈數字角標（固定於圖示格右下） */
export function CountCircleBadge({ count }: CountCircleBadgeProps) {
  return (
    <span
      className="pointer-events-none absolute right-0 bottom-0 z-10 flex h-4 min-w-4 -translate-y-px translate-x-px items-center justify-center rounded-full bg-[#fc8e0b] px-0.5 text-[10px] font-bold leading-none text-white shadow-sm"
      aria-hidden
    >
      {count}
    </span>
  );
}
