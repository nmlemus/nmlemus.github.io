import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { contrastTransformer } from './src/lib/shiki-contrast.ts';

export default defineConfig({
  site: 'https://nmlemus.github.io',
  // Inline all CSS: removes render-blocking requests (KaTeX CSS is ~23 KB); first visit matters most for a blog.
  build: { inlineStylesheets: 'always' },
  integrations: [
    sitemap({ i18n: { defaultLocale: 'en', locales: { en: 'en', es: 'es', pt: 'pt-BR' } } }),
  ],
  markdown: {
    // Sätteri (Astro 7 default) doesn't run remark/rehype plugins; unified is required for math.
    processor: unified({ remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] }),
    shikiConfig: { themes: { light: 'solarized-light', dark: 'solarized-dark' }, transformers: [contrastTransformer] },
  },
});
