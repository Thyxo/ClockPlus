// Indstillinger (localStorage) og baggrundsbillede (IndexedDB).

export const SETTINGS_KEY = 'clockplus-v1';

export const DEFAULTS = {
  // Tid (panelet)
  plan: { kind: 'real', offsetMin: 5, fixed: '09:00', behavior: 'wait', durMin: 5 },
  anchor: null, // { t0, offset0, behavior, durMin } – den plan der kører lige nu
  pending: null, // anker der først bruges, når skærmen vækkes

  // Hemmelig
  press: 'keypad', // lang tryk på uret: keypad | preset | real | off
  presetTime: '09:00',
  secretBehavior: 'keep',
  secretDur: 5,
  applyOn: 'now', // now | wake
  confirm: 'lock', // none | lock  (hængelåsen blinker kort)
  passcode: true, // stryg op → kode-skærm
  passcodeSets: true, // koden der tastes = ny tid (TTMM)
  passcodeLen: 6,
  sleep: true, // dobbelttryk → sort skærm, tryk → væk
  startBlack: false,
  rollBtn: true, // hemmelig knap: rul synligt til rigtig tid
  rollSide: 'right', // left | right
  rollY: 50, // lodret placering i %
  rollSecs: 4,
  rollTaps: 1,

  // Forbindelse (relæet, samme rumkode som Noter+/Stopur/Lommeregner) og Google-fodnote
  room: '',
  gNote: true, // vis Google-fodnote
  gLive: false, // vis ordet mens de skriver (googleLive)
  gPos: 'bottom', // bottom | under | corner
  gSize: 12, // px
  gOpacity: 25, // %
  gFont: 'normal', // normal | clock
  gColor: 'auto', // auto (mørk på lys baggrund) | light | dark
  gHideMin: 10, // 0 = aldrig
  gMem: { googleAt: 0, liveAt: 0, word: null }, // se src/gnote.js

  // Udseende
  font: 'sf', // sf | rounded | serif | condensed | mono
  weight: 600,
  size: 100, // %
  stretch: 100, // højde i % (iOS 26 "høj" ur)
  clockY: 0, // px op/ned
  color: '#ffffff',
  glass: false,
  h24: true,
  sep: '.',
  pad: true,
  dateMode: 'date', // date | text | none
  dateText: 'Fyldt op · 14°',
  dateCap: true,
  dateShort: false, // man. 2. nov. (som iOS ved det høje ur)
  footText: '', // lille tekst i bunden (fx dit navn)
  showGrabber: true, // lille streg under batteriet (kontrolcenter)
  showLock: true,
  showButtons: true,
  showBar: true,
  wall: { zoom: 100, x: 50, y: 50, dim: 0 },
};

const clone = (o) => JSON.parse(JSON.stringify(o));

export function merge(base, extra) {
  const out = clone(base);
  if (!extra || typeof extra !== 'object') return out;
  for (const k of Object.keys(base)) {
    if (!(k in extra)) continue;
    const b = base[k];
    const e = extra[k];
    if (b === null) out[k] = e && typeof e === 'object' ? e : null;
    else if (typeof b === 'object' && !Array.isArray(b)) out[k] = merge(b, e);
    else if (typeof e === typeof b) out[k] = e;
  }
  return out;
}

export function loadSettings(storage = globalThis.localStorage) {
  try {
    const raw = storage && storage.getItem(SETTINGS_KEY);
    return merge(DEFAULTS, raw ? JSON.parse(raw) : null);
  } catch {
    return clone(DEFAULTS);
  }
}

export function saveSettings(s, storage = globalThis.localStorage) {
  try { storage && storage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* privat tilstand */ }
}

/* ---------------- baggrund i IndexedDB ---------------- */

const DB = 'clockplus';
const STORE = 'files';

function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export async function getFile(key) {
  try {
    const d = await db();
    return await new Promise((res) => {
      const q = d.transaction(STORE).objectStore(STORE).get(key);
      q.onsuccess = () => res(q.result || null);
      q.onerror = () => res(null);
    });
  } catch { return null; }
}

export async function putFile(key, blob) {
  const d = await db();
  await new Promise((res, rej) => {
    const tx = d.transaction(STORE, 'readwrite');
    if (blob) tx.objectStore(STORE).put(blob, key); else tx.objectStore(STORE).delete(key);
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });
}
