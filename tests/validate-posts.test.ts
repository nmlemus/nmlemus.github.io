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
