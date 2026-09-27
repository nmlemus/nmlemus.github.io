import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, GA_ID } from '../src/lib/analytics.ts';

test('GA4 loads only after an explicit accept; no answer asks; decline stays off', () => {
  assert.equal(decide('granted'), 'load');
  assert.equal(decide('denied'), 'skip');
  assert.equal(decide(null), 'ask');
  assert.equal(decide('something-else'), 'ask');
});

test('measurement id has the GA4 shape', () => {
  assert.match(GA_ID, /^G-[A-Z0-9]{10}$/);
});
