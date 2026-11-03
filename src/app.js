import {
  BEHAVIORS, makeAnchor, shownTime, offsetAt, digitsToHM,
  formatClock, formatDate, describeAnchor, rollAnchor,
} from './clock.js';
import { DEFAULTS, loadSettings, saveSettings, merge, getFile, putFile } from './settings.js';
import { createLink, cleanRoom } from './link.js';
import { takeGoogle, visibleWord, resetMem } from './gnote.js';

const VERSION = '1.2.0';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let S = loadSettings();
const save = () => saveSettings(S);

const lock = $('#lock');
const wall = $('#wall');
const content = $('#content');
const clockEl = $('#clock');
const clockText = $('#clockText');
const dateEl = $('#date');
const padlock = $('#padlock');
const black = $('#black');
const pass = $('#pass');
const panel = $('#panel');

/* ================= visning ================= */

const fmt = () => ({ h24: S.h24, sep: S.sep, pad: S.pad });
let lastClock = '';
let lastDate = '';

function render() {
  const now = Date.now();
  const t = shownTime(S.anchor, now);
  const c = formatClock(t, fmt());
  if (c !== lastClock) { clockText.textContent = c; lastClock = c; }
  const d = S.dateMode === 'date' ? formatDate(t, { cap: S.dateCap, short: S.dateShort }) : S.dateMode === 'text' ? S.dateText : '';
  if (d !== lastDate) { dateEl.textContent = d; lastDate = d; }
  renderNote(now);
  if (!panel.hidden) renderStatus(now);
}

function applyLook() {
  const r = document.documentElement.style;
  r.setProperty('--clock-color', S.color);
  r.setProperty('--clock-weight', S.weight);
  r.setProperty('--clock-size', S.size / 100);
  r.setProperty('--clock-stretch', S.stretch / 100);
  r.setProperty('--clock-y', `${S.clockY}px`);
  lock.className = `lock font-${S.font}${S.glass ? ' glass' : ''}${lock.classList.contains('passcode') ? ' passcode' : ''}`;
  dateEl.hidden = S.dateMode === 'none';
  padlock.style.visibility = S.showLock ? '' : 'hidden';
  $('#qbtns').hidden = !S.showButtons;
  $('#homebar').hidden = !S.showBar;
  placeNote();
  $('#grabber').hidden = !S.showGrabber;
  $('#foot').textContent = S.footText;
  const rz = $('#rollzone');
  rz.style.left = S.rollSide === 'left' ? '0' : '';
  rz.style.right = S.rollSide === 'right' ? '0' : '';
  rz.style.top = `${S.rollY}%`;
  const w = S.wall;
  wall.style.setProperty('--wz', w.zoom / 100);
  wall.style.setProperty('--wall-x', `${w.x}%`);
  wall.style.setProperty('--wall-y', `${w.y}%`);
  $('#wallDim').style.opacity = w.dim / 100;
  lastClock = ''; lastDate = '';
  render();
}

let wallUrl = null;
async function loadWall() {
  const blob = await getFile('wallpaper');
  if (wallUrl) URL.revokeObjectURL(wallUrl);
  wallUrl = blob ? URL.createObjectURL(blob) : null;
  wall.classList.toggle('photo', !!wallUrl);
  wall.style.setProperty('--wall-img', wallUrl ? `url("${wallUrl}")` : 'none');
}

/* ================= tids-planer ================= */

function startPlan(plan, when = 'now') {
  const a = makeAnchor(plan, Date.now());
  if (when === 'wake') S.pending = plan; else { S.anchor = a; S.pending = null; }
  save();
  render();
}

function realTime() { S.anchor = null; S.pending = null; S.plan.kind = 'real'; save(); render(); }

function secretPlan(h, m) {
  const fixed = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return { kind: 'fixed', fixed, behavior: S.secretBehavior, durMin: S.secretDur };
}

function confirmBlink() {
  if (S.confirm !== 'lock') return;
  padlock.classList.add('blink');
  setTimeout(() => padlock.classList.remove('blink'), 260);
}

function applySecret(h, m) {
  startPlan(secretPlan(h, m), S.applyOn);
  confirmBlink();
}

/* ================= hemmelig knap: rul til rigtig tid ================= */

