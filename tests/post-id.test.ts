import { test } from 'node:test';
import assert from 'node:assert/strict';
import { postId } from '../src/lib/post-id.ts';
import { validatePosts, PostValidationError } from '../src/lib/validate-posts.ts';

// Astro's default glob id slugifies paths ("Mi Post/en.md" -> "mi-post/en"), hiding bad folder names.
test('post ids keep the raw folder name', () => {
  assert.equal(postId({ entry: 'Mi Post/en.md' }), 'Mi Post/en');
  assert.equal(postId({ entry: 'the-model/pt.md' }), 'the-model/pt');
});

test('a folder name with spaces reaches the validator unchanged and fails', () => {
  const data = { title: 'T', description: 'D', date: new Date('2026-01-01'), tags: ['a'] };
  const entries = ['en', 'es', 'pt'].map((l) => ({ id: postId({ entry: `Mi Post/${l}.md` }), data }));
  assert.throws(() => validatePosts(entries), (e) => e instanceof PostValidationError && /Mi Post: folder name/.test(e.message));
});
