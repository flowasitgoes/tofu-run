"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";

export function PageFooterNav() {
  const { t } = useLocale();

  return (
    <div className="flex justify-center">
      <Link
        href="/"
        className="text-xs text-brown-sugar/50 underline transition-colors hover:text-brown-sugar/70"
      >
        {t("nav.backHome")}
      </Link>
    </div>
  );
}
