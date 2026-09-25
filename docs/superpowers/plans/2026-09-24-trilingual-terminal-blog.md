# Trilingual Terminal Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the beautiful-jekyll template with an Astro static blog in EN/ES/PT whose look is derived from the author's iTerm2 Solarized + powerlevel10k setup, plus a sepia reader mode.

**Architecture:** Astro 7 SSG. One set of page files under `src/pages/[...lang]/` serves all three languages (EN unprefixed, ES/PT prefixed). All content access goes through `getPostGroups()`, which runs a pure, unit-tested validator that fails the build on missing translations or divergent metadata. Post-build, a small script checks links, hreflang and feed parity in `dist/`.

**Tech Stack:** Astro 7.3.5 (Sätteri markdown, Shiki), @astrojs/sitemap 3.7.4, @astrojs/rss 4.0.19, satori 0.33.5, @resvg/resvg-js 2.6.2, Node 24 LTS, `node:test`.

**Spec:** `docs/superpowers/specs/2026-09-24-trilingual-terminal-blog-design.md`

## Global Constraints

- Languages: `en` (default, no URL prefix), `es`, `pt` (Brazilian Portuguese; BCP-47 `pt-BR` in `lang`/`hreflang`).
- Identical slug across languages; post folder = `src/content/blog/<slug>/{en,es,pt}.md`.
- Dependencies allowed: exactly `astro`, `@astrojs/sitemap`, `@astrojs/rss`, `satori`, `@resvg/resvg-js` (pinned, `--save-exact`). Anything else: ask the author first.
- **Spec deviations (need author approval):** (1) no math — Astro 7's default Sätteri pipeline doesn't run `remark-math`/`rehype-katex`; none of the initial posts need LaTeX. (2) no `astro check` — it needs `@astrojs/check` + `typescript`; type safety for UI strings is covered by a unit test instead.
- Client JS: only the mode toggle and copy-link button.
- No third-party requests at runtime (fonts self-hosted).
- Text contrast ≥ 4.5:1 in all three modes (tokens below are pre-computed to pass).
- Never invent profile facts: every date/number/title on About/Projects must exist in the LinkedIn snapshot.
- Commit messages end with the session attribution lines.

## Review Focus

1. A tag or folder name with capitals/accents/spaces (`IA Generativa`, `Mi_Post`) → build fails with a clear message instead of producing broken URLs. (Task 2 test)
2. A stray file in a post folder (`notes.md`, `fr.md`) → build fails, never silently published. (Task 2 test)
3. All posts are drafts / zero posts → site still builds; home, blog and RSS render an empty list. (Task 2 test + Task 7 build check)
4. `date: 2026-09-10` viewed from a UTC-5 machine → shows 2026-09-10, not 09-09. (Task 2 test with `TZ`)
5. Long code lines / box tables on a 360px phone → no horizontal page scroll; only the code block scrolls. (Task 5 visual check)

## File Map

```
astro.config.mjs, package.json, tsconfig.json, .nvmrc
public/fonts/*.woff2 + licenses, public/favicon.svg, public/img/noel.jpeg
src/content.config.ts
src/content/blog/<slug>/{en,es,pt}.md
src/i18n/langs.ts            LANGS, Lang, HTML_LANG, OG_LOCALE, isLang
src/i18n/paths.ts            localePath(), langParams()
src/i18n/ui.ts               ui strings, t()
src/lib/validate-posts.ts    pure validator (no astro imports)
src/lib/posts.ts             getPostGroups(), getPosts(), getTags()
src/lib/format.ts            isoDate(), longDate()
src/lib/reading-time.ts      readingMinutes()
src/lib/jsonld.ts            person(), blogPosting()
src/lib/og.ts                renderOgPng()
src/data/profile.ts          about bio, timeline, education, links
src/data/projects.ts         projects
src/scripts/mode.ts          reader-mode toggle (client)
src/styles/global.css        tokens, modes, base, markdown prose
src/layouts/types.ts         Section type
src/layouts/BaseLayout.astro head/meta/hreflang, TabBar, main
src/components/{TabBar,Prompt,PostList,Frontmatter}.astro
src/pages/[...lang]/{index,projects,about}.astro
src/pages/[...lang]/blog/{index,[slug]}.astro, blog/tags/[tag].astro
src/pages/[...lang]/rss.xml.ts
src/pages/og/[lang]/[name].png.ts
src/pages/404.astro
src/assets/og-fonts/meslo-{regular,bold}.ttf
scripts/lib/verify.mjs, scripts/verify-dist.mjs
tests/*.test.ts, tests/verify.test.mjs
.github/workflows/deploy.yml
```

---

### Task 1: Scaffold Astro, remove Jekyll template

**Files:** Create `package.json`, `astro.config.mjs`, `tsconfig.json`, `.nvmrc`, `src/pages/index.astro` (temporary). Delete the template.

- [ ] **Step 1: Remove template files (keep photo)**

```bash
mkdir -p public/img && git mv assets/img/noel.jpeg public/img/noel.jpeg
git rm -r -q .gitattributes .github 404.html CHANGELOG.md Gemfile LICENSE README.md _config.yml _data _includes _layouts _posts aboutme.md assets beautiful-jekyll-theme.gemspec docs/index.html feed.xml index.html screenshot.png staticman.yml tags.html
```

- [ ] **Step 2: Create project files**

`package.json`:
```json
{
  "name": "nmlemus-blog",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "node --test \"tests/**/*.test.ts\" \"tests/**/*.test.mjs\"",
    "verify": "node scripts/verify-dist.mjs"
  }
}
```
`.nvmrc`: `24`

`astro.config.mjs`:
```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://nmlemus.github.io',
  integrations: [
    sitemap({ i18n: { defaultLocale: 'en', locales: { en: 'en', es: 'es', pt: 'pt-BR' } } }),
  ],
  markdown: {
    shikiConfig: { themes: { light: 'solarized-light', dark: 'solarized-dark' } },
  },
});
```
`tsconfig.json`:
```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"],
  "compilerOptions": { "allowImportingTsExtensions": true }
}
```
`src/pages/index.astro` (temporary, replaced in Task 4): `<h1>ok</h1>`

`.gitignore` — replace Jekyll entries with:
```
node_modules/
dist/
.astro/
.DS_Store
.superpowers/
```

- [ ] **Step 3: Install pinned deps and confirm Shiki themes exist**

```bash
npm install --save-exact astro@7.3.5 @astrojs/sitemap@3.7.4 @astrojs/rss@4.0.19 satori@0.33.5 @resvg/resvg-js@2.6.2
node -e "import('shiki').then(({bundledThemes:b})=>console.log(['solarized-dark','solarized-light'].map(t=>t+':'+(t in b)).join(' ')))"
```
Expected: `solarized-dark:true solarized-light:true`. If false, stop and pick the closest bundled theme with the author.

- [ ] **Step 4: Build** — `npm run build` → exit 0, `dist/index.html` exists.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "chore: replace Jekyll template with Astro scaffold"`

---

### Task 2: i18n + content core (TDD)

**Files:** Create `src/i18n/{langs,paths,ui}.ts`, `src/lib/{validate-posts,format,reading-time,posts}.ts`, `src/content.config.ts`, `tests/{paths,ui,validate-posts,format,reading-time}.test.ts`.

**Interfaces — Produces:**
- `LANGS: readonly ['en','es','pt']`, `type Lang`, `DEFAULT_LANG`, `HTML_LANG: Record<Lang,string>`, `OG_LOCALE`, `isLang(v: string): v is Lang`
- `localePath(lang: Lang, path?: string): string`; `langParams(): {params:{lang:string|undefined}; props:{lang:Lang}}[]`
- `t(lang: Lang, key: UiKey): string`, `ui`
- `validatePosts<T extends RawPost>(entries: T[]): PostGroup<T>[]`, `PostValidationError` (`.problems: string[]`)
- `getPostGroups()`, `getPosts(lang): Promise<LocalizedPost[]>` where `LocalizedPost = {slug; entry: BlogEntry}`, `getTags(): Promise<string[]>`
- `isoDate(d: Date): string` (`YYYY-MM-DD`, UTC), `longDate(d: Date, lang): string`
- `readingMinutes(markdown: string): number` (≥1)

- [ ] **Step 1: Write failing tests**

`tests/paths.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localePath, langParams } from '../src/i18n/paths.ts';

test('english paths have no prefix', () => {
  assert.equal(localePath('en'), '/');
  assert.equal(localePath('en', 'blog/x/'), '/blog/x/');
});
test('other languages are prefixed', () => {
  assert.equal(localePath('es', 'blog/x/'), '/es/blog/x/');
  assert.equal(localePath('pt'), '/pt/');
});
test('leading slashes in path are ignored', () => {
  assert.equal(localePath('es', '/about/'), '/es/about/');
});
test('langParams maps english to the unprefixed route', () => {
  assert.deepEqual(langParams().map((p) => p.params.lang), [undefined, 'es', 'pt']);
});
```

`tests/ui.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ui } from '../src/i18n/ui.ts';

test('every language defines every key with non-empty text', () => {
  const keys = Object.keys(ui.en).sort();
  for (const lang of ['es', 'pt'] as const) {
    assert.deepEqual(Object.keys(ui[lang]).sort(), keys, `${lang} keys differ from en`);
    for (const key of keys) assert.ok(ui[lang][key as keyof typeof ui.en].trim(), `${lang}.${key} is empty`);
  }
});
```

`tests/validate-posts.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePosts, PostValidationError, type RawPost } from '../src/lib/validate-posts.ts';

const post = (id: string, over: Partial<RawPost['data']> = {}): RawPost => ({
  id,
  data: { title: 'T', description: 'D', date: new Date('2026-09-10'), tags: ['agents'], ...over },
});
const full = (slug: string, over: Partial<RawPost['data']> = {}) =>
  ['en', 'es', 'pt'].map((l) => post(`${slug}/${l}`, over));
const problems = (entries: RawPost[]) => {
  try { validatePosts(entries); } catch (e) { assert.ok(e instanceof PostValidationError); return e.problems; }
  assert.fail('expected validation to throw');
};

test('empty input is valid', () => assert.deepEqual(validatePosts([]), []));

test('groups complete posts by slug', () => {
  const [g] = validatePosts(full('a'));
  assert.equal(g.slug, 'a');
  assert.deepEqual(Object.keys(g.byLang).sort(), ['en', 'es', 'pt']);
});

test('sorts newest first', () => {
  const groups = validatePosts([...full('old', { date: new Date('2025-01-01') }), ...full('new')]);
  assert.deepEqual(groups.map((g) => g.slug), ['new', 'old']);
});

test('missing translation fails', () => {
  assert.match(problems(full('a').slice(0, 2)).join(), /a: missing translation\(s\) pt\.md/);
});

test('different date fails', () => {
  const [en, es, pt] = full('a');
  pt.data.date = new Date('2026-09-11');
  assert.match(problems([en, es, pt]).join(), /a\/pt\.md: date differs/);
});

