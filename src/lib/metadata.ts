import type { Metadata } from "next";
import { absoluteUrl, getShareOgImageUrl, siteConfig } from "@/lib/site";

type PageMetaOptions = {
  title?: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
  ogType?: "website" | "article";
};

export function createMetadata({
  title,
  description = siteConfig.description,
  path = "",
  noIndex = false,
  ogType = "website",
}: PageMetaOptions = {}): Metadata {
  const pageTitle = title
    ? `${title} | ${siteConfig.name}`
    : `${siteConfig.name} | ${siteConfig.nameEn}`;
  const canonical = absoluteUrl(path);
  const ogImage = getShareOgImageUrl();

  return {
    metadataBase: new URL(siteConfig.url),
    title: title
      ? title
      : {
          default: `${siteConfig.name} | ${siteConfig.nameEn}`,
          template: `%s | ${siteConfig.name}`,
        },
    description,
    keywords: [...siteConfig.keywords],
    authors: [{ name: siteConfig.creator }],
    creator: siteConfig.creator,
    publisher: siteConfig.creator,
    applicationName: siteConfig.name,
    category: "event",
    alternates: {
      canonical,
    },
    icons: {
      icon: [
        { url: siteConfig.appIcon, sizes: "512x512", type: "image/jpeg" },
        { url: "/icon.svg", type: "image/svg+xml" },
      ],
      apple: [
        { url: siteConfig.appIcon, sizes: "512x512", type: "image/jpeg" },
      ],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
    openGraph: {
      type: ogType,
      locale: siteConfig.locale.replace("_", "-"),
      url: canonical,
      siteName: siteConfig.name,
      title: pageTitle,
      description,
      images: [
        {
          url: ogImage,
          secureUrl: ogImage.startsWith("https") ? ogImage : undefined,
          width: 1200,
          height: 630,
          alt: siteConfig.ogImageAlt,
          type: "image/jpeg",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: {
        url: ogImage,
        alt: siteConfig.ogImageAlt,
      },
    },
    other: {
      "geo.region": siteConfig.country,
      "geo.placename": siteConfig.location,
      "apple-mobile-web-app-title": siteConfig.name,
    },
  };
}
