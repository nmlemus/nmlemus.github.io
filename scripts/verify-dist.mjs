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