test('different tags fail, reordered tags pass', () => {
  const [en, es, pt] = full('a', { tags: ['agents', 'cost'] });
  es.data.tags = ['cost', 'agents'];
  assert.equal(validatePosts([en, es, pt]).length, 1);
  pt.data.tags = ['agents'];
  assert.match(problems([en, es, pt]).join(), /a\/pt\.md: tags differ/);
});

test('draft in any language excludes the post, even if incomplete', () => {
  const [en, es, pt] = full('a');
  es.data.draft = true;
  assert.deepEqual(validatePosts([en, es, pt]), []);
  assert.deepEqual(validatePosts([post('b/en', { draft: true })]), []);
});

test('unexpected files fail', () => {
  assert.match(problems([...full('a'), post('a/notes')]).join(), /a\/notes: expected <slug>\/<en\|es\|pt>\.md/);
  assert.match(problems([post('stray')]).join(), /stray: expected/);
});

test('non kebab-case tags and folders fail', () => {
  assert.match(problems(full('a', { tags: ['IA Generativa'] })).join(), /tag "IA Generativa" must be lowercase-kebab-case/);
  assert.match(problems(full('Mi_Post')).join(), /Mi_Post: folder name must be lowercase-kebab-case/);
});

test('reports every problem at once', () => {
  assert.equal(problems([post('a/en'), post('b/en')]).length, 2);
});
```

`tests/format.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isoDate, longDate } from '../src/lib/format.ts';

const d = new Date('2026-09-10'); // YAML dates are UTC midnight

test('isoDate ignores the machine timezone', () => assert.equal(isoDate(d), '2026-09-10'));
test('longDate per language, UTC', () => {
  assert.equal(longDate(d, 'en'), 'September 10, 2026');
  assert.equal(longDate(d, 'es'), '10 de septiembre de 2026');
  assert.equal(longDate(d, 'pt'), '10 de setembro de 2026');
});
```

`tests/reading-time.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readingMinutes } from '../src/lib/reading-time.ts';

test('minimum one minute', () => assert.equal(readingMinutes(''), 1));
test('230 words per minute', () => assert.equal(readingMinutes('word '.repeat(690)), 3));
test('code blocks are not counted', () => {
  assert.equal(readingMinutes('word '.repeat(230) + '\n```\n' + 'code '.repeat(2000) + '\n```\n'), 1);
});
```

- [ ] **Step 2: Run** — `npm test` → FAIL (modules not found).

- [ ] **Step 3: Implement**

`src/i18n/langs.ts`:
```ts
export const LANGS = ['en', 'es', 'pt'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';
export const HTML_LANG: Record<Lang, string> = { en: 'en', es: 'es', pt: 'pt-BR' };
export const OG_LOCALE: Record<Lang, string> = { en: 'en_US', es: 'es_ES', pt: 'pt_BR' };

export function isLang(value: string | undefined): value is Lang {
  return (LANGS as readonly (string | undefined)[]).includes(value);
}
```

`src/i18n/paths.ts`:
```ts
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
```

`src/i18n/ui.ts`:
```ts
import type { Lang } from './langs.ts';

const en = {
  'site.tagline': 'Lab notes on applied AI',
  'a11y.skip': 'Skip to content',
  'nav.label': 'Main',
  'nav.home': '~',
  'nav.writing': 'writing',
  'nav.projects': 'projects',
  'nav.about': 'about',
  'lang.label': 'Language',
  'mode.reader': 'reader',
  'mode.terminal': 'terminal',
  'mode.toggle': 'Toggle reading mode',
  'home.role': 'AI technical leader · PhD, computational modeling',
  'home.bio': 'I design enterprise AI: agents, tools, evaluation, and the unglamorous engineering that makes them reliable. Before that, scientific computing: bioinformatics in Havana, a PhD in uncertainty quantification in Brazil, a patent on seismic fault detection.',
  'home.now': 'currently',
  'home.nowText': 'an open-source agent for data work on a live Jupyter kernel',
  'home.allPosts': 'all entries',
  'list.entries': 'entries',
  'list.empty': 'nothing here yet',
  'post.minutes': 'm',
  'post.readTime': 'min read',
  'post.toc': 'contents',
  'meta.homeTitle': 'Noel Moreno Lemus — Lab notes on applied AI',
  'meta.homeDescription': 'Notes on building agentic AI systems that hold up in production, by Noel Moreno Lemus.',
  'meta.blogTitle': 'Writing',
  'meta.tagTitle': 'Entries tagged',
  'meta.projectsTitle': 'Projects',
  'meta.projectsDescription': 'Open-source work, research software and a patent, by Noel Moreno Lemus.',
  'meta.aboutTitle': 'About',
  'meta.aboutDescription': 'Noel Moreno Lemus: AI technical leader, PhD in computational modeling.',
} as const;

export type UiKey = keyof typeof en;

const es: Record<UiKey, string> = {
  'site.tagline': 'Notas de laboratorio sobre IA aplicada',
  'a11y.skip': 'Saltar al contenido',
  'nav.label': 'Principal',
  'nav.home': '~',
  'nav.writing': 'escritos',
  'nav.projects': 'proyectos',
  'nav.about': 'sobre-mí',
  'lang.label': 'Idioma',
  'mode.reader': 'lectura',
  'mode.terminal': 'terminal',
  'mode.toggle': 'Cambiar modo de lectura',
  'home.role': 'Líder técnico de IA · PhD en modelación computacional',
  'home.bio': 'Diseño IA empresarial: agentes, herramientas, evaluación y la ingeniería poco glamorosa que los hace fiables. Antes, computación científica: bioinformática en La Habana, un doctorado en cuantificación de incertidumbre en Brasil y una patente de detección de fallas sísmicas.',
  'home.now': 'ahora',
  'home.nowText': 'un agente open source para trabajo con datos sobre un kernel de Jupyter vivo',
  'home.allPosts': 'todas las entradas',
  'list.entries': 'entradas',
  'list.empty': 'aún no hay nada aquí',
  'post.minutes': 'm',
  'post.readTime': 'min de lectura',
  'post.toc': 'contenido',
  'meta.homeTitle': 'Noel Moreno Lemus — Notas de laboratorio sobre IA aplicada',
  'meta.homeDescription': 'Notas sobre cómo construir sistemas de IA agéntica que resisten en producción, por Noel Moreno Lemus.',
  'meta.blogTitle': 'Escritos',
  'meta.tagTitle': 'Entradas con la etiqueta',
  'meta.projectsTitle': 'Proyectos',
  'meta.projectsDescription': 'Trabajo open source, software de investigación y una patente, por Noel Moreno Lemus.',
  'meta.aboutTitle': 'Sobre mí',
  'meta.aboutDescription': 'Noel Moreno Lemus: líder técnico de IA, PhD en modelación computacional.',
};

const pt: Record<UiKey, string> = {
  'site.tagline': 'Notas de laboratório sobre IA aplicada',
  'a11y.skip': 'Pular para o conteúdo',
  'nav.label': 'Principal',
  'nav.home': '~',
  'nav.writing': 'textos',
  'nav.projects': 'projetos',
  'nav.about': 'sobre',
  'lang.label': 'Idioma',
  'mode.reader': 'leitura',
  'mode.terminal': 'terminal',
  'mode.toggle': 'Alternar modo de leitura',
  'home.role': 'Líder técnico de IA · PhD em modelagem computacional',
  'home.bio': 'Projeto IA corporativa: agentes, ferramentas, avaliação e a engenharia pouco glamorosa que os torna confiáveis. Antes disso, computação científica: bioinformática em Havana, um doutorado em quantificação de incerteza no Brasil e uma patente de detecção de falhas sísmicas.',
  'home.now': 'agora',
  'home.nowText': 'um agente open source para trabalho com dados em um kernel Jupyter ativo',
  'home.allPosts': 'todas as entradas',
  'list.entries': 'entradas',
  'list.empty': 'nada por aqui ainda',
  'post.minutes': 'm',
  'post.readTime': 'min de leitura',
  'post.toc': 'conteúdo',
  'meta.homeTitle': 'Noel Moreno Lemus — Notas de laboratório sobre IA aplicada',
  'meta.homeDescription': 'Notas sobre como construir sistemas de IA agêntica que se sustentam em produção, por Noel Moreno Lemus.',
  'meta.blogTitle': 'Textos',
  'meta.tagTitle': 'Entradas com a tag',
  'meta.projectsTitle': 'Projetos',
  'meta.projectsDescription': 'Trabalho open source, software de pesquisa e uma patente, por Noel Moreno Lemus.',
  'meta.aboutTitle': 'Sobre',
  'meta.aboutDescription': 'Noel Moreno Lemus: líder técnico de IA, PhD em modelagem computacional.',
};

export const ui: Record<Lang, Record<UiKey, string>> = { en, es, pt };

export function t(lang: Lang, key: UiKey): string {
  return ui[lang][key];
}
```

`src/lib/validate-posts.ts`:
```ts
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
```

`src/lib/format.ts`:
```ts
import { HTML_LANG, type Lang } from '../i18n/langs.ts';

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function longDate(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(HTML_LANG[lang], { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(date);
}
```

`src/lib/reading-time.ts`:
```ts
const WORDS_PER_MINUTE = 230;

export function readingMinutes(markdown: string): number {
  const prose = markdown.replace(/```[\s\S]*?```/g, ' ');
  const words = prose.split(/\s+/).filter((w) => /\w/.test(w)).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
```

`src/content.config.ts`:
```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).min(1),
    draft: z.boolean().optional(),
  }),
});

export const collections = { blog };
```

`src/lib/posts.ts`:
```ts
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
```

- [ ] **Step 4: Run** — `npm test` and `TZ=America/Panama npm test` and `TZ=Pacific/Kiritimati npm test` → all PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: i18n helpers and validated content model"`

---

### Task 3: Fonts, tokens, layout shell

**Files:** Create `public/fonts/*`, `src/assets/og-fonts/*`, `public/favicon.svg`, `src/styles/global.css`, `src/layouts/{types.ts,BaseLayout.astro}`, `src/components/{TabBar,Prompt}.astro`, `src/scripts/mode.ts`, `src/lib/jsonld.ts`.

**Interfaces — Produces:** `<BaseLayout lang path title description section ogImage? type? jsonLd? noindex?>`; `<Prompt dir status? >` with named slot `cmd` + default slot; `type Section = 'home'|'writing'|'projects'|'about'|'none'`; `person(site: URL)`, `blogPosting({...})`.

- [ ] **Step 1: Subset and self-host fonts**

