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
  if (html.includes('katex-error')) problems.push(`${file}: KaTeX error (invalid LaTeX)`);
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
