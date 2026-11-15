import * as m3 from "./package/index.js";
const seed = process.argv[2] || "#3f5f90";
const hct = m3.Hct.fromInt(m3.argbFromHex(seed));
const tone = (pal, t) => m3.hexFromArgb(pal.tone(t));
const classes = Object.keys(m3).filter(k => /^Scheme/.test(k));
function gen(cls, isDark) {
  const s = new cls(hct, isDark, 0);
  const p = s.primaryPalette, sec = s.secondaryPalette, n = s.neutralPalette, nv = s.neutralVariantPalette, e = s.errorPalette;
  return isDark ? {
    background: tone(n,6), "surface-container-low": tone(n,10), "surface-container": tone(n,12),
    "surface-container-high": tone(n,17), "surface-container-highest": tone(n,22), "on-surface": tone(n,90),
    "on-surface-variant": tone(nv,80), outline: tone(nv,60), "outline-variant": tone(nv,30),
    primary: tone(p,80), "on-primary": tone(p,20), "primary-container": tone(p,30), "on-primary-container": tone(p,90),
    secondary: tone(sec,80), "secondary-container": tone(sec,30), "on-secondary-container": tone(sec,90),
    error: tone(e,80), "on-error": tone(e,20) } : {
    background: tone(n,98), "surface-container-low": tone(n,96), "surface-container": tone(n,94),
    "surface-container-high": tone(n,92), "surface-container-highest": tone(n,90), "on-surface": tone(n,10),
    "on-surface-variant": tone(nv,30), outline: tone(nv,50), "outline-variant": tone(nv,85),
    primary: tone(p,40), "on-primary": tone(p,100), "primary-container": tone(p,90), "on-primary-container": tone(p,10),
    secondary: tone(sec,40), "secondary-container": tone(sec,90), "on-secondary-container": tone(sec,10),
    error: tone(e,40), "on-error": tone(e,100) };
}
const target = { background:'#faf9fd', 'surface-container-low':'#f4f3f7', 'surface-container':'#eeedf1', 'surface-container-high':'#e9e7eb', 'surface-container-highest':'#e3e2e6', 'on-surface':'#1b1b1f', 'on-surface-variant':'#46464f', outline:'#777680', 'outline-variant':'#c7c5d0', primary:'#3f5f90', 'on-primary':'#ffffff', 'primary-container':'#d7e2ff', 'on-primary-container':'#001b3c', secondary:'#545f71', 'secondary-container':'#d8e3f8', 'on-secondary-container':'#111c2b', error:'#ba1a1a', 'on-error':'#ffffff' };
const out = {};
for (const c of classes) {
  try {
    const light = gen(m3[c], false);
    let hits = 0; for (const k of Object.keys(target)) if (light[k] === target[k]) hits++;
    out[c] = { hits, total: Object.keys(target).length };
    if (hits >= 6) out[c].light = light;
  } catch (e) { out[c] = { err: String(e).slice(0,60) }; }
}
for (const c of ['SchemeTonalSpot','SchemeVibrant','SchemeContent','SchemeMonochrome','SchemeNeutral','SchemeExpressive','SchemeFidelity','SchemeRainbow','SchemeFruitSalad']) {
  if (!m3[c]) continue;
  const light = gen(m3[c], false), dark = gen(m3[c], true);
  let hits = 0, diffs = []; for (const k of Object.keys(target)) { if (light[k] === target[k]) hits++; else diffs.push(k+':'+light[k]+'/'+target[k]); }
  console.log(c, 'hits='+hits+'/'+Object.keys(target).length, diffs.slice(0,4).join(' '));
  if (hits >= 12) console.log('LIGHT', JSON.stringify(light), '\nDARK', JSON.stringify(dark));
}