```bash
mkdir -p public/fonts src/assets/og-fonts
U="U+0020-007E,U+00A0-017F,U+2010-2027,U+2030-203A,U+2070-209F,U+2190-21FF,U+2248,U+2260,U+2264-2265,U+2500-257F,U+25A0-25FF,U+2714,U+2718,U+276F,U+E0A0-E0A2,U+E0B0-E0B3,U+F179"
for w in Regular Bold Italic; do
  uvx --from fonttools --with brotli pyftsubset "$HOME/Library/Fonts/MesloLGS NF $w.ttf" --unicodes="$U" --layout-features='*' --flavor=woff2 --output-file="public/fonts/meslo-$(echo $w | tr A-Z a-z).woff2"
done
for w in Regular Bold; do
  uvx --from fonttools pyftsubset "$HOME/Library/Fonts/MesloLGS NF $w.ttf" --unicodes="$U" --output-file="src/assets/og-fonts/meslo-$(echo $w | tr A-Z a-z).ttf"
done
T=$(mktemp -d)
curl -s -A 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' \
  'https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,400..600;1,7..72,400..600&display=swap' > "$T/l.css"
python3 - "$T/l.css" <<'EOF'
import re, sys, urllib.request
css = open(sys.argv[1]).read()
for style in ('normal', 'italic'):
    block = re.search(r'/\* latin \*/\s*@font-face \{[^}]*font-style: ' + style + r';[^}]*\}', css).group(0)
    url = re.search(r'url\((https://[^)]+\.woff2)\)', block).group(1)
    urllib.request.urlretrieve(url, f'public/fonts/literata-{style}.woff2')
    print(style, url)
EOF
curl -sfo public/fonts/LICENSE-literata.txt https://raw.githubusercontent.com/google/fonts/main/ofl/literata/OFL.txt
curl -sfo public/fonts/LICENSE-meslo.txt https://raw.githubusercontent.com/andreberg/Meslo-Font/master/LICENSE.txt
curl -sfo public/fonts/LICENSE-nerd-fonts.txt https://raw.githubusercontent.com/ryanoasis/nerd-fonts/master/LICENSE
ls -la public/fonts src/assets/og-fonts
```
Expected: 5 woff2 (each < 120 KB), 2 ttf, 3 non-empty licenses. If any `curl -f` fails, stop and find the license's current URL (don't ship without it).

- [ ] **Step 2: `public/favicon.svg`**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#002b36"/><path d="M11 9l8 7-8 7" fill="none" stroke="#5fd700" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
```

- [ ] **Step 3: `src/styles/global.css`**
```css
@font-face { font-family: 'Meslo'; src: url('/fonts/meslo-regular.woff2') format('woff2'); font-weight: 400; font-style: normal; font-display: swap; }
@font-face { font-family: 'Meslo'; src: url('/fonts/meslo-bold.woff2') format('woff2'); font-weight: 700; font-style: normal; font-display: swap; }
@font-face { font-family: 'Meslo'; src: url('/fonts/meslo-italic.woff2') format('woff2'); font-weight: 400; font-style: italic; font-display: swap; }
@font-face { font-family: 'Literata'; src: url('/fonts/literata-normal.woff2') format('woff2'); font-weight: 400 600; font-style: normal; font-display: swap; }
@font-face { font-family: 'Literata'; src: url('/fonts/literata-italic.woff2') format('woff2'); font-weight: 400 600; font-style: italic; font-display: swap; }

:root {
  --mono: 'Meslo', Menlo, Consolas, monospace;
  --serif: 'Literata', Georgia, serif;
  /* powerlevel10k segments (same in every mode) */
  --p10k-os: #303030; --p10k-dir: #5f5fd7; --p10k-ok: #00af5f; --p10k-err: #af5f5f;
  --p10k-time: #444444; --p10k-frame: #6c6c6c; --p10k-char: #5fd700;
  /* Solarized Dark, accents nudged to ≥4.5:1 */
  --bg: #002b36; --bg-2: #073642; --bg-tab: #01222b; --line: #0b3d4a;
  --muted: #839496; --text: #93a1a1; --prose: #a9b7b7; --strong: #eee8d5;
  --heading: #e2763f; --link: #3d97e0; --accent: #2aa198; --quote: #8a8fdc;
  --key: #b58900; --fn: #e866a4; --ok: #859900; --err: #f26b62;
  color-scheme: dark;
}
@media (prefers-color-scheme: light) {
  :root:not([data-mode='reader']) {
    --bg: #fdf6e3; --bg-2: #eee8d5; --bg-tab: #f3ecd7; --line: #e4dcc3;
    --muted: #586e75; --text: #3f555c; --prose: #2e4349; --strong: #073642;
    --heading: #b3420f; --link: #1f6fae; --accent: #1d7d76; --quote: #565ab8;
    --key: #8a6a00; --fn: #b52a6d; --ok: #617300; --err: #c02a27;
    color-scheme: light;
  }
}
:root[data-mode='reader'] {
  --bg: #f6eedb; --bg-2: #efe4cc; --bg-tab: #f6eedb; --line: #e3d6b8;
  --muted: #75664f; --text: #3d3225; --prose: #3d3225; --strong: #2b2219;
  --heading: #2b2219; --link: #8a4b1f; --accent: #8a4b1f; --quote: #5e4f3b;
  --key: #75664f; --fn: #8a4b1f; --ok: #3f6b2a; --err: #9c2f1f;
  color-scheme: light;
}

*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--text); font: 400 14.5px/1.6 var(--mono); overflow-x: hidden; }
a { color: var(--link); text-decoration: none; }
a:hover { text-decoration: underline; }
:focus-visible { outline: 2px solid var(--p10k-dir); outline-offset: 2px; }
.skip { position: absolute; left: -9999px; }
.skip:focus { left: 8px; top: 8px; background: var(--strong); color: var(--bg); padding: 4px 8px; z-index: 10; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.term { max-width: 92ch; padding: 22px 26px 48px; }
@media (max-width: 600px) { .term { padding: 16px 16px 40px; } }
h1, h2, h3 { margin: 0; }
p { margin: 0; }
.arg { color: var(--accent); }
.cursor { display: inline-block; width: .6em; height: 1.15em; background: var(--muted); vertical-align: text-bottom; animation: blink 1.1s steps(1) infinite; }
@keyframes blink { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .cursor { animation: none; } }
.total { color: var(--muted); margin-top: 10px; }

/* ---------- rendered markdown ---------- */
.md { margin-top: 18px; }
.md > h1 { font: 700 22px/1.35 var(--mono); color: var(--heading); margin-bottom: 6px; }
.md .hash { color: var(--muted); font-weight: 400; }
.md .lede { font: italic 400 19px/1.5 var(--serif); color: var(--text); margin-bottom: 18px; }
.md .byline { display: none; }
.md h2 { font: 700 17px/1.4 var(--mono); color: var(--heading); margin: 30px 0 10px; }
.md h2::before { content: '## '; color: var(--muted); font-weight: 400; }
.md h3 { font: 700 15px/1.4 var(--mono); color: var(--strong); margin: 24px 0 8px; }
.md h3::before { content: '### '; color: var(--muted); font-weight: 400; }
.md p, .md li { font: 400 17.5px/1.72 var(--serif); color: var(--prose); }
.md p { margin: 0 0 16px; max-width: 70ch; }
.md ul, .md ol { margin: 0 0 16px; padding-left: 1.4em; max-width: 68ch; }
.md li { margin-bottom: 6px; }
.md strong { color: var(--strong); font-weight: 600; }
.md blockquote { margin: 4px 0 18px; padding: 0; max-width: 66ch; }
.md blockquote p { font: italic 400 20px/1.45 var(--serif); color: var(--quote); }
.md blockquote p:first-child::before { content: '> '; font: normal 14.5px var(--mono); color: var(--muted); }
.md code { font: 0.86em var(--mono); color: var(--accent); }
.md pre { font: 14px/1.6 var(--mono); padding: 12px 16px; margin: 0 0 18px; overflow-x: auto; border-left: 2px solid var(--accent); max-width: 100%; }
.md pre code { color: inherit; font-size: inherit; }
.md table { border-collapse: collapse; font: 13.5px var(--mono); margin: 4px 0 18px; display: block; overflow-x: auto; max-width: 100%; }
.md th, .md td { border: 1px solid var(--muted); padding: 5px 12px; text-align: left; }
.md th { color: var(--key); font-weight: 400; }
.md img { max-width: 100%; height: auto; }
.md hr { border: 0; border-top: 1px dashed var(--line); margin: 28px 0; }
.md sup a, .md .footnotes a { color: var(--fn); }
.md .footnotes { border-top: 1px dashed var(--line); margin-top: 28px; padding-top: 10px; }
.md .footnotes li, .md .footnotes p { font: 13.5px/1.6 var(--mono); color: var(--muted); }

/* Shiki dual theme: light colors inline, dark via CSS vars */
.astro-code { border-radius: 0; }
@media (prefers-color-scheme: dark) {
  :root:not([data-mode='reader']) .astro-code,
  :root:not([data-mode='reader']) .astro-code span { color: var(--shiki-dark) !important; background-color: var(--shiki-dark-bg) !important; }
}

/* ---------- reader mode ---------- */
:root[data-mode='reader'] body { font-family: var(--serif); }
:root[data-mode='reader'] .term { max-width: 36em; margin: 0 auto; padding: 48px 24px 64px; }
:root[data-mode='reader'] .reader-hide { display: none !important; }
:root[data-mode='reader'] .md > h1 { font: 600 34px/1.2 var(--serif); text-align: center; margin-bottom: 10px; }
:root[data-mode='reader'] .md .hash { display: none; }
:root[data-mode='reader'] .md .lede { text-align: center; margin-bottom: 14px; }
:root[data-mode='reader'] .md .byline { display: block; font: 14px/1.5 var(--serif); color: var(--muted); text-align: center; margin-bottom: 30px; }
:root[data-mode='reader'] .md h2 { font: 600 24px/1.3 var(--serif); }
:root[data-mode='reader'] .md h3 { font: 600 20px/1.3 var(--serif); }
:root[data-mode='reader'] .md h2::before, :root[data-mode='reader'] .md h3::before { content: none; }
:root[data-mode='reader'] .md p { font-size: 19.5px; line-height: 1.75; text-align: justify; hyphens: auto; max-width: none; }
:root[data-mode='reader'] .md p + p { text-indent: 1.4em; }
:root[data-mode='reader'] .md li { font-size: 19px; }
:root[data-mode='reader'] .md blockquote { text-align: center; margin: 18px 1em 26px; }
:root[data-mode='reader'] .md blockquote p { font-size: 22px; text-align: center; }
:root[data-mode='reader'] .md blockquote p:first-child::before { content: none; }
:root[data-mode='reader'] .md table { font-family: var(--serif); font-size: 15.5px; margin: 8px auto 18px; border-top: 1.5px solid var(--text); border-bottom: 1.5px solid var(--text); width: fit-content; }
:root[data-mode='reader'] .md th, :root[data-mode='reader'] .md td { border: 0; }
:root[data-mode='reader'] .md th { border-bottom: 1px solid var(--line); font-style: italic; color: var(--text); }
:root[data-mode='reader'] .md pre { border-left: 0; background: var(--bg-2) !important; border-radius: 4px; }
:root[data-mode='reader'] .md .footnotes li, :root[data-mode='reader'] .md .footnotes p { font-family: var(--serif); font-size: 14.5px; }
```

- [ ] **Step 4: Layout pieces**

`src/layouts/types.ts`:
```ts
export type Section = 'home' | 'writing' | 'projects' | 'about' | 'none';
```

`src/scripts/mode.ts`:
```ts
/** Reader-mode toggle. The initial mode is applied by an inline script in <head> to avoid a flash. */
export function initModeToggle(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-mode-toggle]');
  const label = button?.querySelector('[data-label]');
  if (!button || !label) return;
  const root = document.documentElement;
  const sync = () => {
    const reader = root.dataset.mode === 'reader';
    button.setAttribute('aria-pressed', String(reader));
    label.textContent = (reader ? button.dataset.terminal : button.dataset.reader) ?? '';
  };
  button.addEventListener('click', () => {
    if (root.dataset.mode === 'reader') delete root.dataset.mode;
    else root.dataset.mode = 'reader';
    try {
      localStorage.setItem('mode', root.dataset.mode ?? 'terminal');
    } catch {
      // Storage blocked (private mode): the choice lasts for this page only.
    }
    sync();
  });
  sync();
}
```

`src/lib/jsonld.ts`:
```ts
const AUTHOR = 'Noel Moreno Lemus';
const SAME_AS = ['https://www.linkedin.com/in/nmlemus', 'https://github.com/nmlemus', 'http://lattes.cnpq.br/0845486662407480'];

