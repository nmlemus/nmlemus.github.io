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

test('KaTeX render errors fail the page', () => {
  const html = '<span class="katex-error" title="ParseError">\\frac{1}</span>';
  assert.match(checkPage({ file: 'm', html, site: SITE, exists: all, isArticle: false }).join(), /m: KaTeX error/);
});

test('feeds must list the same slugs', () => {
  const feed = (...s) => `<rss>${s.map((x) => `<item><link>${SITE}blog/${x}/</link></item>`).join('')}</rss>`;
  assert.deepEqual(feedSlugs(feed('b', 'a')), ['a', 'b']);
  assert.deepEqual(checkFeeds({ en: feed('a'), es: feed('a'), pt: feed('a') }), []);
  assert.match(checkFeeds({ en: feed('a'), es: feed(), pt: feed('a') }).join(), /es: feed slugs differ/);
});
