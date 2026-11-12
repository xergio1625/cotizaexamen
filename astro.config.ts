import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { siteConfig } from './site.config';

export default defineConfig({
  site: siteConfig.url,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  // Los exámenes sin código FONASA (slug terminado en -sf...) no van al sitemap: son fichas sin valor oficial.
  integrations: [sitemap({ filter: (page) => !/\/precios\/[^/]*-sf[a-z0-9]+\/$/.test(page) })],
});
