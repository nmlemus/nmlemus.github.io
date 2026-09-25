import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readingMinutes } from '../src/lib/reading-time.ts';

test('minimum one minute', () => assert.equal(readingMinutes(''), 1));
test('230 words per minute', () => assert.equal(readingMinutes('word '.repeat(690)), 3));
test('code blocks are not counted', () => {
  assert.equal(readingMinutes('word '.repeat(230) + '\n```\n' + 'code '.repeat(2000) + '\n```\n'), 1);
});
