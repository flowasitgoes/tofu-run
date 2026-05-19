import type { Metadata } from "next";
import {
  absoluteUrl,
  getShareOgImageSquareUrl,
  getShareOgImageUrl,
  siteConfig,
} from "@/lib/site";

type PageMetaOptions = {
  title?: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
  ogType?: "website" | "article";
};

const siteIcons = {
  icon: [
    {
      url: siteConfig.appIcons["32"],
      sizes: "32x32",
      type: "image/jpeg",
    },
    {
      url: siteConfig.appIcons["64"],
      sizes: "64x64",
      type: "image/jpeg",
    },
    {
      url: siteConfig.appIcons["192"],
      sizes: "192x192",
      type: "image/jpeg",
    },
    {
      url: siteConfig.appIcons["512"],
      sizes: "512x512",
      type: "image/jpeg",
    },
    { url: "/icon.svg", type: "image/svg+xml" },
  ],
  apple: [
    {
      url: siteConfig.appIcons["192"],
      sizes: "192x192",
      type: "image/jpeg",
    },
    {
      url: siteConfig.appIcons["512"],
      sizes: "512x512",
      type: "image/jpeg",
    },
  ],
  shortcut: siteConfig.appIcons["32"],
} satisfies Metadata["icons"];

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
  const ogImageSquare = getShareOgImageSquareUrl();
  const ogImageLandscape = getShareOgImageUrl();

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
    icons: siteIcons,
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
          url: ogImageSquare,
          secureUrl: ogImageSquare.startsWith("https") ? ogImageSquare : undefined,
          width: 1080,
          height: 1080,
          alt: siteConfig.ogImageSquareAlt,
          type: "image/jpeg",
        },
        {
          url: ogImageLandscape,
          secureUrl: ogImageLandscape.startsWith("https")
            ? ogImageLandscape
            : undefined,
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
        url: ogImageLandscape,
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
