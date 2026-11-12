import { siteConfig } from '../../site.config';

/** Constructores de datos estructurados. */

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
 * Página de un examen.
 * Un examen de laboratorio no es un Product físico, así que se modela como Service.
 * - Los valores de referencia FONASA (arancel, por nivel) van como additionalProperty: son una
 *   referencia pública, NO una oferta de venta, así que no se marcan como Offer.
 * - Solo los precios reales de prestadores (con fuente y fecha) se emiten como Offer dentro de
 *   un AggregateOffer.
 * Deliberadamente NO se emiten aggregateRating, review, priceValidUntil ni availability:
 * no tenemos esos datos y no se inventan. Las offers llegan ya ordenadas por precio.
 */
export const examServiceLd = (o: {
  name: string;
  description: string;
  path: string;
  code: string;
  levels: { level: string; total: number; benef: number }[];
  offers: { amount: number; providerName: string; providerWebsite?: string; kind: string; subdivision?: string }[];
  lastVerified?: Date;
}) => {
  const amounts = o.offers.map((x) => x.amount);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    url: new URL(o.path, siteConfig.url).href,
    inLanguage: siteConfig.lang,
    ...(o.lastVerified ? { dateModified: o.lastVerified.toISOString() } : {}),
    mainEntity: {
      '@type': 'Service',
      name: o.name,
      description: o.description,
      serviceType: 'Examen de laboratorio',
      ...(o.code ? { identifier: { '@type': 'PropertyValue', propertyID: 'Código FONASA', value: o.code } } : {}),
      areaServed: { '@type': 'Country', name: siteConfig.country.name },
      additionalProperty: o.levels.map((l) => ({
        '@type': 'PropertyValue',
        name: `Valor total Arancel MLE FONASA 2026, nivel ${l.level}`,
        value: l.total,
        unitText: siteConfig.country.currency,
      })),
      ...(o.offers.length
        ? {
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
          }
        : {}),
    },
  };
};

export const articleLd = (o: {
  title: string;
  description: string;
  path: string;
  updated: Date;
  published?: Date;
  /** Ruta absoluta del sitio de la imagen principal (1200x630). */
  image?: string;
  /** Fuentes del artículo; las que tienen URL se declaran como citas. */
  sources?: { label: string; url?: string }[];
}) => {
  const url = new URL(o.path, siteConfig.url).href;
  const cited = (o.sources ?? []).filter((s) => s.url);
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: o.title,
    description: o.description,
    inLanguage: siteConfig.lang,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    ...(o.published ? { datePublished: o.published.toISOString() } : {}),
    dateModified: o.updated.toISOString(),
    ...(o.image ? { image: [new URL(o.image, siteConfig.url).href] } : {}),
    isAccessibleForFree: true,
    author: {
      '@type': 'Person',
      name: siteConfig.author.displayName,
      jobTitle: siteConfig.author.credential,
      url: new URL('/sobre-el-sitio/', siteConfig.url).href,
    },
    publisher: { '@type': 'Organization', name: siteConfig.brand, url: siteConfig.url },
    ...(cited.length ? { citation: cited.map((s) => ({ '@type': 'CreativeWork', name: s.label, url: s.url })) } : {}),
  };
};

/** Portada de la sección Opinión: colección con la lista de artículos. */
export const blogLd = (o: { name: string; description: string; path: string; posts: { title: string; path: string; published: Date }[] }) => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: o.name,
  description: o.description,
  url: new URL(o.path, siteConfig.url).href,
  inLanguage: siteConfig.lang,
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: o.posts.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: new URL(p.path, siteConfig.url).href,
      name: p.title,
    })),
  },
});