let rollTimer = null;
function startRoll() {
  const a = rollAnchor(S.anchor, Date.now(), S.rollSecs);
  if (!a) return;
  S.anchor = a;
  S.pending = null;
  save();
  // Tegn ofte, mens der rulles, så hvert minut ses
  clearInterval(rollTimer);
  rollTimer = setInterval(render, 40);
  setTimeout(() => { clearInterval(rollTimer); S.anchor = null; save(); render(); }, S.rollSecs * 1000 + 200);
}

let rollTaps = [];
function inRollZone(x, y) {
  if (!S.rollBtn) return false;
  const r = $('#rollzone').getBoundingClientRect();
  return x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 6 && y <= r.bottom + 6;
}
function rollTap() {
  const t = performance.now();
  rollTaps = rollTaps.filter((v) => t - v < 600);
  rollTaps.push(t);
  if (rollTaps.length >= S.rollTaps) { rollTaps = []; startRoll(); }
}

/* ================= sort skærm ================= */

let isBlack = false;
function sleep() {
  isBlack = true;
  black.classList.remove('waking');
  black.hidden = false;
  closePass(true);
}
function wake() {
  if (S.pending) { S.anchor = makeAnchor(S.pending, Date.now()); S.pending = null; save(); }
  render();
  isBlack = false;
  black.classList.add('waking');
  wall.animate?.([{ opacity: 0.4 }, { opacity: 1 }], { duration: 500, easing: 'ease-out' });
  setTimeout(() => { if (!isBlack) { black.hidden = true; black.classList.remove('waking'); } }, 460);
}

/* ================= usynligt tastatur ================= */
// Skærmen deles i 3 × 4 felter som en telefon-tastatur:
//   1 2 3 / 4 5 6 / 7 8 9 / ✕ 0 ✓

let kp = null; // { digits, timer }
function armKeypad() {
  kp = { digits: '' };
  confirmBlink();
  kpTimer();
}
function kpTimer() {
  clearTimeout(kp?.timer);
  if (kp) kp.timer = setTimeout(() => { kp = null; }, 8000);
}
function kpKey(x, y) {
  const col = Math.min(2, Math.floor((x / lock.clientWidth) * 3));
  const row = Math.min(3, Math.floor((y / lock.clientHeight) * 4));
  const key = row < 3 ? String(row * 3 + col + 1) : ['x', '0', 'ok'][col];
  if (key === 'x') { clearTimeout(kp.timer); kp = null; return; }
  if (key === 'ok') return kpFinish();
  kp.digits += key;
  kpTimer();
  if (kp.digits.length >= 4) kpFinish();
}
function kpFinish() {
  const d = kp.digits;
  clearTimeout(kp.timer);
  kp = null;
  const cur = new Date(shownTime(S.anchor, Date.now())).getHours();
  const hm = digitsToHM(d, cur);
  if (hm) applySecret(hm.h, hm.m);
}

/* ================= kode-skærm ================= */

const LETTERS = ['', 'ABC', 'DEF', 'GHI', 'JKL', 'MNO', 'PQRS', 'TUV', 'WXYZ'];
let code = '';
function buildPass() {
  const pad = $('#passPad');
  pad.innerHTML = '';
  for (let n = 1; n <= 10; n++) {
    const v = n === 10 ? 0 : n;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `pkey${v === 0 ? ' zero' : ''}`;
    b.dataset.k = v;
    b.innerHTML = `<b>${v}</b>${v === 0 ? '' : `<small>${LETTERS[v - 1] || '&nbsp;'}</small>`}`;
    pad.append(b);
  }
}
function passDots() {
  const n = S.passcodeLen;
  $('#passDots').innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i < code.length ? 'on' : ''}"></i>`).join('');
  $('#passCancel').textContent = code.length ? 'Slet' : 'Annuller';
}
function openPass() {
  code = '';
  passDots();
  pass.hidden = false;
  pass.classList.remove('out');
  lock.classList.add('passcode');
}
function closePass(instant) {
  if (pass.hidden) return;
  lock.classList.remove('passcode');
  content.style.transform = ''; content.style.opacity = '';
  if (instant) { pass.hidden = true; return; }
  pass.classList.add('out');
  setTimeout(() => { pass.hidden = true; pass.classList.remove('out'); }, 240);
}
function passKey(k) {
  if (code.length >= S.passcodeLen) return;
  code += k;
  passDots();
  if (code.length < S.passcodeLen) return;
  const entered = code;
  if (S.passcodeSets) {
    const cur = new Date(shownTime(S.anchor, Date.now())).getHours();
    const hm = digitsToHM(entered.slice(0, 4), cur);
    if (hm) startPlan(secretPlan(hm.h, hm.m), 'now');
  }
  setTimeout(() => {
    const dots = $('#passDots');
    dots.classList.add('shake');
    setTimeout(() => { dots.classList.remove('shake'); code = ''; passDots(); }, 460);
  }, 120);
}
pass.addEventListener('pointerdown', (e) => {
  const k = e.target.closest('.pkey');
  if (!k) return;
  k.classList.add('down');
  setTimeout(() => k.classList.remove('down'), 120);
  passKey(k.dataset.k);
});
$('#passCancel').addEventListener('click', () => {
  if (code.length) { code = code.slice(0, -1); passDots(); } else closePass();
});

