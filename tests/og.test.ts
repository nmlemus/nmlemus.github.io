import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderOgPng } from '../src/lib/og.ts';

test('renders a 1200x630 PNG', async () => {
  const png = await renderOgPng('The model decides what. Code decides how.', '~/writing');
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(png.buffer, png.byteOffset);
  assert.equal(view.getUint32(16), 1200);
  assert.equal(view.getUint32(20), 630);
});
