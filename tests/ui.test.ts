import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ui } from '../src/i18n/ui.ts';

test('every language defines every key with non-empty text', () => {
  const keys = Object.keys(ui.en).sort();
  for (const lang of ['es', 'pt'] as const) {
    assert.deepEqual(Object.keys(ui[lang]).sort(), keys, `${lang} keys differ from en`);
    for (const key of keys) assert.ok(ui[lang][key as keyof typeof ui.en].trim(), `${lang}.${key} is empty`);
  }
});
