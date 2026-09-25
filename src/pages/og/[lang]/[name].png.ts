import type { APIContext } from 'astro';
import { LANGS } from '../../../i18n/langs.ts';
import { t } from '../../../i18n/ui.ts';
import { getPostGroups } from '../../../lib/posts.ts';
import { renderOgPng } from '../../../lib/og.ts';

export async function getStaticPaths() {
  const groups = await getPostGroups();
  return LANGS.flatMap((lang) => [
    { params: { lang, name: '_site' }, props: { title: t(lang, 'site.tagline'), dir: '~' } },
    ...groups.map((g) => ({ params: { lang, name: g.slug }, props: { title: g.byLang[lang].data.title, dir: '~/writing' } })),
  ]);
}

export async function GET({ props }: APIContext) {
  const png = await renderOgPng(props.title as string, props.dir as string);
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
}
