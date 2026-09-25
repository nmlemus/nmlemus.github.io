import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { HTML_LANG, type Lang } from '../../i18n/langs.ts';
import { langParams, localePath } from '../../i18n/paths.ts';
import { t } from '../../i18n/ui.ts';
import { getPosts } from '../../lib/posts.ts';

export function getStaticPaths() {
  return langParams();
}

export async function GET(context: APIContext) {
  const lang = context.props.lang as Lang;
  const posts = await getPosts(lang);
  return rss({
    title: t(lang, 'meta.homeTitle'),
    description: t(lang, 'meta.homeDescription'),
    site: context.site!,
    items: posts.map(({ slug, entry }) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.date,
      link: localePath(lang, `blog/${slug}/`),
      categories: entry.data.tags,
    })),
    customData: `<language>${HTML_LANG[lang]}</language>`,
  });
}
