import * as m3 from "./package/index.js";
const seed = process.argv[2] || "#3f5f90";
const hct = m3.Hct.fromInt(m3.argbFromHex(seed));
const tone = (pal, t) => m3.hexFromArgb(pal.tone(t));
function gen(isDark) {
  const s = new m3.SchemeVibrant(hct, isDark, 0);
  const p = s.primaryPalette, sec = s.secondaryPalette, n = s.neutralPalette, nv = s.neutralVariantPalette, e = s.errorPalette;
  if (isDark) return {
    background: tone(n,6), surface: tone(n,6), "surface-container-low": tone(n,10), "surface-container": tone(n,12),
    "surface-container-high": tone(n,17), "surface-container-highest": tone(n,22), "on-surface": tone(n,90),
    "on-surface-variant": tone(nv,80), outline: tone(nv,60), "outline-variant": tone(nv,30),
    primary: tone(p,80), "on-primary": tone(p,20), "primary-container": tone(p,30), "on-primary-container": tone(p,90),
    secondary: tone(sec,80), "secondary-container": tone(sec,30), "on-secondary-container": tone(sec,90),
    error: tone(e,80), "on-error": tone(e,20) };
  return {
    background: tone(n,98), surface: tone(n,98), "surface-container-low": tone(n,96), "surface-container": tone(n,94),
    "surface-container-high": tone(n,92), "surface-container-highest": tone(n,90), "on-surface": tone(n,10),
    "on-surface-variant": tone(nv,30), outline: tone(nv,50), "outline-variant": tone(nv,85),
    primary: tone(p,40), "on-primary": tone(p,100), "primary-container": tone(p,90), "on-primary-container": tone(p,10),
    secondary: tone(sec,40), "secondary-container": tone(sec,90), "on-secondary-container": tone(sec,10),
    error: tone(e,40), "on-error": tone(e,100) };
}
console.log(JSON.stringify({ light: gen(false), dark: gen(true) }, null, 1));

