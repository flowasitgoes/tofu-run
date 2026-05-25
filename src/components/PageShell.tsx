"use client";

import { type ReactNode } from "react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Nav } from "@/components/Nav";

export function PageShell({
  children,
  showNav = true,
  className = "",
  mainClassName = "max-w-lg",
}: {
  children: ReactNode;
  showNav?: boolean;
  className?: string;
  /** 主內容區最大寬度，例如 Ground 看板用 max-w-2xl */
  mainClassName?: string;
}) {
  return (
    <div className={`min-h-dvh pb-24 ${className}`}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-20 top-10 h-64 w-64 rounded-full bg-sunset/20 blur-3xl" />
        <div className="absolute -left-16 bottom-32 h-48 w-48 rounded-full bg-mung-green/15 blur-3xl" />
      </div>
      <div className="pointer-events-auto fixed right-4 top-4 z-[60]">
        <LanguageToggle />
      </div>
      <main className={`relative mx-auto px-5 pt-14 ${mainClassName}`}>
        {children}
      </main>
      {showNav && <Nav />}
    </div>
  );
}