export function person(site: URL) {
  return { '@context': 'https://schema.org', '@type': 'Person', name: AUTHOR, url: site.href, jobTitle: 'AI Technical Leader', sameAs: SAME_AS };
}

export function blogPosting(a: { site: URL; url: string; title: string; description: string; date: Date; updated?: Date; lang: string; image: string }) {
  return {
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: a.title, description: a.description, inLanguage: a.lang, url: a.url, image: a.image,
    datePublished: a.date.toISOString(), dateModified: (a.updated ?? a.date).toISOString(),
    author: { '@type': 'Person', name: AUTHOR, url: a.site.href },
  };
}
```

`src/components/Prompt.astro`:
```astro
---
interface Props {
  dir: string;
  status?: 'ok' | 'error';
}
const { dir, status = 'ok' } = Astro.props;
const time = new Date().toISOString().slice(11, 19);
const statusColor = status === 'ok' ? 'var(--p10k-ok)' : 'var(--p10k-err)';
---
<section class="prompt">
  <div class="l1" aria-hidden="true">
    <span class="frame">╭─</span><span class="seg os">&#xF179;</span><span class="sep" style="color:var(--p10k-os);background:var(--p10k-dir)">&#xE0B0;</span><span class="seg dir">{dir}</span><span class="sep" style="color:var(--p10k-dir);background:var(--p10k-ok)">&#xE0B0;</span><span class="seg vcs">&#xE0A0; main</span><span class="sep" style="color:var(--p10k-ok)">&#xE0B0;</span><span class="gap"></span><span class="right"><span class="sep" style={`color:${statusColor}`}>&#xE0B2;</span><span class="seg" style={`background:${statusColor};color:${status === 'ok' ? '#000' : '#fff'}`}>{status === 'ok' ? '✔' : '✘ 1'}</span><span class="sep" style={`color:var(--p10k-time);background:${statusColor}`}>&#xE0B2;</span><span class="seg time">{time}</span><span class="frame">─╮</span></span>
  </div>
  <div class="l2"><span class="frame" aria-hidden="true">╰─</span><span class="char" aria-hidden="true">❯</span><span class="cmd"><slot name="cmd" /></span></div>
  <div class="out"><slot /></div>
