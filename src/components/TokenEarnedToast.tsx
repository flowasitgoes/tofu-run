"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { TokenIcon } from "@/components/TokenIcon";
import { TOKEN_TYPES, resolveTokenIconSize } from "@/lib/constants";
import { getTokenLabelLocalized } from "@/lib/i18n-labels";
import type { TokenTypeId } from "@/lib/constants";

const DISMISS_MS = 4500;

export function TokenEarnedToast({
  tokenType,
  onDone,
}: {
  tokenType: string;
  onDone?: () => void;
}) {
  const { locale, t } = useLocale();
  const [visible, setVisible] = useState(true);
  const info = TOKEN_TYPES.find((x) => x.id === tokenType);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [onDone]);

  if (!visible || !info) return null;

  const label = getTokenLabelLocalized(info.id as TokenTypeId, locale);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 top-20 z-[70] mx-auto max-w-lg animate-slide-down"
    >
      <div className="flex items-center gap-3 rounded-2xl border-2 border-mung-green/40 bg-cream/95 px-4 py-3 shadow-lg shadow-brown-sugar/15 backdrop-blur-md">
        <TokenIcon
          src={info.image}
          alt={label}
          size={resolveTokenIconSize(info.id, 48)}
          className="shrink-0"
        />
        <div className="min-w-0 text-left">
          <p className="text-xs font-medium text-mung-green">
            {t("tokenToast.earned")}
          </p>
          <p className="text-sm font-semibold text-brown-sugar">{label}</p>
        </div>
      </div>
    </div>
  );
}