/* ================= berøring på låseskærmen ================= */

let p = null; // aktuel berøring
let cornerTaps = [];
let lastTap = 0;

const inTopRight = (x, y) => x > innerWidth * 0.7 && y < 110;
const inTopLeft = (x, y) => x < innerWidth * 0.3 && y < 110;

lock.addEventListener('pointerdown', (e) => {
  if (!pass.hidden && e.target.closest('.pass')) return;
  const x = e.clientX;
  const y = e.clientY;
  p = { x, y, t: performance.now(), dy: 0, moved: false, long: false, panic: false };
  const btn = e.target.closest('.qbtn');
  if (btn && !kp && !isBlack) { p.btn = btn; p.btnTimer = setTimeout(() => btn.classList.add('down'), 350); }

  // Panik: hold øverst til venstre
  if (inTopLeft(x, y)) p.panicTimer = setTimeout(() => { p.panic = true; realTime(); }, 1000);

  // Langt tryk på uret (eller hvor som helst på sort skærm)
  if (!kp && S.press !== 'off') {
    const r = clockEl.getBoundingClientRect();
    const onClock = x >= r.left - 10 && x <= r.right + 10 && y >= r.top - 10 && y <= r.bottom + 10;
    if (onClock || (isBlack && !inTopLeft(x, y) && !inTopRight(x, y))) {
      p.longTimer = setTimeout(() => { p.long = true; onLongPress(); }, 550);
    }
  }
});

function onLongPress() {
  if (S.press === 'keypad') armKeypad();
  else if (S.press === 'preset') {
    const [h, m] = S.presetTime.split(':').map(Number);
    if (h >= 0 && m >= 0) applySecret(h, m);
  } else if (S.press === 'real') { realTime(); confirmBlink(); }
}

lock.addEventListener('pointermove', (e) => {
  if (!p) return;
  const dx = e.clientX - p.x;
  const dy = e.clientY - p.y;
  if (Math.hypot(dx, dy) > 12) {
    p.moved = true;
    clearTimeout(p.longTimer); clearTimeout(p.panicTimer); clearTimeout(p.btnTimer);
  }
  p.dy = dy;
  // Stryg op: indholdet følger fingeren som på iOS
  if (pass.hidden && !isBlack && !kp && dy < 0 && p.moved) {
    const k = S.passcode ? 1 : 0.35;
    content.style.transition = 'none';
    content.style.transform = `translateY(${dy * 0.6 * k}px)`;
    content.style.opacity = String(Math.max(0, 1 + (dy * k) / 260));
  }
});

