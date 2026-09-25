import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/langs.ts';
import { validatePosts, type PostGroup } from './validate-posts.ts';

export type BlogEntry = CollectionEntry<'blog'>;
export interface LocalizedPost {
  slug: string;
  entry: BlogEntry;
}

let groups: Promise<PostGroup<BlogEntry>[]> | undefined;

/** The only way pages read posts: validated, drafts removed, newest first. */
export function getPostGroups(): Promise<PostGroup<BlogEntry>[]> {
  groups ??= getCollection('blog').then((entries) => validatePosts(entries));
  return groups;
}

export async function getPosts(lang: Lang): Promise<LocalizedPost[]> {
  return (await getPostGroups()).map((g) => ({ slug: g.slug, entry: g.byLang[lang] }));
}

export async function getTags(): Promise<string[]> {
  const tags = new Set((await getPostGroups()).flatMap((g) => g.byLang.en.data.tags));
  return [...tags].sort();
}
