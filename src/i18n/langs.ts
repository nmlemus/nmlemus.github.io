export const LANGS = ['en', 'es', 'pt'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';
export const HTML_LANG: Record<Lang, string> = { en: 'en', es: 'es', pt: 'pt-BR' };
export const OG_LOCALE: Record<Lang, string> = { en: 'en_US', es: 'es_ES', pt: 'pt_BR' };

export function isLang(value: string | undefined): value is Lang {
  return (LANGS as readonly (string | undefined)[]).includes(value);
}