function endPointer(e) {
  if (!p) return;
  const cur = p;
  p = null;
  clearTimeout(cur.longTimer); clearTimeout(cur.panicTimer); clearTimeout(cur.btnTimer);
  if (cur.btn) cur.btn.classList.remove('down');
  if (cur.panic || cur.long) return;
  if (e.type === 'pointercancel') { springBack(); return; }

  const x = cur.x;
  const y = cur.y;

  if (cur.moved) {
    if (pass.hidden && !isBlack && !kp && cur.dy < -90 && S.passcode) { content.style.transform = ''; content.style.opacity = ''; openPass(); return; }
    if (!pass.hidden && cur.dy > 90) { closePass(); return; }
    springBack();
    return;
  }

  // ---- tryk ----
  if (kp) { kpKey(x, y); return; }

  if (inTopRight(x, y)) {
    const t = performance.now();
    cornerTaps = cornerTaps.filter((v) => t - v < 2500);
    cornerTaps.push(t);
    if (cornerTaps.length >= 5) { cornerTaps = []; openPanel(); }
    return;
  }

  if (isBlack) { wake(); return; }
  if (!pass.hidden) return;

  if (inNote(x, y)) {
    const t = performance.now();
    if (t - lastNoteTap < 350) { lastNoteTap = 0; hideNote(); } else lastNoteTap = t;
    return;
  }

  if (inRollZone(x, y)) { rollTap(); return; }

  if (S.sleep) {
    const t = performance.now();
    if (t - lastTap < 320) { lastTap = 0; sleep(); return; }
    lastTap = t;
  }
}
function springBack() {
  content.style.transition = 'transform .35s cubic-bezier(.2,.9,.3,1.2), opacity .3s';
  content.style.transform = '';
  content.style.opacity = '';
}
lock.addEventListener('pointerup', endPointer);
lock.addEventListener('pointercancel', endPointer);
lock.addEventListener('contextmenu', (e) => e.preventDefault());

/* ================= panel ================= */

let openedAt = 0;
let planDirty = false;
let activeTab = 'time';

function openPanel() {
  kp = null;
  openedAt = performance.now();
  planDirty = false;
  panel.classList.remove('out');
  panel.hidden = false;
  syncPanel();
  renderDiag();
}
function closePanel() {
  // Færdig starter planen, hvis den er ændret – eller hvis den er løbet ud (fx efter den hemmelige knap)
  if (planDirty || (!S.anchor && !S.pending && S.plan.kind !== 'real')) {
    if (S.plan.kind === 'real') { S.anchor = null; S.pending = null; } else startPlan(S.plan, 'now');
  }
  save();
  panel.classList.add('out');
  setTimeout(() => { panel.hidden = true; panel.classList.remove('out'); }, 190);
  render();
}
$('#pDone').addEventListener('click', () => { if (performance.now() - openedAt > 900) closePanel(); });

const get = (path) => path.split('.').reduce((o, k) => o?.[k], S);
function set(path, v) {
  const ks = path.split('.');
  const last = ks.pop();
  const o = ks.reduce((a, k) => a[k], S);
  o[last] = v;
  if (path.startsWith('plan.')) planDirty = true;
  save();
  applyLook();
  syncPanel();
}

const OFFSETS = [-60, -30, -15, -10, -5, -2, -1, 1, 2, 5, 10, 15, 30, 60];
const FIXED = ['09:00', '12:00', '13:37', '17:00', '00:00', '23:59'];
const DURS = [1, 2, 5, 10, 15, 30, 60];
const COLORS = ['#ffffff', '#f2f2f7', '#ffd60a', '#ff9f0a', '#ff6482', '#64d2ff', '#30d158', '#bf5af2', '#000000'];
const BEH_TXT = {
  keep: 'Uret går videre som normalt, bare forskudt',
  freeze: 'Uret står stille på tidspunktet',
  wait: 'Står stille, til den rigtige tid indhenter det',
  glide: 'Går langsommere/hurtigere, til det passer igen',
  jump: 'Viser den falske tid et stykke tid, så rigtig tid',
};

function buildPanel() {
  $('#offChips').innerHTML = OFFSETS.map((m) => `<button type="button" data-off="${m}" class="${m < 0 ? 'neg' : ''}">${m > 0 ? '+' : '−'}${Math.abs(m)}</button>`).join('');
  $('#fixChips').innerHTML = FIXED.map((t) => `<button type="button" data-fix="${t}">${t.replace(':', '.')}</button>`).join('');
  const radios = Object.keys(BEHAVIORS).map((k) => `<button type="button" data-v="${k}">${BEHAVIORS[k]}<small>${BEH_TXT[k]}</small></button>`).join('');
  $('#behRadios').innerHTML = radios;
  $('#secBehRadios').innerHTML = radios;
  const durs = DURS.map((d) => `<button type="button" data-v="${d}">${d} min</button>`).join('');
  $('#durChips').innerHTML = durs;
  $('#secDurChips').innerHTML = durs;
  $('#colors').innerHTML = COLORS.map((c) => `<button type="button" data-color="${c}" style="background:${c}"></button>`).join('')
    + '<label title="Egen farve"><input type="color" id="colorPick" /></label>';
  $('#ver').textContent = `ClockPlus ${VERSION}`;
}

