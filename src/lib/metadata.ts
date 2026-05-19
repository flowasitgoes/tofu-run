import type { Metadata } from "next";
import { absoluteUrl, getShareOgImageUrl, siteConfig } from "@/lib/site";

type PageMetaOptions = {
  title?: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
  ogType?: "website" | "article";
};

const { icons: siteIcons } = siteConfig;

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
    metadataBase: new URL(absoluteUrl("/")),
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
        {
          url: siteIcons.favicon32,
          sizes: "32x32",
          type: "image/jpeg",
        },
        {
          url: siteIcons.favicon64,
          sizes: "64x64",
          type: "image/jpeg",
        },
        {
          url: siteIcons.android192,
          sizes: "192x192",
          type: "image/jpeg",
        },
        {
          url: siteIcons.pwa512,
          sizes: "512x512",
          type: "image/jpeg",
        },
        { url: "/icon.svg", type: "image/svg+xml" },
      ],
      apple: [
        {
          url: siteIcons.android192,
          sizes: "192x192",
          type: "image/jpeg",
        },
        {
          url: siteIcons.pwa512,
          sizes: "512x512",
          type: "image/jpeg",
        },
      ],
      shortcut: siteIcons.favicon64,
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
      locale: siteConfig.locale,
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
          type: "image/png",
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
