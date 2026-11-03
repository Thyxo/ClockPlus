import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyMem, takeGoogle, visibleWord, resetMem } from '../src/gnote.js';

const NOW = 1793698815530;

test('nyt google-ord vises', () => {
  const m = emptyMem();
  assert.equal(takeGoogle(m, { google: { q: 'fortnite', at: NOW, via: 'search' } }, {}, NOW + 200), true);
  assert.equal(visibleWord(m, {}, NOW + 300), 'fortnite');
});

test('samme eller ældre ord bruges ikke igen (fx efter genstart)', () => {
  const m = emptyMem();
  takeGoogle(m, { google: { q: 'fortnite', at: NOW } }, {}, NOW);
  m.word.hidden = true;
  const saved = JSON.parse(JSON.stringify(m)); // som efter genstart
  assert.equal(takeGoogle(saved, { google: { q: 'fortnite', at: NOW } }, {}, NOW + 5000), false);
  assert.equal(visibleWord(saved, {}, NOW + 5000), '');
  assert.equal(takeGoogle(saved, { google: { q: 'gammel', at: NOW - 1 } }, {}, NOW + 5000), false);
  takeGoogle(saved, { google: { q: 'pizza', at: NOW + 6000 } }, {}, NOW + 6100);
  assert.equal(visibleWord(saved, {}, NOW + 6200), 'pizza');
});

test('ny rumkode: ord fra før skiftet ignoreres', () => {
  const m = emptyMem();
  resetMem(m, NOW);
  assert.equal(takeGoogle(m, { google: { q: 'gammelt', at: NOW - 60_000 } }, {}, NOW + 10), false);
  assert.equal(visibleWord(m, {}, NOW + 20), '');
});

test('skjules automatisk efter X min – eller aldrig', () => {
  const m = emptyMem();
  takeGoogle(m, { google: { q: 'kat', at: NOW } }, { hideMin: 10 }, NOW);
  assert.equal(visibleWord(m, { hideMin: 10 }, NOW + 9.9 * 60_000), 'kat');
  assert.equal(visibleWord(m, { hideMin: 10 }, NOW + 10 * 60_000), '');
  assert.equal(visibleWord(m, { hideMin: 0 }, NOW + 24 * 3600_000), 'kat');
});

test('live: ordet vises mens de skriver, google vinder bagefter', () => {
  const m = emptyMem();
  const o = { live: true };
  takeGoogle(m, { googleLive: { q: 'fort', at: NOW } }, o, NOW);
  assert.equal(visibleWord(m, o, NOW), 'fort');
  takeGoogle(m, { googleLive: { q: '', at: NOW + 100 } }, o, NOW + 100);
  assert.equal(visibleWord(m, o, NOW + 100), '');
  takeGoogle(m, { googleLive: { q: 'fortnite', at: NOW + 200, done: true }, google: { q: 'fortnite', at: NOW + 210 } }, o, NOW + 220);
  assert.deepEqual([visibleWord(m, o, NOW + 230), m.word.live], ['fortnite', false]);
  // Live slået fra: googleLive ignoreres
  const m2 = emptyMem();
  takeGoogle(m2, { googleLive: { q: 'fo', at: NOW } }, { live: false }, NOW);
  assert.equal(visibleWord(m2, {}, NOW), '');
});

test('æøå og mellemrum', () => {
  const m = emptyMem();
  takeGoogle(m, { google: { q: '  rødgrød   med fløde på å ', at: NOW } }, {}, NOW);
  assert.equal(visibleWord(m, {}, NOW), 'rødgrød med fløde på å');
});
