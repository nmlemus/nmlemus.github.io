import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const versionOf = (req) => JSON.parse(readFileSync(join(dirname(req.resolve('katex')), '..', 'package.json'), 'utf8')).version;

// The site loads katex's CSS; rehype-katex renders with its own katex. Different versions break layout silently.
test('KaTeX CSS matches the KaTeX that rehype-katex renders with', () => {
  const site = createRequire(import.meta.url);
  const rehype = createRequire(import.meta.resolve('rehype-katex'));
  assert.equal(versionOf(site), versionOf(rehype));
});
