import { HTML_LANG, type Lang } from '../i18n/langs.ts';

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function longDate(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(HTML_LANG[lang], { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(date);
}
