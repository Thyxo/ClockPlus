// iOS 26-glasur: tegner klokken på et <canvas> med "liquid glass"-look
// (lys top, mørkere bund, blød 3D-kant, lys kant foroven og skygge forneden).
//
// To slags tal:
//  - 'tall': iOS 26's høje ur. Tallene tegnes som streger (ikke en skrift), så de kan
//    blive så høje som iOS' tilpassede ur uden at blive forvrænget. Mål taget fra en
//    rigtig iOS 26-låseskærm (1179×2556): 4 cifre fylder ca. 86 % af bredden og
//    41 % af højden, stregen er ca. 30 % af et ciffers bredde.
//  - alle andre: en almindelig skrift (fillText) med samme glas-effekt.

/* ---------------- cifre som streger ----------------
   Hvert ciffer tegnes i en kasse D bred × H høj med stregbredde w.
   Koordinaterne er stregens midterlinje. */

function digitPath(ctx, ch, D, H, w) {
  const x0 = w / 2;
  const x1 = D - w / 2;
  const r = (x1 - x0) / 2;
  const cx = D / 2;
  const t = w / 2; // top (midterlinje)
  const b = H - w / 2; // bund (midterlinje)
  const P = Math.PI;
  ctx.beginPath();
  switch (ch) {
    case '0':
      ctx.moveTo(x0, b - r);
      ctx.lineTo(x0, t + r);
      ctx.arc(cx, t + r, r, P, 0);
      ctx.lineTo(x1, b - r);
      ctx.arc(cx, b - r, r, 0, P);
      ctx.closePath();
      break;
    case '1': {
      const sx = D - w / 2;
      ctx.moveTo(D * 0.06, t + H * 0.11);
      ctx.lineTo(sx, t);
      ctx.lineTo(sx, H);
      break;
    }
    case '2':
      ctx.moveTo(x0, t + r + H * 0.1);
      ctx.lineTo(x0, t + r);
      ctx.arc(cx, t + r, r, P, 0);
      ctx.lineTo(x1, t + r + H * 0.12);
      ctx.lineTo(x0, b - w * 0.1);
      ctx.lineTo(x0, b);
      ctx.lineTo(D, b);
      break;
    case '3': {
      const m = H * 0.47;
      ctx.moveTo(x0, t + r + H * 0.08);
      ctx.lineTo(x0, t + r);
      ctx.arc(cx, t + r, r, P, 0);
      ctx.lineTo(x1, m - r * 0.6);
      ctx.quadraticCurveTo(x1, m, cx, m);
      ctx.lineTo(cx - r * 0.45, m);
      ctx.moveTo(cx, m);
      ctx.quadraticCurveTo(x1, m, x1, m + r * 0.6);
      ctx.lineTo(x1, b - r);
      ctx.arc(cx, b - r, r, 0, P);
      ctx.lineTo(x0, b - r - H * 0.08);
      break;
    }
    case '4': {
      const y = H * 0.7;
      const sx = x1 - r * 0.15;
      ctx.moveTo(x0 + r * 0.25, 0);
      ctx.lineTo(x0, y);
      ctx.lineTo(D, y);
      ctx.moveTo(sx, H * 0.36);
      ctx.lineTo(sx, H);
      break;
    }
    case '5': {
      const k = H * 0.4;
      ctx.moveTo(D, t);
      ctx.lineTo(x0, t);
      ctx.lineTo(x0, k + r);
      ctx.moveTo(x0, k + r);
      ctx.arc(cx, k + r, r, P, 0);
      ctx.lineTo(x1, b - r);
      ctx.arc(cx, b - r, r, 0, P);
      ctx.lineTo(x0, b - r - H * 0.07);
      break;
    }
    case '6': {
      const k = H * 0.42;
      ctx.moveTo(x1, t + r + H * 0.08);
      ctx.lineTo(x1, t + r);
      ctx.arc(cx, t + r, r, 0, P, true);
      ctx.lineTo(x0, b - r);
      ctx.arc(cx, b - r, r, P, 0, true);
      ctx.lineTo(x1, k + r);
      ctx.arc(cx, k + r, r, 0, P, true);
      ctx.lineTo(x0, k + r + w * 0.2);
      break;
    }
    case '7':
      ctx.moveTo(0, t);
      ctx.lineTo(x1, t);
      ctx.lineTo(x1, t + H * 0.12);
      ctx.lineTo(x0 + r * 0.55, H);
      break;
    case '8': {
      const m = H * 0.46;
      ctx.moveTo(x0, m - r);
      ctx.lineTo(x0, t + r);
      ctx.arc(cx, t + r, r, P, 0);
      ctx.lineTo(x1, m - r);
      ctx.arc(cx, m - r, r, 0, P);
      ctx.closePath();
      ctx.moveTo(x0, b - r);
      ctx.lineTo(x0, m + r);
      ctx.arc(cx, m + r, r, P, 0);
      ctx.lineTo(x1, b - r);
      ctx.arc(cx, b - r, r, 0, P);
      ctx.closePath();
      break;
    }
    case '9': {
      // 6 drejet 180°
      ctx.save();
      ctx.translate(D, H);
      ctx.rotate(P);
      digitPath(ctx, '6', D, H, w);
      ctx.restore();
      return;
    }
    default:
      break;
  }
}

