import { seoAssets } from "@/lib/seo-assets";
import { absoluteUrl, siteConfig } from "@/lib/site";

function imageObject(
  path: string,
  width: number,
  height: number,
  caption: string
) {
  const url = absoluteUrl(path);
  return {
    "@type": "ImageObject" as const,
    url,
    contentUrl: url,
    width,
    height,
    caption,
  };
}

export function JsonLd() {
  const base = absoluteUrl("/");
  const { og } = seoAssets;
  const appIcon = seoAssets.icons[3];

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${base}#website`,
        url: base,
        name: siteConfig.name,
        alternateName: siteConfig.nameEn,
        description: siteConfig.shortDescription,
        inLanguage: "zh-Hant",
        publisher: { "@id": `${base}#organization` },
        image: { "@id": `${base}#og-image` },
      },
      {
        "@type": "Organization",
        "@id": `${base}#organization`,
        name: siteConfig.name,
        url: base,
        description: siteConfig.shortDescription,
        logo: { "@id": `${base}#logo` },
      },
      {
        "@id": `${base}#og-image`,
        ...imageObject(og.path, og.width, og.height, og.alt),
      },
      {
        "@id": `${base}#logo`,
        ...imageObject(appIcon.path, appIcon.width, appIcon.height, appIcon.alt),
      },
      {
        "@type": "SportsEvent",
        "@id": `${base}#event`,
        name: siteConfig.name,
        description: siteConfig.shortDescription,
        image: { "@id": `${base}#og-image` },
        eventAttendanceMode:
          "https://schema.org/OfflineEventAttendanceMode",
        eventStatus: "https://schema.org/EventScheduled",
        location: {
          "@type": "Place",
          name: siteConfig.location,
          address: {
            "@type": "PostalAddress",
            addressLocality: siteConfig.city,
            addressCountry: "TW",
          },
        },
        organizer: { "@id": `${base}#organization` },
        url: base,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
