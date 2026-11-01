import test from 'node:test';
import assert from 'node:assert/strict';
import { makeAnchor, shownTime, offsetAt, digitsToHM, formatClock, formatDate, parseHM, MIN } from '../src/clock.js';

const T0 = new Date(2026, 10, 1, 21, 16, 30).getTime(); // søndag 1. nov 21.16.30

test('rigtig tid uden anker', () => {
  assert.equal(shownTime(null, T0), T0);
  assert.equal(formatClock(T0), '21.16');
});

test('+5 min kører normalt', () => {
  const a = makeAnchor({ kind: 'offset', offsetMin: 5, behavior: 'keep' }, T0);
  assert.equal(formatClock(shownTime(a, T0)), '21.21');
  assert.equal(formatClock(shownTime(a, T0 + 60 * MIN)), '22.21');
});

test('+5 min venter på rigtig tid', () => {
  const a = makeAnchor({ kind: 'offset', offsetMin: 5, behavior: 'wait' }, T0);
  assert.equal(formatClock(shownTime(a, T0 + 3 * MIN)), '21.21'); // står stille
  assert.equal(offsetAt(a, T0 + 5 * MIN), 0);
  assert.equal(shownTime(a, T0 + 9 * MIN), T0 + 9 * MIN);
});

test('-5 min glider til rigtig tid over 10 min – aldrig baglæns', () => {
  const a = makeAnchor({ kind: 'offset', offsetMin: -5, behavior: 'glide', durMin: 10 }, T0);
  let prev = -Infinity;
  for (let s = 0; s <= 900; s += 5) {
    const v = shownTime(a, T0 + s * 1000);
    assert.ok(v >= prev);
    prev = v;
  }
  assert.equal(offsetAt(a, T0 + 10 * MIN), 0);
});

test('+5 glide over 10 min går med halv fart og aldrig baglæns', () => {
  const a = makeAnchor({ kind: 'offset', offsetMin: 5, behavior: 'glide', durMin: 10 }, T0);
  assert.equal(shownTime(a, T0 + 2 * MIN) - shownTime(a, T0), 1 * MIN);
});

test('spring efter 2 min', () => {
  const a = makeAnchor({ kind: 'offset', offsetMin: 10, behavior: 'jump', durMin: 2 }, T0);
  assert.equal(offsetAt(a, T0 + MIN), 10 * MIN);
  assert.equal(offsetAt(a, T0 + 2 * MIN), 0);
});

test('bestemt tidspunkt 09:00 – kører fra 09.00.00, samme dato', () => {
  const a = makeAnchor({ kind: 'fixed', fixed: '09:00', behavior: 'keep' }, T0);
  assert.equal(formatClock(shownTime(a, T0)), '09.00');
  assert.equal(formatClock(shownTime(a, T0 + 59_000)), '09.00');
  assert.equal(formatClock(shownTime(a, T0 + 60_000)), '09.01');
  assert.equal(formatDate(shownTime(a, T0)), 'Søndag 1. november');
});

test('frosset tid står stille', () => {
  const a = makeAnchor({ kind: 'fixed', fixed: '13:37', behavior: 'freeze' }, T0);
  assert.equal(formatClock(shownTime(a, T0 + 3 * 3600_000)), '13.37');
});

test('cifre fra tastaturet', () => {
  assert.deepEqual(digitsToHM('0900', 21), { h: 9, m: 0 });
  assert.deepEqual(digitsToHM('930', 21), { h: 9, m: 30 });
  assert.deepEqual(digitsToHM('37', 21), { h: 21, m: 37 });
  assert.equal(digitsToHM('2460', 1), null);
  assert.equal(digitsToHM('', 1), null);
  assert.deepEqual(parseHM('9.05'), { h: 9, m: 5 });
});

test('formater', () => {
  const t = new Date(2026, 0, 5, 9, 5).getTime();
  assert.equal(formatClock(t), '09.05');
  assert.equal(formatClock(t, { sep: ':', pad: false }), '9:05');
  assert.equal(formatClock(new Date(2026, 0, 5, 21, 5).getTime(), { h24: false }), '9.05');
  assert.equal(formatDate(t, { cap: false }), 'mandag 5. januar');
});
