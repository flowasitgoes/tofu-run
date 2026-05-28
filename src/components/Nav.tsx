"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/LocaleProvider";

export function Nav() {
  const pathname = usePathname();
  const { t } = useLocale();

  const links = [
    { href: "/", label: t("nav.home") },
    { href: "/lobby", label: t("nav.lobby") },
    { href: "/passport", label: t("nav.passport") },
    { href: "/live", label: t("nav.live") },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-brown-sugar/10 bg-cream/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg justify-around px-4 py-3">
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-xl px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
                active
                  ? "bg-brown-sugar text-cream"
                  : "text-brown-sugar/70 hover:text-brown-sugar"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