function showMatch(expr) {
  const neg = expr.includes('!=');
  const [path, vals] = expr.split(neg ? '!=' : '=');
  const v = String(get(path));
  const hit = vals.split('|').includes(v);
  return neg ? !hit : hit;
}

function syncPanel() {
  if (panel.hidden) return;
  renderLinkPanel();
  $$('[data-s]', panel).forEach((el) => {
    const v = get(el.dataset.s);
    if (el.type === 'checkbox') el.checked = el.dataset.on ? v === el.dataset.on : !!v;
    else if (document.activeElement !== el) el.value = v;
  });
  $$('[data-seg]', panel).forEach((seg) => {
    const v = String(get(seg.dataset.seg));
    $$(':scope > button', seg).forEach((b) => b.classList.toggle('on', b.dataset.v === v));
  });
  $$('[data-show]', panel).forEach((el) => { el.hidden = !showMatch(el.dataset.show); });
  $$('[data-off]', panel).forEach((b) => b.classList.toggle('on', S.plan.kind === 'offset' && +b.dataset.off === +S.plan.offsetMin));
  $$('[data-fix]', panel).forEach((b) => b.classList.toggle('on', S.plan.kind === 'fixed' && b.dataset.fix === S.plan.fixed));
  $$('[data-color]', panel).forEach((b) => b.classList.toggle('on', b.dataset.color.toLowerCase() === S.color.toLowerCase()));
  $('#durLbl').textContent = S.plan.behavior === 'jump' ? 'Spring efter' : S.plan.behavior === 'wait' ? 'Hvis den er bagud: glid over' : 'Over hvor lang tid';
  $('#behHint').textContent = behaviorHint();
  $$('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === activeTab));
  $$('.pane', panel).forEach((el) => { el.hidden = el.dataset.pane !== activeTab; });
  renderStatus(Date.now());
}

function behaviorHint() {
  const pl = S.plan;
  if (pl.kind === 'offset' && pl.behavior === 'wait' && pl.offsetMin < 0) return 'Uret er bagud og kan ikke vente – det glider i stedet.';
  if (pl.kind === 'offset' && pl.behavior === 'glide' && pl.offsetMin) {
    const rate = 1 - pl.offsetMin / pl.durMin;
    return `Uret går med ${Math.round(rate * 100)} % fart i ${pl.durMin} min.${rate <= 0 ? ' (står stille/baglæns – vælg længere tid)' : ''}`;
  }
  return '';
}

function renderStatus(now) {
  // Viser hvad låseskærmen vil vise, når panelet lukkes
  const a = planDirty ? (S.plan.kind === 'real' ? null : makeAnchor(S.plan, now)) : S.anchor;
  const shown = shownTime(a, now);
  $('#pShown').textContent = formatClock(shown, fmt());
  $('#pReal').textContent = formatClock(now, fmt());
  const off = offsetAt(a, now);
  const fake = Math.abs(off) >= 1000 || a?.behavior === 'freeze';
  const badge = $('#pBadge');
  badge.className = `p-badge${S.pending ? ' wait' : fake ? ' fake' : ''}`;
  badge.textContent = S.pending ? 'VENTER PÅ VÆKNING' : fake ? 'FALSK TID' : 'RIGTIG TID';
  let desc = describeAnchor(a, now);
  if (planDirty) desc += ' · starter ved Færdig';
  if (S.pending) desc += ` · næste vækning: ${S.pending.fixed?.replace(':', '.')}`;
  $('#pDesc').textContent = desc;
}

panel.addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.closest('.tabs')) { activeTab = t.dataset.tab; syncPanel(); panel.scrollTop = 0; return; }
  const seg = t.closest('[data-seg]');
  if (seg && t.dataset.v != null) {
    const cur = get(seg.dataset.seg);
    const v = typeof cur === 'number' ? Number(t.dataset.v) : t.dataset.v;
    set(seg.dataset.seg, v);
    return;
  }
  if (t.dataset.off) { S.plan.kind = 'offset'; set('plan.offsetMin', Number(t.dataset.off)); return; }
  if (t.dataset.fix) { set('plan.fixed', t.dataset.fix); return; }
  if (t.dataset.step) { set('plan.offsetMin', (Number(S.plan.offsetMin) || 0) + Number(t.dataset.step)); return; }
  if (t.dataset.color) { set('color', t.dataset.color); return; }
  if (t.id === 'panic') { realTime(); planDirty = false; syncPanel(); return; }
  if (t.id === 'resetAll') {
    if (!confirm('Nulstil alle indstillinger? (baggrunden beholdes)')) return;
    S = merge(DEFAULTS, {});
    planDirty = false;
    save(); applyLook(); syncPanel();
    return;
  }
  if (t.id === 'rollShow') {
    const rz = $('#rollzone');
    closePanel();
    rz.classList.add('show');
    setTimeout(() => rz.classList.remove('show'), 2000);
    return;
  }
  if (t.id === 'gHide') { hideNote(); return; }
  if (t.id === 'wallClear') { putFile('wallpaper', null).then(loadWall); }
});

