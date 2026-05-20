import type { Metadata } from "next";
import { HomePageContent } from "@/components/HomePageContent";
import { createMetadata } from "@/lib/metadata";

export const metadata: Metadata = createMetadata({
  path: "/",
});

export default function HomePage() {
  return <HomePageContent />;
}
