// Google-fodnoten: vælger hvilket søgeord fra Fake Google der skal stå på låseskærmen.
// Ren logik uden DOM, så den kan testes i Node.
//
// mem (gemmes i indstillingerne):
//   googleAt: tidsstempel på det sidst brugte google-ord (kun nyere ord bruges)
//   liveAt:   tidsstempel på det sidst brugte googleLive (mens de skriver)
//   word:     { q, at, since, live, hidden } – ordet der vises (since = modtaget her)

export const emptyMem = () => ({ googleAt: 0, liveAt: 0, word: null });

const clean = (q) => (typeof q === 'string' ? q.replace(/\s+/g, ' ').trim().slice(0, 200) : '');
const fresh = (at, hideMin, now) => !hideMin || now - at < hideMin * 60_000;

/**
 * Opdatér mem ud fra rummets tilstand. Returnerer true, hvis noget ændrede sig.
 * @param {object} mem
 * @param {object} state  rummets tilstand ({ google, googleLive, ... })
 * @param {{ live?: boolean, hideMin?: number }} opts
 * @param {number} now
 */
export function takeGoogle(mem, state, { live = false, hideMin = 10 } = {}, now = Date.now()) {
  if (!state || typeof state !== 'object') return false;
  let changed = false;

  const g = state.google;
  const gAt = Number(g && g.at) || 0;
  const gq = clean(g && g.q);
  if (gq && gAt > mem.googleAt) {
    mem.googleAt = gAt;
    if (fresh(gAt, hideMin, now)) { mem.word = { q: gq, at: gAt, since: now, live: false, hidden: false }; }
    changed = true;
  }

  const l = state.googleLive;
  const lAt = Number(l && l.at) || 0;
  if (live && l && lAt > mem.liveAt && lAt > mem.googleAt) {
    mem.liveAt = lAt;
    const lq = clean(l.q);
    if (lq && fresh(lAt, hideMin, now)) {
      mem.word = { q: lq, at: lAt, since: now, live: true, hidden: false };
    } else if (!lq && mem.word && mem.word.live) {
      mem.word = null; // feltet blev tømt
    }
    changed = true;
  }
  return changed;
}

/** Ordet der skal vises lige nu – eller '' */
export function visibleWord(mem, { hideMin = 10 } = {}, now = Date.now()) {
  const w = mem && mem.word;
  if (!w || w.hidden || !w.q) return '';
  if (hideMin && now - w.since >= hideMin * 60_000) return '';
  return w.q;
}

/** Ny rumkode: kun ord, der kommer herefter, tæller */
export function resetMem(mem, now = Date.now()) {
  mem.googleAt = now;
  mem.liveAt = now;
  mem.word = null;
}
