import { LANGS, isLang, type Lang } from '../i18n/langs.ts';

export interface PostData {
  title: string;
  description: string;
  date: Date;
  updated?: Date;
  tags: string[];
  draft?: boolean;
}
export interface RawPost {
  id: string;
  data: PostData;
}
export interface PostGroup<T extends RawPost = RawPost> {
  slug: string;
  byLang: Record<Lang, T>;
}

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class PostValidationError extends Error {
  problems: string[];
  constructor(problems: string[]) {
    super(`Invalid blog content:\n  - ${problems.join('\n  - ')}`);
    this.name = 'PostValidationError';
    this.problems = problems;
  }
}

/** Groups `<slug>/<lang>` entries, enforces the 3-language rules, drops drafts, newest first. */
export function validatePosts<T extends RawPost>(entries: T[]): PostGroup<T>[] {
  const problems: string[] = [];
  const groups = new Map<string, Partial<Record<Lang, T>>>();

  for (const entry of entries) {
    const [slug, lang, ...rest] = entry.id.split('/');
    if (rest.length || !isLang(lang)) {
      problems.push(`${entry.id}: expected <slug>/<${LANGS.join('|')}>.md`);
      continue;
    }
    groups.set(slug, { ...groups.get(slug), [lang]: entry });
  }

  const valid: PostGroup<T>[] = [];
  for (const [slug, group] of groups) {
    const found = Object.values(group) as T[];
    if (found.some((e) => e.data.draft)) continue;
    const errors = checkGroup(slug, group);
    problems.push(...errors);
    if (!errors.length) valid.push({ slug, byLang: group as Record<Lang, T> });
  }

  if (problems.length) throw new PostValidationError(problems);
  return valid.sort((a, b) => b.byLang.en.data.date.getTime() - a.byLang.en.data.date.getTime());
}

function checkGroup(slug: string, group: Partial<Record<Lang, RawPost>>): string[] {
  if (!KEBAB.test(slug)) return [`${slug}: folder name must be lowercase-kebab-case`];
  const missing = LANGS.filter((lang) => !group[lang]);
  if (missing.length) return [`${slug}: missing translation(s) ${missing.map((l) => `${l}.md`).join(', ')}`];

  const en = group.en!.data;
  const errors = en.tags.filter((tag) => !KEBAB.test(tag)).map((tag) => `${slug}: tag "${tag}" must be lowercase-kebab-case`);
  for (const lang of LANGS) {
    const data = group[lang]!.data;
    if (data.date.getTime() !== en.date.getTime()) errors.push(`${slug}/${lang}.md: date differs from en.md`);
    if (sortedKey(data.tags) !== sortedKey(en.tags)) errors.push(`${slug}/${lang}.md: tags differ from en.md`);
  }
  return errors;
}

function sortedKey(tags: string[]): string {
  return [...tags].sort().join(',');
}
