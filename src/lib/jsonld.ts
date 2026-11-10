import { siteConfig } from '../../site.config';

/** Constructores de datos estructurados. Los de precios se añaden en la etapa del comparador. */

export const organizationLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteConfig.brand,
  url: siteConfig.url,
  description: siteConfig.description,
});

export const websiteLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteConfig.brand,
  url: siteConfig.url,
  inLanguage: siteConfig.lang,
});

export const faqLd = (items: { q: string; a: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((i) => ({
    '@type': 'Question',
    name: i.q,
    acceptedAnswer: { '@type': 'Answer', text: i.a },
  })),
});

export const breadcrumbLd = (crumbs: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((c, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: c.name,
    item: new URL(c.path, siteConfig.url).href,
  })),
});

/**
 * Precios de un examen.
 * Decisión de esquema: un examen de laboratorio no es un Product físico, así que se modela como
 * Service con AggregateOffer (rango y cantidad) y un Offer por prestador.
 * Deliberadamente NO se emiten aggregateRating, review, priceValidUntil ni availability:
 * no tenemos esos datos y no se inventan. El orden de offers sigue la regla de independencia
 * (el llamador entrega las filas ya ordenadas por precio).
 */
export const priceServiceLd = (o: {
  name: string;
  description: string;
  path: string;
  offers: { amount: number; providerName: string; providerWebsite?: string; kind: string; subdivision?: string }[];
  lastVerified: Date;
}) => {
  const amounts = o.offers.map((x) => x.amount);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    url: new URL(o.path, siteConfig.url).href,
    inLanguage: siteConfig.lang,
    dateModified: o.lastVerified.toISOString(),
    mainEntity: {
      '@type': 'Service',
      name: o.name,
      description: o.description,
      serviceType: 'Examen de laboratorio',
      areaServed: { '@type': 'Country', name: siteConfig.country.name },
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: siteConfig.country.currency,
        lowPrice: Math.min(...amounts),
        highPrice: Math.max(...amounts),
        offerCount: o.offers.length,
        offers: o.offers.map((x) => ({
          '@type': 'Offer',
          price: x.amount,
          priceCurrency: siteConfig.country.currency,
          description: x.subdivision ? `${x.kind}, ${x.subdivision}` : x.kind,
          seller: {
            '@type': 'Organization',
            name: x.providerName,
            ...(x.providerWebsite ? { url: x.providerWebsite } : {}),
          },
        })),
      },
    },
  };
};

export const articleLd =(o: { title: string; description: string; path: string; updated: Date }) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: o.title,
  description: o.description,
  inLanguage: siteConfig.lang,
  mainEntityOfPage: new URL(o.path, siteConfig.url).href,
  dateModified: o.updated.toISOString(),
  author: { '@type': 'Person', name: siteConfig.author.displayName, jobTitle: siteConfig.author.credential },
  publisher: { '@type': 'Organization', name: siteConfig.brand, url: siteConfig.url },
});
