import { seoAssets } from "@/lib/seo-assets";
import { absoluteSeoUrl, seoContent } from "@/lib/seo-content";
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
  const base = absoluteSeoUrl("/");
  const { og } = seoAssets;
  const appIcon = seoAssets.icons[3];

  const faqPage = {
    "@type": "FAQPage",
    "@id": `${base}#faq`,
    mainEntity: seoContent.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.qZh,
      acceptedAnswer: {
        "@type": "Answer",
        text: `${faq.aZh} / ${faq.aEn}`,
      },
    })),
  };

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${base}#website`,
        url: base,
        name: siteConfig.name,
        alternateName: [siteConfig.nameEn, "Tofu Run Kaohsiung", "豆花慢跑 高雄"],
        description: `${siteConfig.shortDescription} ${siteConfig.shortDescriptionEn}`,
        inLanguage: ["zh-Hant", "en"],
        publisher: { "@id": `${base}#organization` },
        image: { "@id": `${base}#og-image` },
      },
      {
        "@type": "WebPage",
        "@id": `${base}#webpage`,
        url: base,
        name: `${siteConfig.name} | ${siteConfig.nameEn}`,
        description: siteConfig.description,
        isPartOf: { "@id": `${base}#website` },
        about: { "@id": `${base}#event` },
        inLanguage: "zh-Hant",
        primaryImageOfPage: { "@id": `${base}#og-image` },
      },
      {
        "@type": "Organization",
        "@id": `${base}#organization`,
        name: siteConfig.name,
        alternateName: siteConfig.nameEn,
        url: base,
        description: siteConfig.shortDescription,
        logo: { "@id": `${base}#logo` },
        sameAs: ["https://ifunlove.com/"],
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
        name: `${siteConfig.name} (${siteConfig.nameEn})`,
        alternateName: siteConfig.nameEn,
        description: siteConfig.description,
        disambiguatingDescription: siteConfig.descriptionEn,
        image: { "@id": `${base}#og-image` },
        eventAttendanceMode:
          "https://schema.org/OfflineEventAttendanceMode",
        eventStatus: "https://schema.org/EventScheduled",
        isAccessibleForFree: true,
        sport: "Running",
        location: {
          "@type": "Place",
          name: siteConfig.location,
          alternateName: seoContent.locationEn,
          address: {
            "@type": "PostalAddress",
            addressLocality: siteConfig.city,
            addressRegion: "Kaohsiung",
            addressCountry: "TW",
          },
          geo: {
            "@type": "GeoCoordinates",
            latitude: 22.6687,
            longitude: 120.3066,
          },
        },
        organizer: { "@id": `${base}#organization` },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "TWD",
          availability: "https://schema.org/InStock",
          url: base,
        },
        url: base,
      },
      faqPage,
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