const ADV = { 1: 0.62 }; // bredde af et ciffer i forhold til D
const GAP = 0.2; // luft mellem cifre i forhold til D

/** Layout for det høje ur: returnerer bredde i enheder af D */
function tallLayout(text, D, w) {
  const gap = D * GAP;
  const items = [];
  let x = 0;
  for (const ch of text) {
    if (ch === '.' || ch === ':') {
      const sw = w * 1.15;
      items.push({ ch, x: x - gap * 0.2, wd: sw });
      x += sw + gap * 0.6;
    } else {
      const wd = D * (ADV[ch] || 1);
      items.push({ ch, x, wd });
      x += wd + gap;
    }
  }
  return { items, width: x - gap };
}

function drawTall(ctx, text, W, H, w, D) {
  const { items, width } = tallLayout(text, D, w);
  const ox = (W - width) / 2;
  ctx.lineWidth = w;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 3;
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';
  for (const it of items) {
    ctx.save();
    ctx.translate(ox + it.x, 0);
    if (it.ch === '.' || it.ch === ':') {
      const s = w * 1.1;
      const rr = s * 0.28;
      const dot = (y) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(0, y, s, s, rr) : ctx.rect(0, y, s, s); ctx.fill(); };
      if (it.ch === ':') { dot(H * 0.3); dot(H * 0.62); } else dot(H - s);
    } else {
      // '1' er smallere: tegn i sin egen kasse
      const Dw = it.wd;
      ctx.save();
      // klip til kassen, så butt-ender og spidser ikke stikker ud
      ctx.beginPath();
      ctx.rect(-w, 0, Dw + 2 * w, H);
      ctx.clip();
      digitPath(ctx, it.ch, it.ch === '1' ? Dw : D, H, w);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
}

/* ---------------- glas-effekt ---------------- */

const mk = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};

// Blød sløring ved at skalere ned og op (virker også i Safari uden ctx.filter)
function blurred(src, radius) {
  const k = Math.max(1, radius / 2);
  const small = mk(src.width / k, src.height / k);
  const s = small.getContext('2d');
  s.imageSmoothingQuality = 'high';
  s.drawImage(src, 0, 0, small.width, small.height);
  const small2 = mk(small.width / 2, small.height / 2);
  small2.getContext('2d').drawImage(small, 0, 0, small2.width, small2.height);
  const out = mk(src.width, src.height);
  const o = out.getContext('2d');
  o.imageSmoothingQuality = 'high';
  o.drawImage(small2, 0, 0, out.width, out.height);
  return out;
}

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return [170, 185, 222];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/**
 * Tegn klokken på canvas.
 * @param {HTMLCanvasElement} canvas  (størrelse sættes her)
 * @param {object} o
 *   text, cssW, cssH, dpr, mode: 'tall' | 'font', font (css font-streng i enhedspixels til 'font'),
 *   tint: [r,g,b] glassets farve, glass: bool (false = flad hvid farve tint)
 *   stroke: stregbredde i forhold til ciffer-bredde (tall)
 */
