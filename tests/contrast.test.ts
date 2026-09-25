import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrast, ensureContrast, remapShikiStyle, CODE_BG_LIGHT, CODE_BG_DARK } from '../src/lib/contrast.ts';

test('contrast ratio matches WCAG reference values', () => {
  assert.equal(contrast('#000000', '#ffffff').toFixed(1), '21.0');
  assert.equal(contrast('#586e75', '#002b36').toFixed(2), '2.79');
});

test('ensureContrast leaves passing colors untouched', () => {
  assert.equal(ensureContrast('#93a1a1', '#002b36'), '#93a1a1');
});

test('ensureContrast lightens on dark and darkens on light backgrounds until ≥ 4.5', () => {
  const dark = ensureContrast('#586E75', '#002b36');
  const light = ensureContrast('#93A1A1', CODE_BG_LIGHT);
  assert.ok(contrast(dark, '#002b36') >= 4.5, dark);
  assert.ok(contrast(light, CODE_BG_LIGHT) >= 4.5, light);
});

test('remapShikiStyle fixes light `color` and dark `--shiki-dark` separately', () => {
  const out = remapShikiStyle('color:#93A1A1;--shiki-dark:#586E75;font-style:italic');
  const light = out.match(/(?:^|;)color:(#[0-9a-f]{6})/i)![1];
  const dark = out.match(/--shiki-dark:(#[0-9a-f]{6})/i)![1];
  assert.ok(contrast(light, CODE_BG_LIGHT) >= 4.5);
  assert.ok(contrast(dark, CODE_BG_DARK) >= 4.5);
  assert.match(out, /font-style:italic/);
});

test('remapShikiStyle leaves background colors alone', () => {
  const style = 'background-color:#FDF6E3;--shiki-dark-bg:#002B36';
  assert.equal(remapShikiStyle(style), style);
});
