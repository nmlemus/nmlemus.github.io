// Pin a UTC-5 zone so CI (which runs in UTC) still catches local-time date bugs.
process.env.TZ = 'America/Panama';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isoDate, longDate } from '../src/lib/format.ts';

const d = new Date('2026-09-10'); // YAML dates are UTC midnight

test('isoDate ignores the machine timezone', () => assert.equal(isoDate(d), '2026-09-10'));
test('longDate per language, UTC', () => {
  assert.equal(longDate(d, 'en'), 'September 10, 2026');
  assert.equal(longDate(d, 'es'), '10 de septiembre de 2026');
  assert.equal(longDate(d, 'pt'), '10 de setembro de 2026');
});
