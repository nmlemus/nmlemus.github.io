import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readingMinutes } from '../src/lib/reading-time.ts';

test('minimum one minute', () => assert.equal(readingMinutes(''), 1));
test('230 words per minute', () => assert.equal(readingMinutes('word '.repeat(690)), 3));
test('code blocks are not counted', () => {
  assert.equal(readingMinutes('word '.repeat(230) + '\n```\n' + 'code '.repeat(2000) + '\n```\n'), 1);
});
test('inline SVG and HTML markup are not counted', () => {
  const svg = '<figure class="diagram"><svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8"/>' + '<text x="1" y="1">label words here</text>'.repeat(500) + '</svg></figure>';
  assert.equal(readingMinutes('word '.repeat(230) + '\n' + svg + '\n'), 1);
});