export function renderClock(canvas, o) {
  const dpr = o.dpr || 1;
  const W = Math.round(o.cssW * dpr);
  const H = Math.round(o.cssH * dpr);
  canvas.width = W;
  canvas.height = H;
  canvas.style.width = `${o.cssW}px`;
  canvas.style.height = `${o.cssH}px`;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  if (!W || !H) return;

  // Plads til skygge omkring tallene
  const pad = Math.round(6 * dpr);
  const M = mk(W, H);
  const m = M.getContext('2d');
  let w; // stregbredde i px (til kant-effekter)
  if (o.mode === 'tall') {
    const innerH = H - 2 * pad;
    // D ud fra bredden: 4 cifre ≈ 4,4 D
    const n = [...o.text].filter((c) => /\d/.test(c)).length || 4;
    const ones = [...o.text].filter((c) => c === '1').length;
    const seps = [...o.text].filter((c) => c === '.' || c === ':').length;
    const ratio = o.stroke || 0.29;
    // bredde = D*(n - ones*(1-0.62)) + gap*(n-1) + sep; iOS: 4 cifre ≈ 86 % af skærmen
    const unit = (n - ones * 0.38) + GAP * (n - 1) + seps * (ratio * 1.15 + GAP * 0.4);
    const D = Math.min((W * (o.widthFrac || 0.86)) / unit, innerH / 2.6);
    w = D * ratio;
    m.save();
    m.translate(0, pad);
    drawTall(m, o.text, W, innerH, w, D);
    m.restore();
  } else {
    m.fillStyle = '#fff';
    m.font = o.font;
    m.textAlign = 'center';
    m.textBaseline = 'alphabetic';
    const met = m.measureText(o.text);
    const asc = met.actualBoundingBoxAscent || H * 0.7;
    const desc = met.actualBoundingBoxDescent || 0;
    const y = (H + asc - desc) / 2;
    m.fillText(o.text, W / 2, y);
    w = Math.max(4 * dpr, (asc + desc) * 0.12);
  }

  const tint = o.tint || [170, 185, 222];
  if (!o.glass) {
    // Almindelig farvet tekst (samme form)
    const C = mk(W, H);
    const c = C.getContext('2d');
    c.fillStyle = css(tint);
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'destination-in';
    c.drawImage(M, 0, 0);
    ctx.drawImage(C, 0, 0);
    return;
  }

  // 1) Glaskrop: lodret gradient, lys foroven, mørkere forneden
  const C = mk(W, H);
  const c = C.getContext('2d');
  const top = mix(tint, [255, 255, 255], 0.22);
  const midc = tint;
  const bot = mix(tint, [30, 48, 92], 0.5);
  const g = c.createLinearGradient(0, pad, 0, H - pad);
  g.addColorStop(0, css(top, 0.95));
  g.addColorStop(0.4, css(midc, 0.92));
  g.addColorStop(1, css(bot, 0.9));
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'destination-in';
  c.drawImage(M, 0, 0);

  // 2) Blød 3D-kant: mørkere langs kanterne, lysere i midten af stregen
  const B = blurred(M, w * 0.55);
  const E = mk(W, H);
  const e = E.getContext('2d');
  e.drawImage(M, 0, 0);
  e.globalCompositeOperation = 'destination-out';
  e.drawImage(B, 0, 0);
  e.globalCompositeOperation = 'source-in';
  e.fillStyle = css(mix(tint, [25, 35, 75], 0.7), 0.85);
  e.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'source-atop';
  c.drawImage(E, 0, 0);

  // 3) Lys kant foroven/til venstre og mørk kant forneden/til højre
  const edge = (dx, dy, color) => {
    const T = mk(W, H);
    const t = T.getContext('2d');
    t.drawImage(M, 0, 0);
    t.globalCompositeOperation = 'destination-out';
    t.drawImage(M, dx, dy);
    t.globalCompositeOperation = 'source-in';
    t.fillStyle = color;
    t.fillRect(0, 0, W, H);
    return blurred(T, 1.2 * dpr);
  };
  c.drawImage(edge(0.8 * dpr, 2.2 * dpr, 'rgba(255,255,255,0.95)'), 0, 0);
  c.drawImage(edge(-0.6 * dpr, -2 * dpr, css(mix(tint, [10, 20, 50], 0.75), 0.7)), 0, 0);

  // 4) Svag glans i den øverste del
  const sh = c.createLinearGradient(0, pad, 0, H * 0.55);
  sh.addColorStop(0, 'rgba(255,255,255,0.16)');
  sh.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = sh;
  c.fillRect(0, 0, W, H);

  // 5) Svag skygge under glasset
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.16)';
  ctx.shadowBlur = 10 * dpr;
  ctx.shadowOffsetY = 2 * dpr;
  ctx.drawImage(C, 0, 0);
  ctx.restore();
}

export { hexToRgb, mix };