</section>
<style>
  .prompt { margin-top: 26px; }
  .prompt:first-child { margin-top: 0; }
  .l1 { display: flex; align-items: center; white-space: nowrap; line-height: 1.55; }
  .frame { color: var(--p10k-frame); }
  .seg { padding: 0 8px; }
  .os { background: var(--p10k-os); color: #fff; }
  .dir { background: var(--p10k-dir); color: #fff; font-weight: 700; }
  .vcs { background: var(--p10k-ok); color: #000; }
  .time { background: var(--p10k-time); color: #eee; }
  .gap { flex: 1; min-width: 12px; margin: 0 6px; border-bottom: 2px dotted var(--p10k-frame); height: .55em; }
  .right { display: flex; align-items: center; }
  .l2 { display: flex; flex-wrap: wrap; }
  .char { color: var(--p10k-char); margin: 0 8px 0 2px; }
  .cmd { color: var(--strong); overflow-wrap: anywhere; }
  .out { margin-top: 10px; }
  @media (max-width: 600px) { .right, .gap { display: none; } }
  :global(:root[data-mode='reader']) .l1, :global(:root[data-mode='reader']) .l2 { display: none; }
  :global(:root[data-mode='reader']) .prompt { margin-top: 36px; }
</style>
```

`src/components/TabBar.astro`:
```astro
---
import { LANGS, type Lang } from '../i18n/langs.ts';
import { localePath } from '../i18n/paths.ts';
import { t } from '../i18n/ui.ts';
import type { Section } from '../layouts/types.ts';

interface Props {
  lang: Lang;
  path: string;
  section: Section;
}
const { lang, path, section } = Astro.props;
const tabs: { id: Section; label: string; href: string }[] = [
  { id: 'home', label: t(lang, 'nav.home'), href: localePath(lang) },
  { id: 'writing', label: t(lang, 'nav.writing'), href: localePath(lang, 'blog/') },
  { id: 'projects', label: t(lang, 'nav.projects'), href: localePath(lang, 'projects/') },
  { id: 'about', label: t(lang, 'nav.about'), href: localePath(lang, 'about/') },
];
---
<header class="tabbar">
  <nav class="tabs" aria-label={t(lang, 'nav.label')}>
    {tabs.map((tab) => <a class="tab" href={tab.href} aria-current={tab.id === section ? 'page' : undefined}>{tab.label}</a>)}
  </nav>
  <span class="spacer"></span>
  <button class="mode" type="button" data-mode-toggle data-reader={t(lang, 'mode.reader')} data-terminal={t(lang, 'mode.terminal')} aria-label={t(lang, 'mode.toggle')} aria-pressed="false">[<span data-label>{t(lang, 'mode.reader')}</span>]</button>
  <nav class="langs" aria-label={t(lang, 'lang.label')}>
    {LANGS.map((l) => <a href={localePath(l, path)} hreflang={l} lang={l} aria-current={l === lang ? 'true' : undefined}>{l}</a>)}
  </nav>
</header>
<style>
  .tabbar { display: flex; flex-wrap: wrap; align-items: stretch; background: var(--bg-tab); border-bottom: 1px solid var(--line); font: 12.5px var(--mono); }
  .tabs { display: flex; overflow-x: auto; }
  .tab { padding: 8px 16px; color: var(--muted); border-right: 1px solid var(--line); white-space: nowrap; }
  .tab[aria-current='page'] { background: var(--bg); color: var(--strong); box-shadow: inset 0 2px 0 var(--p10k-dir); }
  .spacer { flex: 1; }
  .mode { font: inherit; background: none; border: 0; border-left: 1px solid var(--line); color: var(--muted); padding: 8px 14px; cursor: pointer; }
  .mode span { color: var(--strong); }
  .langs { display: flex; gap: 8px; padding: 8px 14px; align-items: center; }
  .langs a { color: var(--muted); padding: 0 4px; }
  .langs a[aria-current='true'] { background: var(--p10k-dir); color: #fff; }
  :global(:root[data-mode='reader']) .tabbar { font: 14px var(--serif); }
  :global(:root[data-mode='reader']) .tab, :global(:root[data-mode='reader']) .mode { border: 0; }
  :global(:root[data-mode='reader']) .tab[aria-current='page'] { background: none; box-shadow: none; }
  :global(:root[data-mode='reader']) .langs a[aria-current='true'] { background: none; color: var(--strong); text-decoration: underline; }
</style>
```

`src/layouts/BaseLayout.astro`:
```astro
---
import '../styles/global.css';
import TabBar from '../components/TabBar.astro';
import { LANGS, HTML_LANG, OG_LOCALE, type Lang } from '../i18n/langs.ts';
import { localePath } from '../i18n/paths.ts';
import { t } from '../i18n/ui.ts';
import type { Section } from './types.ts';

interface Props {
  lang: Lang;
  path: string;
  title: string;
  description: string;
  section: Section;
  ogImage?: string;
  type?: 'website' | 'article';
  jsonLd?: Record<string, unknown>;
  noindex?: boolean;
}
const { lang, path, title, description, section, ogImage = `/og/${lang}/_site.png`, type = 'website', jsonLd, noindex = false } = Astro.props;
const site = Astro.site!;
const abs = (l: Lang) => new URL(localePath(l, path), site).href;
---
<!doctype html>
<html lang={HTML_LANG[lang]}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta name="author" content="Noel Moreno Lemus" />
    {noindex && <meta name="robots" content="noindex" />}
    {!noindex && <link rel="canonical" href={abs(lang)} />}
    {!noindex && LANGS.map((l) => <link rel="alternate" hreflang={HTML_LANG[l]} href={abs(l)} />)}
    {!noindex && <link rel="alternate" hreflang="x-default" href={abs('en')} />}
    <link rel="alternate" type="application/rss+xml" title={t(lang, 'meta.homeTitle')} href={localePath(lang, 'rss.xml')} />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="preload" href="/fonts/meslo-regular.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/fonts/literata-normal.woff2" as="font" type="font/woff2" crossorigin />
    <meta name="theme-color" content="#002b36" media="(prefers-color-scheme: dark)" />
    <meta name="theme-color" content="#fdf6e3" media="(prefers-color-scheme: light)" />
    <meta property="og:type" content={type} />
    <meta property="og:site_name" content="Noel Moreno Lemus" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={abs(lang)} />
    <meta property="og:locale" content={OG_LOCALE[lang]} />
    <meta property="og:image" content={new URL(ogImage, site).href} />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    {jsonLd && <script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />}
    <script is:inline>
      try { if (localStorage.getItem('mode') === 'reader') document.documentElement.dataset.mode = 'reader'; } catch (e) {}
    </script>
  </head>
  <body>
    <a class="skip" href="#main">{t(lang, 'a11y.skip')}</a>
    <TabBar lang={lang} path={path} section={section} />
    <main id="main" class="term"><slot /></main>
    <script>
      import { initModeToggle } from '../scripts/mode.ts';
      initModeToggle();
    </script>
  </body>
</html>
```

- [ ] **Step 5: Smoke page** — replace `src/pages/index.astro` with a BaseLayout + two Prompts (`whoami` with the name) to see the shell; `npm run build` → exit 0; `npm run dev` and eyeball: powerline arrows render, `[reader]` toggles sepia and survives reload.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: terminal design system, fonts and base layout"`

---

### Task 4: Home, writing index, tag pages

**Files:** Create `src/components/PostList.astro`, `src/pages/[...lang]/index.astro`, `src/pages/[...lang]/blog/index.astro`, `src/pages/[...lang]/blog/tags/[tag].astro`. Delete `src/pages/index.astro`.

**Interfaces — Consumes:** `getPosts`, `getTags`, `langParams`, `localePath`, `t`, `isoDate`, `readingMinutes`, `BaseLayout`, `Prompt`, `person`.

- [ ] **Step 1: Seed a throwaway fixture** so pages have data: `src/content/blog/fixture/{en,es,pt}.md` with frontmatter `title: Fixture`, `description: Fixture post`, `date: 2026-01-01`, `tags: [test]`, body with an `## h2`, a table, a fenced `python` block, a footnote `[^1]`. (Removed in Task 7.)

- [ ] **Step 2: `src/components/PostList.astro`**
```astro
---
import type { Lang } from '../i18n/langs.ts';
import { localePath } from '../i18n/paths.ts';
import { t } from '../i18n/ui.ts';
import { isoDate } from '../lib/format.ts';
import { readingMinutes } from '../lib/reading-time.ts';
import type { LocalizedPost } from '../lib/posts.ts';

interface Props {
  lang: Lang;
  posts: LocalizedPost[];
}
const { lang, posts } = Astro.props;
---
{posts.length === 0 && <p class="empty"># {t(lang, 'list.empty')}</p>}
{posts.length > 0 && (
  <ol class="ls">
    {posts.map(({ slug, entry }) => (
      <li class="row">
        <span class="d">{isoDate(entry.data.date)}</span>
        <span class="m">{readingMinutes(entry.body ?? '')}{t(lang, 'post.minutes')}</span>
        <span class="f" aria-hidden="true">{slug}.md</span>
        <h2 class="title"><a href={localePath(lang, `blog/${slug}/`)}>{entry.data.title}</a></h2>
        <p class="desc">{entry.data.description}</p>
        <p class="tags">{entry.data.tags.map((tag) => <a href={localePath(lang, `blog/tags/${tag}/`)}>#{tag}</a>)}</p>
      </li>
    ))}
  </ol>
)}
<style>
  .ls { list-style: none; margin: 10px 0 0; padding: 0; }
  .row { display: grid; grid-template-columns: 11ch 4ch minmax(0, 1fr); column-gap: 2ch; padding: 10px 0; border-bottom: 1px dashed var(--line); }
  .row:last-child { border-bottom: 0; }
  .d, .m { color: var(--muted); }
  .f { color: var(--link); font-weight: 700; overflow-wrap: anywhere; }
  .title, .desc, .tags { grid-column: 3; }
  .title { font: 400 14.5px/1.5 var(--mono); margin-top: 2px; }
  .title a { color: var(--strong); }
  .desc { font: 400 15.5px/1.5 var(--serif); color: var(--prose); }
  .tags { font-size: 13px; margin-top: 3px; display: flex; gap: 1ch; flex-wrap: wrap; }
  .tags a { color: var(--quote); }
  .empty { color: var(--muted); }
  @media (max-width: 600px) {
    .row { grid-template-columns: 11ch minmax(0, 1fr); }
    .m { display: none; }
    .f, .title, .desc, .tags { grid-column: 1 / -1; }
  }
  :global(:root[data-mode='reader']) .row { display: block; padding: 18px 0; }
  :global(:root[data-mode='reader']) .m, :global(:root[data-mode='reader']) .f { display: none; }
  :global(:root[data-mode='reader']) .title { font: 600 21px/1.3 var(--serif); }
  :global(:root[data-mode='reader']) .desc { font-size: 17px; }
</style>
```

- [ ] **Step 3: `src/pages/[...lang]/index.astro`**
```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Prompt from '../../components/Prompt.astro';
import PostList from '../../components/PostList.astro';
import { langParams, localePath } from '../../i18n/paths.ts';
import { t } from '../../i18n/ui.ts';
import type { Lang } from '../../i18n/langs.ts';
import { getPosts } from '../../lib/posts.ts';
import { person } from '../../lib/jsonld.ts';

export function getStaticPaths() {
  return langParams();
}
const { lang } = Astro.props as { lang: Lang };
const posts = (await getPosts(lang)).slice(0, 5);
---
<BaseLayout lang={lang} path="" section="home" title={t(lang, 'meta.homeTitle')} description={t(lang, 'meta.homeDescription')} jsonLd={person(Astro.site!)}>
  <Prompt dir="~">
    <Fragment slot="cmd">whoami</Fragment>
    <h1 class="name">Noel Moreno Lemus</h1>
    <p class="role">{t(lang, 'home.role')}</p>
    <p class="bio">{t(lang, 'home.bio')}</p>
    <p class="now"># {t(lang, 'home.now')}: <a href="https://github.com/nmlemus/dsagent">dsagent</a>, {t(lang, 'home.nowText')}</p>
  </Prompt>
  <Prompt dir="~">
    <Fragment slot="cmd">ls -t <span class="arg">writing/</span></Fragment>
    <PostList lang={lang} posts={posts} />
    <p class="total"><a href={localePath(lang, 'blog/')}>{t(lang, 'home.allPosts')}</a> · <a href={localePath(lang, 'rss.xml')}>rss.xml</a></p>
  </Prompt>
  <div class="reader-hide">
    <Prompt dir="~"><Fragment slot="cmd"><span class="cursor"></span></Fragment></Prompt>
  </div>
</BaseLayout>
<style>
  .name { font: 700 17px/1.4 var(--mono); color: var(--strong); }
  .role { color: var(--accent); }
  .bio { font: 400 16.5px/1.6 var(--serif); color: var(--prose); margin-top: 8px; max-width: 70ch; }
  .now { color: var(--muted); margin-top: 8px; }
  :global(:root[data-mode='reader']) .name { font: 600 30px/1.2 var(--serif); }
</style>
```

- [ ] **Step 4: `src/pages/[...lang]/blog/index.astro`**
```astro
---
import BaseLayout from '../../../layouts/BaseLayout.astro';
import Prompt from '../../../components/Prompt.astro';
import PostList from '../../../components/PostList.astro';
import { langParams, localePath } from '../../../i18n/paths.ts';
import { t } from '../../../i18n/ui.ts';
import type { Lang } from '../../../i18n/langs.ts';
import { getPosts } from '../../../lib/posts.ts';

export function getStaticPaths() {
  return langParams();
}
const { lang } = Astro.props as { lang: Lang };
const posts = await getPosts(lang);
---
<BaseLayout lang={lang} path="blog/" section="writing" title={`${t(lang, 'meta.blogTitle')} — Noel Moreno Lemus`} description={t(lang, 'meta.homeDescription')}>
  <h1 class="sr-only">{t(lang, 'meta.blogTitle')}</h1>
  <Prompt dir="~">
    <Fragment slot="cmd">ls -t <span class="arg">writing/</span></Fragment>
    <PostList lang={lang} posts={posts} />
    <p class="total">{posts.length} {t(lang, 'list.entries')} · <a href={localePath(lang, 'rss.xml')}>rss.xml</a></p>
  </Prompt>
</BaseLayout>
```

- [ ] **Step 5: `src/pages/[...lang]/blog/tags/[tag].astro`**
```astro
---
import BaseLayout from '../../../../layouts/BaseLayout.astro';
import Prompt from '../../../../components/Prompt.astro';
import PostList from '../../../../components/PostList.astro';
import { langParams } from '../../../../i18n/paths.ts';
import { t } from '../../../../i18n/ui.ts';
import type { Lang } from '../../../../i18n/langs.ts';
import { getPosts, getTags } from '../../../../lib/posts.ts';

export async function getStaticPaths() {
  const tags = await getTags();
  return langParams().flatMap(({ params, props }) =>
    tags.map((tag) => ({ params: { ...params, tag }, props: { ...props, tag } })),
  );
}
const { lang, tag } = Astro.props as { lang: Lang; tag: string };
const posts = (await getPosts(lang)).filter((p) => p.entry.data.tags.includes(tag));
---
<BaseLayout lang={lang} path={`blog/tags/${tag}/`} section="writing" title={`${t(lang, 'meta.tagTitle')} #${tag} — Noel Moreno Lemus`} description={`${t(lang, 'meta.tagTitle')} #${tag}`}>
  <h1 class="sr-only">{t(lang, 'meta.tagTitle')} #{tag}</h1>
  <Prompt dir="~">
    <Fragment slot="cmd">ls <span class="arg">writing/</span> | grep <span class="arg">#{tag}</span></Fragment>
    <PostList lang={lang} posts={posts} />
  </Prompt>
</BaseLayout>
```

- [ ] **Step 6: Verify** — `rm src/pages/index.astro && npm run build` → exit 0; `ls dist/index.html dist/es/index.html dist/pt/blog/index.html dist/blog/tags/test/index.html` all exist.
- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat: home, writing index and tag pages"`

---

### Task 5: Article page

**Files:** Create `src/components/Frontmatter.astro`, `src/pages/[...lang]/blog/[slug].astro`.

**Interfaces — Consumes:** `getPostGroups`, `render` from `astro:content`, `longDate`, `isoDate`, `readingMinutes`, `blogPosting`.

- [ ] **Step 1: Verify share endpoints respond** — `curl -sI 'https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fnmlemus.github.io%2F' | head -1` and `curl -sI 'https://x.com/intent/post?url=https%3A%2F%2Fnmlemus.github.io%2F' | head -1` → 200/30x. If X returns 404, use `https://x.com/intent/tweet`.

- [ ] **Step 2: `src/components/Frontmatter.astro`**
```astro
---
import { LANGS, type Lang } from '../i18n/langs.ts';
import { localePath } from '../i18n/paths.ts';
import { isoDate } from '../lib/format.ts';

interface Props {
  lang: Lang;
  slug: string;
  title: string;
  date: Date;
  minutes: number;
  tags: string[];
}
const { lang, slug, title, date, minutes, tags } = Astro.props;
const others = LANGS.filter((l) => l !== lang);
---
<div class="fm reader-hide">
  <span aria-hidden="true">---</span>
  <div><span class="k">title:</span> {title}</div>
  <div><span class="k">date:</span> <time datetime={isoDate(date)}>{isoDate(date)}</time> <span class="k">read:</span> {minutes} min</div>
  <div><span class="k">tags:</span> [{tags.map((tag, i) => <>{i > 0 && ', '}<a href={localePath(lang, `blog/tags/${tag}/`)}>{tag}</a></>)}]</div>
  <div><span class="k">also_in:</span> [{others.map((l, i) => <>{i > 0 && ', '}<a href={localePath(l, `blog/${slug}/`)} hreflang={l} lang={l}>{l}</a></>)}]</div>
  <span aria-hidden="true">---</span>
</div>
<style>
  .fm { display: flex; flex-direction: column; color: var(--muted); }
  .k { color: var(--key); }
  .fm div { color: var(--text); overflow-wrap: anywhere; }
</style>
```

- [ ] **Step 3: `src/pages/[...lang]/blog/[slug].astro`**
```astro
---
import { render } from 'astro:content';
import BaseLayout from '../../../layouts/BaseLayout.astro';
import Prompt from '../../../components/Prompt.astro';
import Frontmatter from '../../../components/Frontmatter.astro';
import { langParams, localePath } from '../../../i18n/paths.ts';
import { HTML_LANG, type Lang } from '../../../i18n/langs.ts';
import { t } from '../../../i18n/ui.ts';
import { getPostGroups, type BlogEntry } from '../../../lib/posts.ts';
import { longDate } from '../../../lib/format.ts';
import { readingMinutes } from '../../../lib/reading-time.ts';
import { blogPosting } from '../../../lib/jsonld.ts';

export async function getStaticPaths() {
  const groups = await getPostGroups();
  return langParams().flatMap(({ params, props }) =>
    groups.map((g) => ({ params: { ...params, slug: g.slug }, props: { lang: props.lang, slug: g.slug, entry: g.byLang[props.lang] } })),
  );
}
const { lang, slug, entry } = Astro.props as { lang: Lang; slug: string; entry: BlogEntry };
const { Content, headings } = await render(entry);
const { title, description, date, updated, tags } = entry.data;
const minutes = readingMinutes(entry.body ?? '');
const toc = headings.filter((h) => h.depth === 2);
const path = `blog/${slug}/`;
const url = new URL(localePath(lang, path), Astro.site).href;
const ogImage = `/og/${lang}/${slug}.png`;
const share = {
  linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  x: `https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
};
---
<BaseLayout lang={lang} path={path} section="writing" type="article" title={`${title} — Noel Moreno Lemus`} description={description} ogImage={ogImage}
  jsonLd={blogPosting({ site: Astro.site!, url, title, description, date, updated, lang: HTML_LANG[lang], image: new URL(ogImage, Astro.site).href })}>
  <Prompt dir="~/writing">
    <Fragment slot="cmd">cat <span class="arg">{slug}.md</span></Fragment>
    <Frontmatter lang={lang} slug={slug} title={title} date={date} minutes={minutes} tags={tags} />
    <article class="md">
      <h1><span class="hash" aria-hidden="true"># </span>{title}</h1>
      <p class="lede">{description}</p>
      <p class="byline">Noel Moreno Lemus · <time datetime={date.toISOString()}>{longDate(date, lang)}</time> · {minutes} {t(lang, 'post.readTime')}</p>
      {toc.length >= 3 && (
        <nav class="toc reader-hide" aria-label={t(lang, 'post.toc')}>
          <span class="cmdline" aria-hidden="true">$ grep '^## ' {slug}.md</span>
          {toc.map((h) => <a href={`#${h.slug}`}>## {h.text}</a>)}
        </nav>
      )}
      <Content />
    </article>
  </Prompt>
  <Prompt dir="~/writing">
    <Fragment slot="cmd">share <a href={share.linkedin} rel="noopener" target="_blank">--linkedin</a> <a href={share.x} rel="noopener" target="_blank">--x</a> <button type="button" class="copy" data-copy={url}>--copy-link</button></Fragment>
  </Prompt>
</BaseLayout>
<script>
  document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy ?? location.href);
        button.textContent = '✔ copied';
      } catch {
        button.textContent = button.dataset.copy ?? '';
      }
    });
  });
