import type { Metadata } from "next";
import { seoAssets } from "@/lib/seo-assets";
import { absoluteSeoUrl } from "@/lib/seo-content";
import { absoluteUrl, ogImageUrl, siteConfig, siteUrl } from "@/lib/site";

type PageMetaOptions = {
  title?: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
  ogType?: "website" | "article";
};

const defaultTitle = `${siteConfig.name} | ${siteConfig.nameEn}`;

const { og } = seoAssets;

const metadataIcons: NonNullable<Metadata["icons"]> = {
  icon: [
    ...seoAssets.icons.map((icon) => ({
      url: icon.path,
      sizes: icon.sizes,
      type: icon.mimeType,
    })),
    { url: seoAssets.vectorIcon.path, type: seoAssets.vectorIcon.mimeType },
  ],
  apple: seoAssets.icons
    .filter((icon) => icon.sizes === "192x192" || icon.sizes === "512x512")
    .map((icon) => ({
      url: icon.path,
      sizes: icon.sizes,
      type: icon.mimeType,
    })),
  shortcut: seoAssets.icons[1].path,
};

export function createMetadata({
  title,
  description = siteConfig.description,
  path = "",
  noIndex = false,
  ogType = "website",
}: PageMetaOptions = {}): Metadata {
  const pageTitle = title ? `${title} | ${siteConfig.name}` : defaultTitle;
  const pageUrl = absoluteUrl(path).replace(/\/$/, "") || siteUrl.replace(/\/$/, "");
  const canonicalUrl = absoluteSeoUrl(path);
  const googleSiteVerification =
    process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ??
    siteConfig.googleSiteVerification;

  return {
    metadataBase: new URL(siteUrl),
    title: title
      ? title
      : {
          default: defaultTitle,
          template: `%s | ${siteConfig.name}`,
        },
    description,
    keywords: [...siteConfig.keywords],
    authors: [{ name: siteConfig.creator, url: "https://ifunlove.com/" }],
    creator: siteConfig.creator,
    publisher: siteConfig.creator,
    applicationName: siteConfig.name,
    category: "SportsEvent",
    formatDetection: { email: false, address: false, telephone: false },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "zh-Hant": canonicalUrl,
        en: canonicalUrl,
        "x-default": canonicalUrl,
      },
      types: {
        "text/plain": absoluteSeoUrl("/llms.txt"),
      },
    },
    icons: metadataIcons,
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
            "max-video-preview": -1,
          },
        },
    openGraph: {
      type: ogType,
      locale: siteConfig.locale,
      alternateLocale: ["en_US"],
      url: pageUrl,
      siteName: siteConfig.name,
      title: pageTitle,
      description,
      images: [
        {
          url: ogImageUrl,
          width: og.width,
          height: og.height,
          alt: og.alt,
          type: og.mimeType,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: [{ url: ogImageUrl, alt: og.alt }],
    },
    other: {
      "geo.region": siteConfig.country,
      "geo.placename": siteConfig.location,
      "apple-mobile-web-app-title": siteConfig.name,
      "content-language": "zh-Hant",
      ...(process.env.NEXT_PUBLIC_FB_APP_ID && {
        "fb:app_id": process.env.NEXT_PUBLIC_FB_APP_ID,
      }),
      ...(googleSiteVerification
        ? { "google-site-verification": googleSiteVerification }
        : {}),
    },
  };
}
