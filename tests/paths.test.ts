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