</script>
<style>
  .toc { display: flex; flex-direction: column; margin: 0 0 22px; font-size: 13.5px; }
  .cmdline { color: var(--muted); }
  .copy { font: inherit; background: none; border: 0; padding: 0; color: var(--link); cursor: pointer; }
  :global(:root[data-mode='reader']) .copy { font-family: var(--serif); }
</style>
```
In reader mode the share prompt's `l2` is hidden by `Prompt`; add to `Prompt.astro`'s style: `:global(:root[data-mode='reader']) .l2:has(:global(.copy)) { display: flex; justify-content: center; }` (`.copy` must be `:global` — it lives in the page's style scope, not Prompt's) so sharing stays available.

- [ ] **Step 4: Verify** — `npm run build`; open `npm run dev` → `/blog/fixture/`, `/es/blog/fixture/`: YAML block, `also_in` links jump to the same post in the other language, code block has Solarized colors, footnote renders, table scrolls inside itself. Toggle reader: centered sepia layout, prompts hidden, share still visible.
- [ ] **Step 5: Mobile check (Review Focus 5)** — in the browser at 360px width, on the fixture article: `document.documentElement.scrollWidth <= innerWidth` is `true` in both modes.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: article page with frontmatter, toc and sharing"`

---

### Task 6: About, Projects, 404

**Files:** Create `src/data/profile.ts`, `src/data/projects.ts`, `src/pages/[...lang]/about.astro`, `src/pages/[...lang]/projects.astro`, `src/pages/404.astro`.

- [ ] **Step 1: Complete the facts from LinkedIn** — in Chrome open `linkedin.com/in/nmlemus/details/projects/` and `/details/education/`. Record the 3 projects not listed below and the 3rd education entry into the session scratchpad. Only add what the page states.

- [ ] **Step 2: `src/data/profile.ts`** (all facts from the 2026-09-24 LinkedIn snapshot)
```ts
import type { Lang } from '../i18n/langs.ts';

export type Localized = Record<Lang, string>;
export interface LogItem {
  when: string;
  what: Localized;
}

export const bio: Record<Lang, string[]> = {
  en: [
    'I lead AI/ML programs for media analytics across Latin America at Procter & Gamble, where I designed an enterprise agentic AI system built around agents, reusable skills and workflows. Programs I have led have generated over US$40M in incremental business value.',
    'My background is scientific computing. In Havana I led the university’s bioinformatics R&D group and the BioSyS simulation platform. In Brazil I did a PhD in computational modeling at LNCC, worked on AI-based seismic fault detection at Dell EMC (it became a patent), and a postdoc on epidemic modeling at UFF.',
    'This site is where I write down what I learn building AI systems that have to work in production.',
  ],
  es: [
    'Lidero programas de IA/ML para analítica de medios en Latinoamérica en Procter & Gamble, donde diseñé un sistema empresarial de IA agéntica basado en agentes, skills reutilizables y workflows. Los programas que he liderado han generado más de US$40M en valor de negocio incremental.',
    'Vengo de la computación científica. En La Habana dirigí el grupo de I+D en bioinformática de la universidad y la plataforma de simulación BioSyS. En Brasil hice un doctorado en modelación computacional en el LNCC, trabajé en detección de fallas sísmicas con IA en Dell EMC (terminó en una patente) y un posdoctorado en modelación de epidemias en la UFF.',
    'Este sitio es donde escribo lo que aprendo construyendo sistemas de IA que tienen que funcionar en producción.',
  ],
  pt: [
    'Lidero programas de IA/ML para análise de mídia na América Latina na Procter & Gamble, onde projetei um sistema corporativo de IA agêntica baseado em agentes, skills reutilizáveis e workflows. Os programas que liderei geraram mais de US$40M em valor de negócio incremental.',
    'Minha formação é computação científica. Em Havana, liderei o grupo de P&D em bioinformática da universidade e a plataforma de simulação BioSyS. No Brasil, fiz doutorado em modelagem computacional no LNCC, trabalhei com detecção de falhas sísmicas com IA na Dell EMC (virou uma patente) e um pós-doutorado em modelagem de epidemias na UFF.',
    'Este site é onde escrevo o que aprendo construindo sistemas de IA que precisam funcionar em produção.',
  ],
};

export const history: LogItem[] = [
  { when: '2022-05', what: { en: 'Senior Data Scientist @ Procter & Gamble, Panama', es: 'Senior Data Scientist @ Procter & Gamble, Panamá', pt: 'Senior Data Scientist @ Procter & Gamble, Panamá' } },
  { when: '2019-09', what: { en: 'Data Scientist @ Procter & Gamble', es: 'Data Scientist @ Procter & Gamble', pt: 'Data Scientist @ Procter & Gamble' } },
  { when: '2018-08', what: { en: 'Postdoctoral Researcher @ Universidade Federal Fluminense, Rio de Janeiro', es: 'Investigador posdoctoral @ Universidade Federal Fluminense, Río de Janeiro', pt: 'Pesquisador de pós-doutorado @ Universidade Federal Fluminense, Rio de Janeiro' } },
  { when: '2014-02', what: { en: 'Scientific Researcher (AI Innovation) @ Dell EMC, Rio de Janeiro', es: 'Investigador científico (Innovación en IA) @ Dell EMC, Río de Janeiro', pt: 'Pesquisador científico (Inovação em IA) @ Dell EMC, Rio de Janeiro' } },
  { when: '2004-09', what: { en: 'Head of the Bioinformatics R&D Group @ UCI, Havana', es: 'Jefe del Grupo de I+D en Bioinformática @ UCI, La Habana', pt: 'Chefe do Grupo de P&D em Bioinformática @ UCI, Havana' } },
  { when: '2003-09', what: { en: 'Project Manager, BioSyS @ UCI', es: 'Jefe de proyecto, BioSyS @ UCI', pt: 'Gerente de projeto, BioSyS @ UCI' } },
  { when: '2002-09', what: { en: 'Assistant Professor @ UCI', es: 'Profesor asistente @ UCI', pt: 'Professor assistente @ UCI' } },
];

export const education: LogItem[] = [
  { when: '2013–2018', what: { en: 'PhD, Computational Modeling @ LNCC. Thesis: Generalized lambda distribution for uncertainty quantification of large-scale spatio-temporal models', es: 'Doctorado en Modelación Computacional @ LNCC. Tesis: Generalized lambda distribution for uncertainty quantification of large-scale spatio-temporal models', pt: 'Doutorado em Modelagem Computacional @ LNCC. Tese: Generalized lambda distribution for uncertainty quantification of large-scale spatio-temporal models' } },
  { when: '2005–2007', what: { en: 'MSc, Bioinformatics @ InsTEC', es: 'Maestría en Bioinformática @ InsTEC', pt: 'Mestrado em Bioinformática @ InsTEC' } },
];

export const links = [
  { label: 'linkedin', href: 'https://www.linkedin.com/in/nmlemus' },
  { label: 'github', href: 'https://github.com/nmlemus' },
  { label: 'lattes', href: 'http://lattes.cnpq.br/0845486662407480' },
];
```
Append the 3rd education entry from Step 1 (same shape, all three languages).

