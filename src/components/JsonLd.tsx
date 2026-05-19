import { absoluteUrl, siteConfig } from "@/lib/site";

export function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${absoluteUrl("/")}#website`,
        url: absoluteUrl("/"),
        name: siteConfig.name,
        alternateName: siteConfig.nameEn,
        description: siteConfig.shortDescription,
        inLanguage: "zh-Hant",
        publisher: { "@id": `${absoluteUrl("/")}#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${absoluteUrl("/")}#organization`,
        name: siteConfig.name,
        url: absoluteUrl("/"),
        description: siteConfig.shortDescription,
        logo: absoluteUrl(siteConfig.icons.pwa512),
        image: [
          absoluteUrl(siteConfig.ogImage),
          absoluteUrl(siteConfig.ogImageSquare),
        ],
      },
      {
        "@type": "SportsEvent",
        "@id": `${absoluteUrl("/")}#event`,
        name: siteConfig.name,
        description: siteConfig.shortDescription,
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
        organizer: { "@id": `${absoluteUrl("/")}#organization` },
        url: absoluteUrl("/"),
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
