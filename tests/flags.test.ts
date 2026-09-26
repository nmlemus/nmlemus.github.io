import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FLAGS, type FlagCode } from '../src/lib/flags.ts';
import { history, education, spoken } from '../src/data/profile.ts';

test('every flag has an SVG and a country name in each language', () => {
  for (const [code, flag] of Object.entries(FLAGS)) {
    assert.match(flag.svg, /^<svg [^>]*viewBox="0 0 30 20"/, `${code} svg`);
    for (const lang of ['en', 'es', 'pt'] as const) assert.ok(flag.name[lang].trim(), `${code}.${lang}`);
  }
});

test('every job, degree and spoken language points to a known flag', () => {
  const codes = [...history, ...education].map((i) => i.country).concat(spoken.map((s) => s.flag));
  for (const code of codes) assert.ok(code in FLAGS, `unknown flag ${code}`);
});

test('education lists the radiochemistry degree after the master (newest first)', () => {
  const texts = education.map((e) => e.what.en);
  const msc = texts.findIndex((t) => t.includes('Bioinformatics'));
  const bsc = texts.findIndex((t) => t.includes('Radiochemistry @ ISCTN'));
  assert.ok(msc >= 0 && bsc > msc, texts.join(' | '));
});

test('spoken languages: Spanish native, English and Portuguese professional', () => {
  assert.deepEqual(spoken.map((s) => [s.name.en, s.level.en]), [['Spanish', 'native'], ['English', 'professional'], ['Portuguese', 'professional']]);
});

const _typecheck: FlagCode[] = ['cu', 'pa', 'br', 'es', 'us'];

test('every job and degree has a start and an end (or "present") in every language', () => {
  for (const item of [...history, ...education]) {
    for (const lang of ['en', 'es', 'pt'] as const) {
      const when = typeof item.when === 'string' ? item.when : item.when[lang];
      assert.match(when, /^\d{4}–(\d{4}|present|actual|atual)$/, `${lang} dates for: ${item.what.en}`);
    }
  }
});