- [ ] **Step 3: `src/data/projects.ts`**
```ts
import type { Localized } from './profile.ts';

export interface Project {
  name: string;
  period: string;
  kind: Localized;
  url?: string;
  description: Localized;
}

export const projects: Project[] = [
  {
    name: 'dsagent', period: '2025-12–', url: 'https://github.com/nmlemus/dsagent',
    kind: { en: 'open source', es: 'open source', pt: 'open source' },
    description: {
      en: 'An AI agent for data analysis with dynamic planning and a persistent Jupyter kernel. Human-in-the-loop approvals, MCP tools, multi-provider LLMs, API-first.',
      es: 'Un agente de IA para análisis de datos con planificación dinámica y un kernel de Jupyter persistente. Aprobaciones human-in-the-loop, herramientas MCP, múltiples proveedores de LLM, API-first.',
      pt: 'Um agente de IA para análise de dados com planejamento dinâmico e um kernel Jupyter persistente. Aprovações human-in-the-loop, ferramentas MCP, múltiplos provedores de LLM, API-first.',
    },
  },
  {
    name: 'seismic-fault-detection', period: '2014–2015',
    kind: { en: 'patent · Dell EMC', es: 'patente · Dell EMC', pt: 'patente · Dell EMC' },
    description: {
      en: '“Methods and Apparatus for Automatic Identification of Faults on Noisy Seismic Data.” AI fault detection for oil & gas seismic interpretation: 40% fewer false positives, interpretation time from weeks to hours.',
      es: '“Methods and Apparatus for Automatic Identification of Faults on Noisy Seismic Data.” Detección de fallas con IA para interpretación sísmica en petróleo y gas: 40% menos falsos positivos, tiempo de interpretación de semanas a horas.',
      pt: '“Methods and Apparatus for Automatic Identification of Faults on Noisy Seismic Data.” Detecção de falhas com IA para interpretação sísmica em óleo e gás: 40% menos falsos positivos, tempo de interpretação de semanas para horas.',
    },
  },
  {
    name: 'hpc4e', period: '2016–',
    kind: { en: 'research', es: 'investigación', pt: 'pesquisa' },
    description: {
      en: 'Exascale HPC simulations for energy: wind energy, biomass-derived fuel combustion and exploration geophysics.',
      es: 'Simulaciones HPC a exaescala para energía: eólica, combustión de biocombustibles y geofísica de exploración.',
      pt: 'Simulações HPC em exaescala para energia: eólica, combustão de biocombustíveis e geofísica de exploração.',
    },
  },
  {
    name: 'biosys', period: '2003–2012',
    kind: { en: 'registered IP · UCI', es: 'propiedad intelectual registrada · UCI', pt: 'propriedade intelectual registrada · UCI' },
    description: {
      en: 'Distributed simulator of biological systems (large-scale ODEs), adopted by research centers of Cuba’s Scientific Pole. Simulation time from days to hours.',
      es: 'Simulador distribuido de sistemas biológicos (EDOs a gran escala), adoptado por centros de investigación del Polo Científico cubano. Tiempo de simulación de días a horas.',
      pt: 'Simulador distribuído de sistemas biológicos (EDOs em larga escala), adotado por centros de pesquisa do Polo Científico cubano. Tempo de simulação de dias para horas.',
    },
  },
  {
    name: 't-arenal', period: '2004–2010',
    kind: { en: 'registered IP · UCI', es: 'propiedad intelectual registrada · UCI', pt: 'propriedade intelectual registrada · UCI' },
    description: {
      en: 'Distributed computing platform built by the UCI bioinformatics group.',
      es: 'Plataforma de computación distribuida desarrollada por el grupo de bioinformática de la UCI.',
      pt: 'Plataforma de computação distribuída desenvolvida pelo grupo de bioinformática da UCI.',
    },
  },
];
```
Add the projects recorded in Step 1 with the same shape.

- [ ] **Step 4: `src/pages/[...lang]/about.astro`**
```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Prompt from '../../components/Prompt.astro';
import { langParams } from '../../i18n/paths.ts';
import { t } from '../../i18n/ui.ts';
import type { Lang } from '../../i18n/langs.ts';
import { bio, history, education, links } from '../../data/profile.ts';
import { person } from '../../lib/jsonld.ts';

export function getStaticPaths() {
  return langParams();
}
const { lang } = Astro.props as { lang: Lang };
---
<BaseLayout lang={lang} path="about/" section="about" title={`${t(lang, 'meta.aboutTitle')} — Noel Moreno Lemus`} description={t(lang, 'meta.aboutDescription')} jsonLd={person(Astro.site!)}>
  <Prompt dir="~">
    <Fragment slot="cmd">cat <span class="arg">about.md</span></Fragment>
    <div class="md">
      <h1><span class="hash" aria-hidden="true"># </span>Noel Moreno Lemus</h1>
      {bio[lang].map((p) => <p>{p}</p>)}
    </div>
  </Prompt>
  <Prompt dir="~">
    <Fragment slot="cmd">git log <span class="arg">--pretty='%ad %s' --date=short</span></Fragment>
    <ul class="log">{history.map((i) => <li><span class="when">{i.when}</span> {i.what[lang]}</li>)}</ul>
  </Prompt>
  <Prompt dir="~">
    <Fragment slot="cmd">ls <span class="arg">education/</span></Fragment>
    <ul class="log">{education.map((i) => <li><span class="when">{i.when}</span> {i.what[lang]}</li>)}</ul>
  </Prompt>
  <Prompt dir="~">
    <Fragment slot="cmd">cat <span class="arg">links.txt</span></Fragment>
    <ul class="log">{links.map((l) => <li><span class="when">{l.label}</span> <a href={l.href} rel="me">{l.href.replace(/^https?:\/\//, '')}</a></li>)}</ul>
  </Prompt>
</BaseLayout>
<style>
  .log { list-style: none; margin: 0; padding: 0; }
  .log li { display: grid; grid-template-columns: 11ch minmax(0, 1fr); column-gap: 2ch; padding: 3px 0; overflow-wrap: anywhere; }
  .when { color: var(--key); }
  :global(:root[data-mode='reader']) .log li { font-family: var(--serif); font-size: 17px; }
</style>
```

- [ ] **Step 5: `src/pages/[...lang]/projects.astro`**
```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Prompt from '../../components/Prompt.astro';
import { langParams } from '../../i18n/paths.ts';
import { t } from '../../i18n/ui.ts';
import type { Lang } from '../../i18n/langs.ts';
import { projects } from '../../data/projects.ts';

export function getStaticPaths() {
  return langParams();
}
const { lang } = Astro.props as { lang: Lang };
---
<BaseLayout lang={lang} path="projects/" section="projects" title={`${t(lang, 'meta.projectsTitle')} — Noel Moreno Lemus`} description={t(lang, 'meta.projectsDescription')}>
  <h1 class="sr-only">{t(lang, 'meta.projectsTitle')}</h1>
  <Prompt dir="~">
    <Fragment slot="cmd">ls -l <span class="arg">projects/</span></Fragment>
    <ul class="projects">
      {projects.map((p) => (
        <li>
          <span class="period">{p.period}</span>
          <h2 class="name">{p.url ? <a href={p.url}>{p.name}/</a> : `${p.name}/`}</h2>
          <span class="kind">{p.kind[lang]}</span>
          <p class="desc">{p.description[lang]}</p>
        </li>
      ))}
    </ul>
  </Prompt>
</BaseLayout>
<style>
  .projects { list-style: none; margin: 0; padding: 0; }
  .projects li { display: grid; grid-template-columns: 11ch minmax(0, 1fr); column-gap: 2ch; padding: 12px 0; border-bottom: 1px dashed var(--line); }
  .period { color: var(--muted); }
  .name { font: 700 14.5px/1.5 var(--mono); color: var(--link); }
  .kind, .desc { grid-column: 2; }
  .kind { color: var(--quote); font-size: 13px; }
  .desc { font: 400 15.5px/1.55 var(--serif); color: var(--prose); margin-top: 4px; }
  @media (max-width: 600px) { .projects li { grid-template-columns: 1fr; } .kind, .desc { grid-column: 1; } }
  :global(:root[data-mode='reader']) .name { font: 600 20px/1.3 var(--serif); }
</style>
```

- [ ] **Step 6: `src/pages/404.astro`**
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Prompt from '../components/Prompt.astro';
---
<BaseLayout lang="en" path="" section="none" noindex title="404 — Noel Moreno Lemus" description="Page not found">
  <Prompt dir="~" status="error">
    <Fragment slot="cmd">cd <span class="arg">$REQUEST_URI</span></Fragment>
    <p class="err">zsh: no such file or directory</p>
    <h1 class="sr-only">404</h1>
    <ul class="msgs">
      <li lang="en">Page not found. <a href="/">cd ~</a></li>
      <li lang="es">Página no encontrada. <a href="/es/">cd ~</a></li>
      <li lang="pt-BR">Página não encontrada. <a href="/pt/">cd ~</a></li>
    </ul>
  </Prompt>
</BaseLayout>
<style>
  .err { color: var(--err); }
  .msgs { list-style: none; padding: 0; margin: 10px 0 0; }
</style>
```

- [ ] **Step 7: Verify** — `npm run build`; spot-check `/about/`, `/es/projects/`, `/pt/about/`, `/404.html` in dev. Every fact on About/Projects traces to the LinkedIn snapshot.
- [ ] **Step 8: Commit** — `git add -A && git commit -m "feat: about, projects and 404 pages"`

---

### Task 7: RSS, OG images, post-build verifier (TDD)

**Files:** Create `src/pages/[...lang]/rss.xml.ts`, `src/lib/og.ts`, `src/pages/og/[lang]/[name].png.ts`, `scripts/lib/verify.mjs`, `scripts/verify-dist.mjs`, `tests/og.test.ts`, `tests/verify.test.mjs`.

**Interfaces — Produces:** `renderOgPng(title: string, dir: string): Promise<Uint8Array>`; `extractLinks(html)`, `toDistPath(href, site)`, `checkPage({file, html, site, exists, isArticle}): string[]`, `feedSlugs(xml): string[]`, `checkFeeds(feeds: Record<string,string>): string[]`.

- [ ] **Step 1: Failing tests**

`tests/og.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderOgPng } from '../src/lib/og.ts';

test('renders a 1200x630 PNG', async () => {
  const png = await renderOgPng('The model decides what. Code decides how.', '~/writing');
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(png.buffer, png.byteOffset);
  assert.equal(view.getUint32(16), 1200);
  assert.equal(view.getUint32(20), 630);
});
```

`tests/verify.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractLinks, checkPage, feedSlugs, checkFeeds } from '../scripts/lib/verify.mjs';

const SITE = 'https://nmlemus.github.io/';
const head = (extra = '') => `<link rel="canonical" href="${SITE}blog/a/">
<link rel="alternate" hreflang="en" href="${SITE}blog/a/"><link rel="alternate" hreflang="es" href="${SITE}es/blog/a/">
<link rel="alternate" hreflang="pt-BR" href="${SITE}pt/blog/a/"><link rel="alternate" hreflang="x-default" href="${SITE}blog/a/">${extra}`;
const all = () => true;

test('extracts canonical, alternates and hrefs', () => {
  const links = extractLinks(head('<a href="/about/">x</a>'));
  assert.equal(links.canonical, `${SITE}blog/a/`);
  assert.equal(links.alternates.length, 4);
  assert.ok(links.hrefs.includes('/about/'));
});

test('valid article passes', () => {
  assert.deepEqual(checkPage({ file: 'a', html: head(), site: SITE, exists: all, isArticle: true }), []);
});

test('broken internal link fails; external and fragments are ignored', () => {
  const html = '<a href="/nope/">x</a><a href="https://linkedin.com/x">y</a><a href="#top">z</a><a href="mailto:a@b.c">m</a>';
  const exists = (p) => p !== '/nope/index.html';
  assert.deepEqual(checkPage({ file: 'p', html, site: SITE, exists, isArticle: false }), ['p: broken link /nope/']);
});

