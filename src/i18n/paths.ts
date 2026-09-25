import { DEFAULT_LANG, LANGS, type Lang } from './langs.ts';

/** Site path for `lang`. `path` is language-agnostic, e.g. '' or 'blog/my-post/'. */
export function localePath(lang: Lang, path = ''): string {
  const prefix = lang === DEFAULT_LANG ? '/' : `/${lang}/`;
  return prefix + path.replace(/^\/+/, '');
}

/** getStaticPaths entries for `[...lang]` routes; the default language maps to no prefix. */
export function langParams() {
  return LANGS.map((lang) => ({
    params: { lang: lang === DEFAULT_LANG ? undefined : lang },
    props: { lang },
  }));
}
