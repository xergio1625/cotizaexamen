import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { siteConfig } from './site.config';

export default defineConfig({
  site: siteConfig.url,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [sitemap()],
});