test('article missing hreflang fails', () => {
  const html = `<link rel="canonical" href="${SITE}blog/a/"><link rel="alternate" hreflang="en" href="${SITE}blog/a/">`;
  assert.match(checkPage({ file: 'a', html, site: SITE, exists: all, isArticle: true }).join(), /hreflang set/);
});

test('feeds must list the same slugs', () => {
  const feed = (...s) => `<rss>${s.map((x) => `<item><link>${SITE}blog/${x}/</link></item>`).join('')}</rss>`;
  assert.deepEqual(feedSlugs(feed('b', 'a')), ['a', 'b']);
  assert.deepEqual(checkFeeds({ en: feed('a'), es: feed('a'), pt: feed('a') }), []);
  assert.match(checkFeeds({ en: feed('a'), es: feed(), pt: feed('a') }).join(), /es: feed slugs differ/);
});
```

- [ ] **Step 2: Run** — `npm test` → new tests FAIL.

- [ ] **Step 3: Implement**

`src/lib/og.ts`:
```ts
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

type Node = { type: string; props: { style: Record<string, unknown>; children?: unknown } };
const el = (style: Record<string, unknown>, children?: unknown): Node => ({ type: 'div', props: { style: { display: 'flex', ...style }, children } });

let fonts: Promise<[Buffer, Buffer]> | undefined;
function loadFonts() {
  const dir = join(process.cwd(), 'src/assets/og-fonts');
  fonts ??= Promise.all([readFile(join(dir, 'meslo-regular.ttf')), readFile(join(dir, 'meslo-bold.ttf'))]);
  return fonts;
}

/** 1200x630 Open Graph card in the site's terminal style. */
export async function renderOgPng(title: string, dir: string): Promise<Uint8Array> {
  const [regular, bold] = await loadFonts();
  const seg = (text: string, bg: string, color: string) => el({ background: bg, color, padding: '0 14px', height: 44, alignItems: 'center' }, text);
  const arrow = (color: string, bg: string) => el({ color, background: bg, height: 44, alignItems: 'center' }, '');
  const card = el(
    { width: 1200, height: 630, flexDirection: 'column', justifyContent: 'space-between', background: '#002b36', padding: '64px 72px', fontFamily: 'Meslo', color: '#93a1a1' },
    [
      el({ alignItems: 'center', fontSize: 26 }, [
        el({ color: '#6c6c6c', marginRight: 6 }, '╭─'),
        seg('', '#303030', '#ffffff'), arrow('#303030', '#5f5fd7'),
        seg(dir, '#5f5fd7', '#ffffff'), arrow('#5f5fd7', '#00af5f'),
        seg(' main', '#00af5f', '#000000'), arrow('#00af5f', '#002b36'),
      ]),
      el({ fontSize: title.length > 60 ? 52 : 64, fontWeight: 700, color: '#eee8d5', lineHeight: 1.2 }, title),
      el({ justifyContent: 'space-between', fontSize: 26 }, [
        el({ color: '#5fd700' }, '❯ Noel Moreno Lemus'),
        el({ color: '#839496' }, 'nmlemus.github.io'),
      ]),
    ],
  );
  const svg = await satori(card as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Meslo', data: regular, weight: 400, style: 'normal' },
      { name: 'Meslo', data: bold, weight: 700, style: 'normal' },
    ],
  });
  return new Uint8Array(new Resvg(svg).render().asPng());
}
```

`src/pages/og/[lang]/[name].png.ts`:
```ts
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
```

`src/pages/[...lang]/rss.xml.ts`:
```ts
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
```

`scripts/lib/verify.mjs`:
```js
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

export function extractLinks(html) {
  const out = { canonical: undefined, alternates: [], hrefs: [] };
  for (const tag of html.match(/<(?:a|link)\b[^>]*>/g) ?? []) {
    const href = attr(tag, 'href');
    if (href === undefined) continue;
    const rel = attr(tag, 'rel');
    const hreflang = attr(tag, 'hreflang');
    if (rel === 'canonical') out.canonical = href;
    if (rel === 'alternate' && hreflang && !tag.includes('application/rss+xml')) out.alternates.push({ hreflang, href });
    out.hrefs.push(href);
  }
  return out;
}

/** dist-relative file for a same-site URL, or null for external/non-http links and pure fragments. */
export function toDistPath(href, site) {
  if (href.startsWith('#')) return null;
  const url = new URL(href, site);
  if (url.origin !== new URL(site).origin) return null;
  const path = decodeURIComponent(url.pathname);
  return path.endsWith('/') ? `${path}index.html` : path;
}

const HREFLANGS = ['en', 'es', 'pt-BR', 'x-default'].sort().join();

export function checkPage({ file, html, site, exists, isArticle }) {
  const { canonical, alternates, hrefs } = extractLinks(html);
  const problems = hrefs
    .filter((href) => { const p = toDistPath(href, site); return p !== null && !exists(p); })
    .map((href) => `${file}: broken link ${href}`);
  if (!isArticle) return problems;
  if (!canonical) problems.push(`${file}: missing canonical`);
  const langs = alternates.map((a) => a.hreflang).sort().join();
  if (langs !== HREFLANGS) problems.push(`${file}: hreflang set is [${langs}]`);
  return problems;
}

export function feedSlugs(xml) {
  return [...xml.matchAll(/<link>[^<]*\/blog\/([^/<]+)\/<\/link>/g)].map((m) => m[1]).sort();
}

export function checkFeeds(feeds) {
  const [[, reference], ...others] = Object.entries(feeds);
  const expected = feedSlugs(reference).join();
  return others.filter(([, xml]) => feedSlugs(xml).join() !== expected).map(([lang]) => `${lang}: feed slugs differ from en`);
}
```

`scripts/verify-dist.mjs`:
```js
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { checkPage, checkFeeds } from './lib/verify.mjs';

const DIST = 'dist';
const SITE = 'https://nmlemus.github.io/';
const ARTICLE = /^\/(?:(?:es|pt)\/)?blog\/(?!tags\/)[^/]+\/index\.html$/;

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? walk(path) : [path];
});
const read = (path) => readFileSync(join(DIST, path), 'utf8');
const exists = (path) => existsSync(join(DIST, path));

const problems = [];
for (const file of walk(DIST).filter((f) => f.endsWith('.html'))) {
  const rel = '/' + relative(DIST, file).split(sep).join('/');
  problems.push(...checkPage({ file: rel, html: readFileSync(file, 'utf8'), site: SITE, exists, isArticle: ARTICLE.test(rel) }));
}
problems.push(...checkFeeds({ en: read('rss.xml'), es: read('es/rss.xml'), pt: read('pt/rss.xml') }));

if (problems.length) {
  console.error(`verify-dist: ${problems.length} problem(s)\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log('verify-dist: ok');
```

- [ ] **Step 4: Run** — `npm test` → PASS. `npm run build && npm run verify` → `verify-dist: ok`. Open `dist/og/es/fixture.png`: prompt arrows and title render (no tofu boxes).
- [ ] **Step 5: Empty-site check (Review Focus 3)** — `mv src/content/blog/fixture /tmp/fixture-bak && npm run build && npm run verify && grep -c '<item>' dist/rss.xml; mv /tmp/fixture-bak src/content/blog/fixture` → build ok, verify ok, `0` items.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: rss, open graph images and dist verification"`

---

### Task 8: Migrate the three LinkedIn posts

**Files:** Create `src/content/blog/{the-model-decides-what,coding-harness-tokens,safe-vibe-coding}/{en,es,pt}.md`. Delete `src/content/blog/fixture/`.

- [ ] **Step 1: Fetch sources** — in Chrome, open the author's LinkedIn activity (`linkedin.com/in/nmlemus/recent-activity/all/`) and the two *The AI Game* articles. Save the full text of each, plus its exact publication date, into the session scratchpad. If a date can't be read, ask the author (never guess).
- [ ] **Step 2: EN versions** — convert each to Markdown, keeping the author's wording. Allowed edits: headings (`##`), lists, code/table formatting, the probabilities table for post 1. Frontmatter:

| slug | title | tags |
|---|---|---|
| `the-model-decides-what` | The model decides what. Code decides how. | `[agents, reliability]` |
| `coding-harness-tokens` | How Coding Harness Affects Token Consumption | `[coding-agents, cost]` |
| `safe-vibe-coding` | An Essential Guide to Safe Development Practices in the Era of Vibe Coding | `[vibe-coding, safety]` |

`description`: one sentence written from the post itself. `date`: the real publication date.
- [ ] **Step 3: ES and PT (pt-BR)** — translate with the same frontmatter (`title`/`description` translated, `date`/`tags` identical). Don't translate code, commands, product names, or technical terms usually kept in English (agent, prompt, harness, token, pipeline, MCP).
- [ ] **Step 4: Remove fixture, build, verify** — `rm -r src/content/blog/fixture && npm test && npm run build && npm run verify` → all green, 3 posts × 3 languages.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "content: migrate three LinkedIn posts in EN/ES/PT"`

---

### Task 9: CI/CD, README, launch

**Files:** Create `.github/workflows/deploy.yml`, `README.md`.

- [ ] **Step 1: Confirm action inputs** — `gh api repos/actions/setup-node/contents/action.yml --jq .content | base64 -d | grep -E '^\s+(node-version-file|cache):'` → both present.
- [ ] **Step 2: `.github/workflows/deploy.yml`**
```yaml
name: Deploy
on:
  push:
    branches: [master]
  pull_request:
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm run verify
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist

  deploy:
    if: github.event_name != 'pull_request' && github.ref == 'refs/heads/master'
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```
- [ ] **Step 3: `README.md`** — sections: what this is; `npm install` / `npm run dev` / `npm test` / `npm run build && npm run verify`; **Writing a post** (folder layout, frontmatter table, `draft: true`, "ask Claude Code: translate post `<slug>`", review, push); **Modes** (terminal dark/light, reader); **Fonts & licenses** (`public/fonts/LICENSE-*`).
- [ ] **Step 4: Final local QA** — `npm run build && npm run preview`; Lighthouse (Chrome DevTools) on `/` and `/blog/the-model-decides-what/`: ≥95 in all four categories, fix what's flagged. Check the 3 modes at 360px and desktop.
- [ ] **Step 5: Commit & push branch, open PR** — `git add -A && git commit -m "ci: deploy to GitHub Pages via Actions"`; `git push -u origin astro-rewrite`; `gh pr create --base master` (body ends with the PR attribution line). Wait for CI green on the PR.
- [ ] **Step 6: Author review** — the author reads all EN/ES/PT texts in the preview. Apply requested changes.
- [ ] **Step 7: Switch Pages to Actions — ASK FIRST** — with explicit approval: `gh api -X PUT repos/nmlemus/nmlemus.github.io/pages -f build_type=workflow`, then merge the PR. Confirm the deploy job succeeds and `https://nmlemus.github.io/`, `/es/`, `/pt/` serve the new site.
