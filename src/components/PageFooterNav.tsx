import Link from "next/link";

export function PageFooterNav() {
  return (
    <div className="flex justify-center">
      <Link
        href="/"
        className="text-xs text-brown-sugar/50 underline transition-colors hover:text-brown-sugar/70"
      >
        返回首頁
      </Link>
    </div>
  );
}