panel.addEventListener('input', (e) => {
  const el = e.target;
  if (el.id === 'colorPick') { set('color', el.value); return; }
  if (!el.dataset.s || el.type === 'checkbox') return;
  const cur = get(el.dataset.s);
  if (typeof cur === 'number') { if (el.value !== '' && !Number.isNaN(+el.value)) set(el.dataset.s, Number(el.value)); } else if (el.value || el.type === 'text') set(el.dataset.s, el.value);
});
panel.addEventListener('change', (e) => {
  const el = e.target;
  if (el.type === 'checkbox' && el.dataset.s) {
    set(el.dataset.s, el.dataset.on ? (el.checked ? el.dataset.on : el.dataset.off) : el.checked);
  }
});

$('#wallFile').addEventListener('change', async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  try { await putFile('wallpaper', await shrink(f)); } catch { await putFile('wallpaper', f); }
  e.target.value = '';
  await loadWall();
});

// Store billeder skaleres ned (maks. 2800 px), så de loader hurtigt.
async function shrink(file) {
  const bmp = await createImageBitmap(file);
  const max = 2800;
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  if (k === 1 && file.size < 4e6) return file;
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise((res) => c.toBlob((b) => res(b || file), 'image/jpeg', 0.92));
}

/* ================= fuld højde fra hjemmeskærmen ================= */
// Fra hjemmeskærmen (standalone, black-translucent) bliver siden ca. 59 pt for lav,
// og iOS melder det ikke altid via innerHeight. Derfor får alle lag altid
// skærmens fulde højde i px, når appen kører standalone i portræt.

const isStandalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
let heightFixed = false;
function fixHeight() {
  const fix = isStandalone() && innerHeight > innerWidth && screen.height >= innerHeight;
  heightFixed = fix;
  for (const el of [document.body, lock, panel]) {
    el.style.height = fix ? `${screen.height}px` : '';
    el.style.bottom = fix ? 'auto' : '';
  }
  document.documentElement.style.height = fix ? `${screen.height}px` : '';
  renderDiag();
}
function renderDiag() {
  const el = $('#diag');
  if (!el) return;
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)';
  document.body.append(probe);
  const cs = getComputedStyle(probe);
  const sa = `${parseFloat(cs.paddingTop)}/${parseFloat(cs.paddingBottom)}`;
  probe.remove();
  el.textContent = `skærm ${screen.width}×${screen.height} · inner ${innerWidth}×${innerHeight} · app ${lock.clientHeight} · safe-area ${sa} · standalone ${isStandalone() ? 'ja' : 'nej'} · rettelse ${heightFixed ? 'TIL' : 'fra'}`;
}
fixHeight();
for (const ev of ['resize', 'orientationchange', 'pageshow']) addEventListener(ev, fixHeight);
document.addEventListener('visibilitychange', fixHeight);
for (const ms of [100, 400, 1000, 2500]) setTimeout(fixHeight, ms);

