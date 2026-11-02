// Tidsmotoren: regner ud, hvilket klokkeslæt låseskærmen skal vise.
// Ren logik uden DOM, så den kan testes i Node.
//
// En "plan" beskriver, hvad performeren har valgt i panelet:
//   kind:     'real' | 'offset' | 'fixed'
//   offsetMin: minutter frem (+) eller tilbage (-)   (kind = 'offset')
//   fixed:    'HH:MM'                               (kind = 'fixed')
//   behavior: hvordan tiden opfører sig bagefter (se BEHAVIORS)
//   durMin:   varighed i minutter for 'glide' og 'jump'
//
// Når planen startes, laves et "anker" { t0, offset0, behavior, durMin },
// og det viste klokkeslæt er altid: rigtig tid + offsetAt(nu).

export const MIN = 60_000;

export const BEHAVIORS = {
  keep: 'Kører normalt',
  freeze: 'Står stille',
  wait: 'Venter på rigtig tid',
  glide: 'Glider til rigtig tid',
  jump: 'Springer til rigtig tid',
};

export function parseHM(str) {
  const m = /^\s*(\d{1,2})[:.]?(\d{2})\s*$/.exec(String(str ?? ''));
  if (!m) return null;
  const h = +m[1];
  const mi = +m[2];
  if (h > 23 || mi > 59) return null;
  return { h, m: mi };
}

// Cifre fra det hemmelige tastatur / kode-skærmen → { h, m } eller null.
// 4 cifre = TTMM, 3 cifre = TMM, 1-2 cifre = kun minutter (timen beholdes).
export function digitsToHM(digits, currentHour) {
  const d = String(digits).replace(/\D/g, '');
  if (!d.length || d.length > 4) return null;
  let h;
  let m;
  if (d.length <= 2) { h = currentHour; m = +d; } else { h = +d.slice(0, -2); m = +d.slice(-2); }
  if (!(h >= 0 && h <= 23) || m > 59) return null;
  return { h, m };
}

// Forskydningen (ms) der skal til, for at vise klokken h:m i dag – sekunderne starter på 0.
export function offsetToClock(now, h, m) {
  const d = new Date(now);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0).getTime();
  return target - now;
}

export function makeAnchor(plan, now) {
  const p = plan || {};
  let offset0 = 0;
  if (p.kind === 'offset') offset0 = Math.round((Number(p.offsetMin) || 0) * MIN);
  else if (p.kind === 'fixed') {
    const hm = parseHM(p.fixed);
    if (hm) offset0 = offsetToClock(now, hm.h, hm.m);
  }
  const behavior = p.kind === 'real' || !BEHAVIORS[p.behavior] ? 'keep' : p.behavior;
  return { t0: now, offset0, behavior, durMin: Math.max(0, Number(p.durMin) || 0) };
}

export function offsetAt(anchor, now) {
  if (!anchor) return 0;
  const O = anchor.offset0 || 0;
  if (!O && anchor.behavior !== 'freeze') return 0;
  const e = Math.max(0, now - anchor.t0);
  const D = (anchor.durMin || 0) * MIN;
  switch (anchor.behavior) {
    case 'freeze': return O - e; // det viste står stille
    case 'wait':
      // Foran: stå stille, indtil den rigtige tid indhenter. Bagud kan man ikke vente → glid.
      if (O > 0) return Math.max(0, O - e);
      return D > 0 ? O * Math.max(0, 1 - e / D) + 0 : O;
    case 'glide': return D > 0 ? O * Math.max(0, 1 - e / D) + 0 : 0;
    case 'jump': return e < D ? O : 0;
    default: return O;
  }
}

// Rul synligt til rigtig tid på få sekunder (den hemmelige knap): den viste tid
// tæller lineært ned (eller op), så man ser minutterne skifte et for et.
export function rollAnchor(anchor, now, secs = 4) {
  const off = offsetAt(anchor, now);
  if (Math.abs(off) < 1000) return null;
  return { t0: now, offset0: off, behavior: 'glide', durMin: Math.max(0.5, secs) / 60, roll: true };
}

export function shownTime(anchor, now) {
  return now + offsetAt(anchor, now);
}

// Hvornår den viste tid er tilbage på rigtig tid (ms fra nu), eller null hvis aldrig.
export function msUntilReal(anchor, now) {
  if (!anchor || !anchor.offset0) return anchor && anchor.behavior === 'freeze' ? null : 0;
  const e = Math.max(0, now - anchor.t0);
  const D = (anchor.durMin || 0) * MIN;
  const O = anchor.offset0;
  switch (anchor.behavior) {
    case 'wait': return O > 0 ? Math.max(0, O - e) : (D > 0 ? Math.max(0, D - e) : null);
    case 'glide':
    case 'jump': return Math.max(0, D - e);
    default: return null;
  }
}

/* ---------------- formatering (dansk iOS) ---------------- */

const DAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
const MONTHS = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];

export function formatClock(t, { h24 = true, sep = '.', pad = true } = {}) {
  const d = new Date(t);
  let h = d.getHours();
  if (!h24) h = h % 12 || 12;
  const hs = h24 && pad ? String(h).padStart(2, '0') : String(h);
  return hs + sep + String(d.getMinutes()).padStart(2, '0');
}

const DAYS_SHORT = ['søn.', 'man.', 'tirs.', 'ons.', 'tors.', 'fre.', 'lør.'];
const MONTHS_SHORT = ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'];

export function formatDate(t, { cap = true, short = false } = {}) {
  const d = new Date(t);
  if (short) return `${DAYS_SHORT[d.getDay()]} ${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`;
  const s = `${DAYS[d.getDay()]} ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
  return cap ? s[0].toUpperCase() + s.slice(1) : s;
}

export function describeAnchor(anchor, now) {
  const off = offsetAt(anchor, now);
  if (Math.abs(off) < 1000 && (!anchor || anchor.behavior !== 'freeze')) return 'Rigtig tid';
  const min = Math.round(off / MIN);
  const sign = min > 0 ? '+' : '';
  const left = msUntilReal(anchor, now);
  const tail = left == null ? '' : ` · rigtig tid om ${Math.ceil(left / MIN)} min`;
  return `${sign}${min} min${tail}`;
}