/* ================= forbindelse + Google-fodnote ================= */
// Relæet (src/link.js, uændret kopi fra Stopwatchplus). Fake Google skriver
// google: { q, at } og googleLive: { q, at } til rummet. Uden rumkode: intet sker.

const gnoteEl = $('#gnote');
const LINK_TEXT = { off: 'Ingen kode', connecting: 'Forbinder …', online: 'Forbundet', offline: 'Offline' };
let link = null;
let linkStatus = 'off';
let lastNoteTap = 0;
let lastNote = null;
const gOpts = () => ({ live: S.gLive, hideMin: S.gHideMin });

function placeNote() {
  const under = S.gPos === 'under';
  if (under && gnoteEl.parentElement !== content) content.append(gnoteEl);
  if (!under && gnoteEl.parentElement !== lock) $('#rollzone').after(gnoteEl);
  gnoteEl.className = `gnote pos-${S.gPos}`;
  gnoteEl.style.fontSize = `${S.gSize}px`;
  gnoteEl.style.opacity = String(S.gOpacity / 100);
  gnoteEl.style.fontFamily = S.gFont === 'clock' ? getComputedStyle(clockText).fontFamily : '';
  lastNote = null;
  renderNote(Date.now());
}

function renderNote(now) {
  const w = S.gNote ? visibleWord(S.gMem, gOpts(), now) : '';
  if (w === lastNote) return;
  lastNote = w;
  gnoteEl.textContent = w;
  gnoteEl.hidden = !w;
  if (!panel.hidden) renderLinkPanel();
}

function inNote(x, y) {
  if (gnoteEl.hidden) return false;
  const r = gnoteEl.getBoundingClientRect();
  return x >= r.left - 24 && x <= r.right + 24 && y >= r.top - 16 && y <= r.bottom + 16;
}

function hideNote() {
  if (S.gMem.word) { S.gMem.word.hidden = true; save(); }
  renderNote(Date.now());
}

function onLinkState(state) {
  if (takeGoogle(S.gMem, state, gOpts(), Date.now())) {
    save();
    renderNote(Date.now());
    if (!panel.hidden) renderLinkPanel();
  }
}

function startLink() {
  if (link) link.close();
  link = null;
  linkStatus = 'off';
  if (S.room.length >= 3) {
    link = createLink({
      room: S.room,
      storeKey: 'clockplus-link',
      onState: onLinkState,
      onStatus: (st) => { linkStatus = st; if (!panel.hidden) renderLinkPanel(); },
    });
    linkStatus = link.status;
  }
  if (!panel.hidden) renderLinkPanel();
}

function setRoom(value) {
  const room = cleanRoom(value);
  $('#room').value = room;
  if (room === S.room) return;
  S.room = room;
  resetMem(S.gMem, Date.now()); // kun ord efter skiftet tæller
  save();
  lastNote = null;
  renderNote(Date.now());
  startLink();
}
$('#room').addEventListener('change', (e) => setRoom(e.target.value));
$('#room').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });

function renderLinkPanel() {
  const st = $('#linkStatus');
  st.textContent = LINK_TEXT[linkStatus] || linkStatus;
  st.className = `link-status ${linkStatus}`;
  const room = $('#room');
  if (document.activeElement !== room) room.value = S.room;
  const w = S.gMem.word;
  const el = $('#gLast');
  if (!w) { el.textContent = S.room ? 'Intet nyt ord endnu.' : 'Skriv en rumkode for at modtage ord.'; return; }
  const kl = new Date(w.since).toTimeString().slice(0, 5).replace(':', '.');
  const shown = visibleWord(S.gMem, gOpts(), Date.now());
  const state = !S.gNote ? 'fodnote slået fra' : shown ? 'vises' : w.hidden ? 'skjult' : 'udløbet';
  el.textContent = `Sidste ord: "${w.q}"${w.live ? ' (live)' : ''} kl. ${kl} – ${state}`;
}

/* ================= start ================= */

buildPass();
buildPanel();
applyLook();
loadWall();
if (S.startBlack) sleep();
startLink();
setInterval(render, 250);
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
