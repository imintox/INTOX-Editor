// INTOX editor. Loaded as a separate file so the page's security policy can allow only scripts from this site.
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (t, a = {}, ...c) => {
  const e = document.createElement(t);
  for (const [k, v] of Object.entries(a)) {
    if (k === 'class') e.className = v;
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  c.flat().forEach(x => e.append(x && x.nodeType ? x : document.createTextNode(x == null ? '' : x)));
  return e;
};

/* ---------- colour helpers ---------- */
const hex6 = h => {
  h = String(h).trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(h)) h = '#' + [...h.slice(1)].map(c => c + c).join('');
  return /^#[0-9a-f]{6}$/.test(h) ? h : null;
};
const parseColor = v => {
  v = String(v == null ? '' : v).trim().toLowerCase();
  let m; const h = hex6(v);
  if (h) return { r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16), a: 1 };
  if ((m = /^#([0-9a-f]{8})$/.exec(v))) { const n = m[1]; return { r: parseInt(n.slice(0, 2), 16), g: parseInt(n.slice(2, 4), 16), b: parseInt(n.slice(4, 6), 16), a: +(parseInt(n.slice(6, 8), 16) / 255).toFixed(2) }; }
  if ((m = /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*(?:[,/]\s*([\d.]+)(%?))?\s*\)$/.exec(v))) {
    let a = m[4] === undefined ? 1 : parseFloat(m[4]); if (m[5]) a /= 100;
    return { r: +m[1], g: +m[2], b: +m[3], a: Math.min(1, Math.max(0, a)) };
  }
  return null;
};
const toRgba = c => `rgba(${c.r}, ${c.g}, ${c.b}, ${+c.a.toFixed(2)})`;
const toHex = c => '#' + [c.r, c.g, c.b].map(n => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')).join('');

/* ---------- settings model ---------- */
const FIT = [['contain', 'Contain: whole image always visible'], ['cover', 'Cover: fills the window, edges crop'], ['auto', 'Original size'], ['100% 100%', 'Stretch (distorts the image)']];
const POS = ['center', 'top', 'bottom', 'left', 'right', 'top left', 'top right', 'bottom left', 'bottom right'].map(x => [x, x]);
const EASE = [['cubic-bezier(0.2, 0, 0, 1)', 'Smooth (default)'], ['ease-in-out', 'Ease in-out'], ['linear', 'Linear'], ['cubic-bezier(0.34, 1.56, 0.64, 1)', 'Springy']];

const THEMES = {
  ash: { label: 'Ash (Dark)', sel: ':is(.theme-dark, .theme-light .theme-dark)', d: { '--background-shading': 'rgba(0, 0, 0, 0.86)', '--card-shading': 'rgba(255, 255, 255, 0.03)', '--popout-shading': 'rgba(10, 10, 12, 0.94)', '--modal-shading': 'rgba(8, 8, 10, 0.92)', '--input-shading': 'rgba(255, 255, 255, 0.05)', '--normal-text': '#e4e4e8', '--muted-text': '#8e8e98' } },
  dark: { label: 'Dark', sel: ':is(.theme-darker, .theme-light .theme-darker)', d: { '--background-shading': 'rgba(0, 0, 0, 0.92)', '--card-shading': 'rgba(255, 255, 255, 0.03)', '--popout-shading': 'rgba(6, 6, 8, 0.95)', '--modal-shading': 'rgba(6, 6, 8, 0.94)', '--input-shading': 'rgba(255, 255, 255, 0.05)', '--normal-text': '#f0f0f3', '--muted-text': '#80808a' } },
  onyx: { label: 'Onyx', sel: ':is(.theme-midnight, .theme-light .theme-midnight)', d: { '--background-shading': 'rgba(0, 0, 0, 0.97)', '--card-shading': 'rgba(255, 255, 255, 0.02)', '--popout-shading': 'rgba(0, 0, 0, 0.96)', '--modal-shading': 'rgba(0, 0, 0, 0.96)', '--input-shading': 'rgba(255, 255, 255, 0.05)', '--normal-text': '#f4f4f6', '--muted-text': '#787882' } }
};
const THEME_ITEMS = [
  { k: '--background-shading', label: 'App tint over the background', t: 'rgba', theme: 1 },
  { k: '--card-shading', label: 'Cards and side panels', t: 'rgba', theme: 1 },
  { k: '--popout-shading', label: 'Popouts and menus', t: 'rgba', theme: 1 },
  { k: '--modal-shading', label: 'Windows and settings', t: 'rgba', theme: 1 },
  { k: '--input-shading', label: 'Inputs', t: 'rgba', theme: 1 },
  { k: '--normal-text', label: 'Text color', t: 'color', theme: 1 },
  { k: '--muted-text', label: 'Muted text color', t: 'color', theme: 1 }
];
THEME_ITEMS.forEach(i => { i.d = null; });

const ANIMS = [['intox-rise', 'Rise'], ['intox-fade', 'Fade'], ['intox-pop', 'Pop'], ['intox-slide', 'Slide in'], ['intox-drop', 'Drop down'], ['none', 'None']];
const BG_ANIMS = [['none', 'None'], ['intox-drift', 'Slow drift'], ['intox-breathe', 'Breathe']];
const FEATURES = ['hover-servers', 'hover-channels', 'hover-avatars', 'hide-nitro', 'hide-shop', 'hide-quests', 'no-glow', 'vignette', 'selection'];
const SECTIONS = [
  { id: 'accent', title: 'Accent colors', open: true, items: [
    { b: 1, k: '--main-color', label: 'Main color', t: 'color', d: '#4a6cf7' },
    { k: '--hover-color', label: 'Hover color', t: 'color', d: '#3a56d4' },
    { k: '--success-color', label: 'Success color', t: 'color', d: '#43b581' },
    { k: '--danger-color', label: 'Danger color', t: 'color', d: '#982929' },
    { k: '--saturation-factor', label: 'Color saturation (everything)', t: 'range', min: 0, max: 2, step: 0.05, unit: '', d: 1 }
  ] },
  { id: 'bg', title: 'App background', open: true, items: [
    { b: 1, k: '--background-image', label: 'Image link or gradient', t: 'image', d: 'url(https://files.catbox.moe/9pvwts.png)' },
    { b: 1, k: '--background-shading', theme: 1, t: 'alpha', label: 'Background darkness' },
    { b: 1, k: '--background-size', label: 'Fit', t: 'select', opts: FIT, d: 'contain' },
    { k: '--background-position', label: 'Position', t: 'select', opts: POS, d: 'center' },
    { k: '--background-attachment', label: 'Attachment', t: 'select', opts: [['fixed', 'Fixed (stays put)'], ['scroll', 'Scroll']], d: 'fixed' },
    { b: 1, k: '--background-fill', label: 'Fill color (shown where the image does not reach)', t: 'color', d: '#000000' },
    { k: '--background-shading-percent', label: 'Shading amount', t: 'range', min: 0, max: 100, step: 1, unit: '%', d: 100 },
    { b: 1, fk: 'blur', label: 'Image blur', t: 'range', min: 0, max: 20, step: 0.5, unit: 'px', d: 0 },
    { fk: 'bright', label: 'Image brightness', t: 'range', min: 20, max: 200, step: 1, unit: '%', d: 100 },
    { fk: 'sat', label: 'Image saturation', t: 'range', min: 0, max: 200, step: 1, unit: '%', d: 100 },
    { fk: 'contrast', label: 'Image contrast', t: 'range', min: 50, max: 200, step: 1, unit: '%', d: 100 }
  ] },
  { id: 'panels', theme: true, items: THEME_ITEMS },
  { id: 'servers', title: 'Server list', items: [
    { b: 1, k: '--intox-server-columns', label: 'Server columns (experimental)', t: 'select', opts: [['1', '1 (normal)'], ['2', '2 columns'], ['3', '3 columns'], ['4', '4 columns']], d: '1', strict: 1 }
  ] },
  { id: 'channels', title: 'Channel colors', items: [
    { k: '--channel-selected-bg', label: 'Selected channel background', t: 'rgba', d: 'rgba(255, 255, 255, 0.08)' },
    { k: '--channel-unread', label: 'Unread channel text', t: 'color', d: '#ffffff' },
    { k: '--channel-unread-hover', label: 'Unread channel hover text', t: 'color', d: '#ffffff' }
  ] },
  { id: 'motion', title: 'Motion and look', items: [
    { b: 1, k: '--intox-speed', label: 'Animation speed (0 turns animations off)', t: 'range', min: 0, max: 500, step: 10, unit: 'ms', d: 160 },
    { k: '--intox-ease', label: 'Animation feel', t: 'select', opts: EASE, d: 'cubic-bezier(0.2, 0, 0, 1)' },
    { b: 1, k: '--intox-radius', label: 'Roundness of menus and windows', t: 'range', min: 0, max: 28, step: 1, unit: 'px', d: 12 },
    { b: 1, k: '--intox-blur', label: 'Glass blur behind menus and windows', t: 'range', min: 0, max: 40, step: 1, unit: 'px', d: 14 },
    { k: '--intox-border', label: 'Menu and window outline', t: 'rgba', d: 'rgba(255, 255, 255, 0.07)' },
    { k: '--intox-scroll', label: 'Scrollbar color', t: 'rgba', d: 'rgba(255, 255, 255, 0.16)' }
  ] },
  { id: 'anim', title: 'Animations', items: [
    { b: 1, k: '--intox-menu-anim', label: 'Menus', t: 'select', opts: ANIMS, d: 'intox-rise', strict: 1 },
    { k: '--intox-toolbar-anim', label: 'Message hover toolbar', t: 'select', opts: ANIMS, d: 'intox-fade', strict: 1 },
    { b: 1, k: '--intox-window-anim', label: 'Windows and settings', t: 'select', opts: ANIMS, d: 'none', strict: 1 },
    { b: 1, k: '--intox-message-anim', label: 'New messages', t: 'select', opts: ANIMS, d: 'none', strict: 1 },
    { b: 1, k: '--intox-bg-anim', label: 'Background motion', t: 'select', opts: BG_ANIMS, d: 'none', strict: 1 },
    { k: '--intox-bg-speed', label: 'Background motion speed (seconds per loop)', t: 'range', min: 10, max: 120, step: 5, unit: 's', d: 40 },
    { b: 1, k: '--intox-hover-servers', label: 'Server icons grow on hover', t: 'toggle', d: '' },
    { b: 1, k: '--intox-hover-channels', label: 'Channel names slide on hover', t: 'toggle', d: '' },
    { b: 1, k: '--intox-hover-avatars', label: 'Chat avatars grow on hover', t: 'toggle', d: '' }
  ] },
  { id: 'clean', title: 'Clean up', items: [
    { b: 1, k: '--intox-hide-nitro', label: 'Hide the Nitro link', t: 'toggle', d: '' },
    { b: 1, k: '--intox-hide-shop', label: 'Hide the Shop link', t: 'toggle', d: '' },
    { b: 1, k: '--intox-hide-quests', label: 'Hide Quests and the quest banner', t: 'toggle', d: '' },
    { b: 1, k: '--intox-no-glow', label: 'Remove glows on unread items', t: 'toggle', d: '' }
  ] },
  { id: 'extras2', title: 'Extras', items: [
    { b: 1, k: '--intox-vignette', label: 'Darker background edges (vignette)', t: 'toggle', d: '' },
    { b: 1, k: '--intox-selection', label: 'Accent-colored text selection', t: 'toggle', d: '' }
  ] },
  { id: 'status', title: 'Status colors', items: [
    { k: '--online-color', label: 'Online', t: 'color', d: '#43b581' },
    { k: '--idle-color', label: 'Idle', t: 'color', d: '#faa61a' },
    { k: '--dnd-color', label: 'Do not disturb', t: 'color', d: '#982929' },
    { k: '--streaming-color', label: 'Streaming', t: 'color', d: '#593695' },
    { k: '--offline-color', label: 'Offline', t: 'color', d: '#808080' }
  ] },
  { id: 'profile', title: 'Profile card backgrounds', items: [
    { k: '--user-popout-size', label: 'Profile popout fit', t: 'select', opts: [['cover', 'Cover'], ['contain', 'Contain']], d: 'cover' },
    { k: '--user-modal-size', label: 'Profile window fit', t: 'select', opts: [['cover', 'Cover'], ['contain', 'Contain']], d: 'cover' }
  ] },
  { id: 'extras', title: 'Fonts and home icon', items: [
    { b: 1, k: '@font-main', label: 'Text font: a Google Fonts name or a font file link', t: 'webfont', d: '', ph: 'Inter, or https://.../font.woff2', list: ['Inter', 'Roboto', 'Poppins', 'Montserrat', 'Nunito', 'Outfit', 'Manrope', 'DM Sans', 'Space Grotesk', 'Lexend', 'Rubik', 'Figtree'] },
    { k: '@font-code', label: 'Code font: a Google Fonts name or a font file link', t: 'webfont', d: '', ph: 'JetBrains Mono', list: ['JetBrains Mono', 'Fira Code', 'Source Code Pro', 'IBM Plex Mono', 'Roboto Mono', 'Space Mono'] },
    { k: '--main-font', label: 'Main font (leave empty for the theme default)', t: 'text', d: '', ph: '"gg sans", "Segoe UI", sans-serif', list: ['"gg sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif', 'Inter, "Segoe UI", system-ui, sans-serif', '"Segoe UI", system-ui, sans-serif', 'Arial, Helvetica, sans-serif', 'Georgia, serif', 'ui-monospace, Consolas, monospace'] },
    { k: '--code-font', label: 'Code font', t: 'text', d: '', ph: 'Consolas, "Liberation Mono", monospace', list: ['Consolas, "Liberation Mono", Menlo, monospace', '"Cascadia Code", Consolas, monospace', '"JetBrains Mono", Consolas, monospace', 'ui-monospace, monospace'] },
    { k: '--home-icon', label: 'Home button icon (image link, leave empty to keep Discord\'s own icon)', t: 'image', d: '' }
  ] }
];
const ACCENTS = [['Blue', '#4a6cf7', '#3a56d4'], ['Mono', '#8a8a96', '#6f6f7a'], ['Red', '#e5484d', '#c93a3f'], ['Green', '#30a46c', '#268a59'], ['Violet', '#8b5cf6', '#7340e0'], ['Amber', '#e09f1f', '#bd8317']];

const allItems = () => SECTIONS.flatMap(s => s.items);
const freshRoot = () => { const o = {}; allItems().forEach(i => { if (i.k && !i.theme) o[i.k] = i.d; }); return o; };
const freshF = () => { const o = {}; allItems().forEach(i => { if (i.fk) o[i.fk] = i.d; }); return o; };
const freshThemes = () => ({ ash: { ...THEMES.ash.d }, dark: { ...THEMES.dark.d }, onyx: { ...THEMES.onyx.d } });
const RATIOS = ['16/9', '21/9', '16/10', '4/3', '1/1'];
const SCENES = ['none', 'menu', 'window'];
const VIEWS = ['home', 'server', 'dm'];
const KEY = 'intox-editor-v1';
let S = { root: freshRoot(), f: freshF(), theme: freshThemes(), cur: 'ash', ratio: '16/9', scene: 'none', view: 'server' };
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (saved) {
    Object.keys(S.root).forEach(k => { if (saved.root && ['string', 'number'].includes(typeof saved.root[k])) S.root[k] = saved.root[k]; });
    Object.keys(S.f).forEach(k => { if (saved.f && typeof saved.f[k] === 'number') S.f[k] = saved.f[k]; });
    Object.keys(S.theme).forEach(t => Object.keys(S.theme[t]).forEach(k => { if (saved.theme && saved.theme[t] && saved.theme[t][k] != null) S.theme[t][k] = saved.theme[t][k]; }));
    // Saved data is only trusted if it matches the known choices exactly.
    if (Object.prototype.hasOwnProperty.call(THEMES, saved.cur)) S.cur = saved.cur;
    if (RATIOS.includes(saved.ratio)) S.ratio = saved.ratio;
    if (SCENES.includes(saved.scene)) S.scene = saved.scene;
    if (VIEWS.includes(saved.view)) S.view = saved.view;
  }
} catch (e) { /* storage may be unavailable */ }
const MODE_KEY = 'intox-editor-mode';
let MODE = 'basic';
try { const m = localStorage.getItem(MODE_KEY); if (m === 'basic' || m === 'advanced') MODE = m; } catch (e) { /* storage unavailable */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };

/* ---------- value helpers ---------- */
const normImage = v => {
  v = String(v).trim();
  if (!v) return '';
  if (v === 'none' || /^url\(/i.test(v) || /-gradient\(/i.test(v)) return v;
  return /[()\s'"\\]/.test(v) ? `url("${v.replace(/\\/g, '%5C').replace(/"/g, '%22')}")` : `url(${v})`;
};
// Output safety: a value may not be able to end its own line or block, start a comment,
// pull in another stylesheet, or leave a bracket/quote open. Anything that does is left out.
const isSafeValue = v => {
  v = String(v);
  if (/[\r\n\u2028\u2029{}]|\/\*|\*\/|@import|<\/?style|expression\(|javascript:/i.test(v)) return false;
  let q = '', depth = 0;
  for (const ch of v) {
    if (q) { if (ch === q) q = ''; continue; }
    if (ch === '"' || ch === "'") { q = ch; continue; }
    if (ch === '(') depth++;
    else if (ch === ')') { depth--; if (depth < 0) return false; }
    else if (ch === ';' && depth === 0) return false;
  }
  return !q && depth === 0;
};
const normFor = (item, v) => {
  if (item.t === 'color') { const c = parseColor(v); return c ? toHex(c) : String(v); }
  if (item.t === 'rgba') { const c = parseColor(v); return c ? toRgba(c) : String(v); }
  if (item.t === 'range') return +v;
  return String(v).replace(/\s+/g, ' ').trim();
};
const fmt = (item, v) => item.t === 'range' ? `${+v}${item.unit || ''}` : v;

/* ---------- web fonts ---------- */
// A web font is either a Google Fonts name, loaded from Fontsource on jsDelivr (a host Vencord already
// allows), or a direct https link to a font file. Both become @font-face rules, which work anywhere in
// QuickCSS (an @import would only work at the very top). Values are checked against strict patterns,
// so nothing else can reach the CSS: no quotes, brackets, spaces or semicolons in links.
const WEBFONT_SLOTS = {
  '@font-main': { family: 'INTOX Text', target: '--main-font', fallback: '"gg sans", "Helvetica Neue", Helvetica, Arial, sans-serif' },
  '@font-code': { family: 'INTOX Code', target: '--code-font', fallback: 'Consolas, "Liberation Mono", Menlo, Courier, monospace' }
};
const FONT_WEIGHTS = [400, 500, 600, 700];
const FONT_FILE = /^https:\/\/[a-z0-9.-]+(?::\d{1,5})?\/[\w.~/%+-]*\.(woff2|woff|ttf|otf)(?:\?[\w.~=&%+-]*)?$/i;
const FONT_NAME = /^[A-Za-z0-9][A-Za-z0-9 ]{0,59}$/;
const FONT_FORMAT = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' };
const FONTSOURCE = 'https://cdn.jsdelivr.net/fontsource/fonts/';
function parseWebFont(v) {
  v = String(v == null ? '' : v).trim();
  if (!v) return null;
  const f = FONT_FILE.exec(v);
  if (f) return { kind: 'file', url: v, format: FONT_FORMAT[f[1].toLowerCase()] };
  const name = v.replace(/\s+/g, ' ');
  if (FONT_NAME.test(name)) return { kind: 'google', name, id: name.toLowerCase().replace(/ /g, '-') };
  return { kind: 'bad' };
}
function faceRules(wf, family) {
  const face = (src, weight) => `@font-face { font-family: "${family}"; src: ${src};${weight ? ` font-weight: ${weight};` : ''} font-display: swap; }`;
  if (wf.kind === 'google') return FONT_WEIGHTS.map(w => face(`url(${FONTSOURCE}${wf.id}@latest/latin-${w}-normal.woff2) format("woff2")`, w));
  if (wf.kind === 'file') return [face(`url(${wf.url}) format("${wf.format}")`)];
  return [];
}
// The web font set for a font variable (--main-font / --code-font), if any.
const webFontFor = target => {
  const e = Object.entries(WEBFONT_SLOTS).find(([, s]) => s.target === target);
  if (!e) return null;
  const wf = parseWebFont(S.root[e[0]]);
  return wf && wf.kind !== 'bad' ? { ...e[1], wf } : null;
};
const fontStack = target => {
  const s = webFontFor(target), own = S.root[target];
  return s ? `"${s.family}", ${own || s.fallback}` : own;
};
const defaultFor = item => item.theme ? THEMES[S.cur].d[item.k] : item.d;

/* ---------- build CSS output ---------- */
let lastN = 0, lastWarn = [];
function buildCSS() {
  const warn = [];
  // One place that writes a declaration, so every value passes the safety check.
  const emit = (k, v) => {
    if (!isSafeValue(v)) { warn.push(k); return null; }
    return `  ${k}: ${v};`;
  };
  const rootLines = [], fontRules = [];
  Object.entries(WEBFONT_SLOTS).forEach(([k, s]) => {
    const wf = parseWebFont(S.root[k]);
    if (!wf || wf.kind === 'bad') return;
    fontRules.push(`/* ${s.family === 'INTOX Text' ? 'Text' : 'Code'} font: ${wf.kind === 'google' ? `${wf.name} (Google Fonts, from jsDelivr)` : 'from a font file link'} */`, ...faceRules(wf, s.family));
  });
  SECTIONS.forEach(sec => {
    if (sec.theme) return;
    sec.items.forEach(i => {
      if (!i.k || i.theme || i.k[0] === '@') return;
      if (webFontFor(i.k)) { const l = emit(i.k, fontStack(i.k)); if (l) rootLines.push(l); return; }
      const v = S.root[i.k];
      if (v === '' || v == null) return;
      if (normFor(i, v) !== normFor(i, i.d)) { const l = emit(i.k, fmt(i, v)); if (l) rootLines.push(l); }
    });
  });
  if (S.root['--home-icon'] && isSafeValue(S.root['--home-icon'])) rootLines.push('  --home-native: none;');
  const F = S.f, D = freshF();
  if (Object.keys(F).some(k => F[k] !== D[k])) {
    const parts = [];
    if (F.blur !== D.blur) parts.push(`blur(${+F.blur}px)`);
    if (F.bright !== D.bright) parts.push(`brightness(${+F.bright}%)`);
    if (F.sat !== D.sat) parts.push(`saturate(${+F.sat}%)`);
    if (F.contrast !== D.contrast) parts.push(`contrast(${+F.contrast}%)`);
    const l = emit('--background-filter', parts.join(' ')); if (l) rootLines.push(l);
  }
  const blocks = [];
  if (fontRules.length) blocks.push(fontRules.join('\n'));
  if (rootLines.length) blocks.push(`:root {\n${rootLines.join('\n')}\n}`);
  let n = rootLines.length; // a web font always adds its --main-font / --code-font line, so it counts once
  Object.keys(THEMES).forEach(tk => {
    const lines = [];
    THEME_ITEMS.forEach(i => {
      const v = S.theme[tk][i.k];
      if (normFor(i, v) !== normFor(i, THEMES[tk].d[i.k])) { const l = emit(i.k, v); if (l) lines.push(l); }
    });
    if (lines.length) { blocks.push(`${THEMES[tk].sel} {\n${lines.join('\n')}\n}`); n += lines.length; }
  });
  const head = '/* INTOX custom settings (made with the INTOX editor) */';
  lastN = n; lastWarn = [...new Set(warn)];
  return blocks.length ? `${head}\n\n${blocks.join('\n\n')}\n` : `${head}\n\n/* No changes yet. This matches the default INTOX look. */\n`;
}

/* ---------- controls ---------- */
let uid = 0;
const controls = [];
const fontNotes = {}; // web font fields: report whether the font loaded in the preview
const acc = item => {
  const o = () => item.theme ? S.theme[S.cur] : item.fk ? S.f : S.root;
  const key = item.k || item.fk;
  return { get: () => o()[key], set: v => { o()[key] = v; } };
};
const darker = hex => { const c = parseColor(hex); if (!c) return null; return toHex({ r: Math.round(c.r * 0.8), g: Math.round(c.g * 0.8), b: Math.round(c.b * 0.8) }); };
const changed = item => {
  if (MODE === 'basic' && item && item.k === '--main-color') {
    const h = darker(S.root['--main-color']);
    if (h) { S.root['--hover-color'] = h; controls.filter(c => c.item.k === '--hover-color').forEach(c => c.set(h)); }
  }
  noteChange();
  if (!item) settle(); // button actions (presets, copy to all...) are always their own step
  save(); render();
  if (item && item.k && item.k.startsWith('--intox')) replay();
};

/* ---------- undo / redo ---------- */
// Tracks the look itself, not which tab, theme preview or window shape is showing.
// Rapid edits (dragging a slider, typing) are grouped into one step.
const LIMIT = 100;
const past = [], future = [];
let committed = null, burst = null;
const snap = () => JSON.stringify({ root: S.root, f: S.f, theme: S.theme });
function updateHistoryButtons() {
  const u = $('#undo'), r = $('#redo');
  if (u) u.disabled = !past.length;
  if (r) r.disabled = !future.length;
}
function settle() {
  if (!burst) return;
  clearTimeout(burst); burst = null;
  const now = snap();
  if (past.length && past[past.length - 1] === now) past.pop(); // ended where it started: not a step
  committed = now;
  updateHistoryButtons();
}
function noteChange() {
  if (!burst) {
    if (committed !== null) { past.push(committed); if (past.length > LIMIT) past.shift(); }
    future.length = 0;
  } else clearTimeout(burst);
  burst = setTimeout(settle, 500);
  updateHistoryButtons();
}
function restore(json) {
  const v = JSON.parse(json);
  S.root = v.root; S.f = v.f; S.theme = v.theme;
  committed = json;
  syncAll(); save(); render(); probeImage(); replay(); updateHistoryButtons();
}
function undo() { settle(); if (!past.length) return; future.push(snap()); restore(past.pop()); }
function redo() { settle(); if (!future.length) return; past.push(snap()); restore(future.pop()); }

function mkControl(item) {
  const id = 'c' + (uid++), a = acc(item);
  const row = el('div', { class: 'row' + (item.b ? ' b' : '') }, el('label', { for: id }, item.label));
  let field;
  if (item.t === 'color') {
    const pick = el('input', { type: 'color', id });
    const txt = el('input', { type: 'text', class: 'mono', spellcheck: 'false', maxlength: '9', 'aria-label': item.label + ' hex' });
    pick.oninput = () => { txt.value = pick.value; txt.classList.remove('bad'); a.set(pick.value); changed(item); };
    txt.oninput = () => {
      const c = parseColor(txt.value);
      if (!c) { txt.classList.add('bad'); return; }
      txt.classList.remove('bad'); pick.value = toHex(c); a.set(txt.value.trim()); changed(item);
    };
    field = el('div', { class: 'field' }, pick, txt);
    controls.push({ item, set: v => { const c = parseColor(v); pick.value = c ? toHex(c) : '#000000'; txt.value = v; txt.classList.remove('bad'); } });
  } else if (item.t === 'rgba') {
    const pick = el('input', { type: 'color', id });
    const txt = el('input', { type: 'text', class: 'mono', spellcheck: 'false', 'aria-label': item.label + ' value' });
    const al = el('input', { type: 'range', min: 0, max: 1, step: 0.01, 'aria-label': item.label + ' opacity' });
    const out = el('span', { class: 'val mono' });
    const pct = c => Math.round(c.a * 100) + '%';
    const fromParts = () => {
      const c = parseColor(pick.value); c.a = +al.value;
      const s = toRgba(c); txt.value = s; out.textContent = pct(c); txt.classList.remove('bad'); a.set(s); changed(item);
    };
    pick.oninput = fromParts; al.oninput = fromParts;
    txt.oninput = () => {
      const c = parseColor(txt.value);
      if (!c) { txt.classList.add('bad'); return; }
      txt.classList.remove('bad'); pick.value = toHex(c); al.value = c.a; out.textContent = pct(c); a.set(toRgba(c)); changed(item);
    };
    field = el('div', { class: 'field stack' }, el('div', { class: 'line' }, pick, txt), el('div', { class: 'line' }, al, out));
    controls.push({ item, set: v => { const c = parseColor(v) || { r: 0, g: 0, b: 0, a: 1 }; pick.value = toHex(c); al.value = c.a; txt.value = toRgba(c); out.textContent = pct(c); txt.classList.remove('bad'); } });
  } else if (item.t === 'range') {
    const r = el('input', { type: 'range', id, min: item.min, max: item.max, step: item.step || 1 });
    const out = el('span', { class: 'val mono' });
    const show = v => { out.textContent = (+v) + (item.unit || ''); };
    r.oninput = () => { const n = parseFloat(r.value); a.set(n); show(n); changed(item); };
    field = el('div', { class: 'field' }, r, out);
    controls.push({ item, set: v => { r.value = v; show(v); } });
  } else if (item.t === 'alpha') {
    const r = el('input', { type: 'range', id, min: 0, max: 100, step: 1 });
    const out = el('span', { class: 'val mono' });
    r.oninput = () => {
      const c = parseColor(a.get()) || { r: 0, g: 0, b: 0, a: 1 };
      c.a = +r.value / 100; out.textContent = r.value + '%';
      a.set(toRgba(c)); changed(item);
    };
    field = el('div', { class: 'field' }, r, out);
    controls.push({ item, set: v => { const c = parseColor(v) || { a: 1 }; r.value = Math.round(c.a * 100); out.textContent = r.value + '%'; } });
  } else if (item.t === 'toggle') {
    const cb = el('input', { type: 'checkbox', id, class: 'tgl', role: 'switch' });
    cb.onchange = () => { a.set(cb.checked ? 'on' : ''); changed(item); };
    row.className = 'row tg' + (item.b ? ' b' : '');
    field = cb;
    controls.push({ item, set: v => { cb.checked = v === 'on'; } });
  } else if (item.t === 'select') {
    const s = el('select', { id }, item.opts.map(([v, l]) => el('option', { value: v }, l)));
    s.onchange = () => { a.set(s.value); changed(item); };
    field = el('div', { class: 'field' }, s);
    controls.push({ item, set: v => { s.value = v; } });
  } else if (item.t === 'image') {
    const inp = el('input', { type: 'text', id, class: 'mono', spellcheck: 'false', placeholder: item.d === '' ? 'Leave empty for the default' : 'https://... or linear-gradient(...)' });
    inp.oninput = () => {
      const n = normImage(inp.value);
      a.set(n === '' ? (item.d === '' ? '' : 'none') : n);
      inp.classList.toggle('bad', !isSafeValue(n));
      changed(item);
      if (item.k === '--background-image') probeImage();
    };
    field = el('div', { class: 'field' }, inp);
    controls.push({ item, set: v => { inp.value = v; } });
  } else if (item.t === 'webfont') {
    const inp = el('input', { type: 'text', id, class: 'mono', spellcheck: 'false', autocomplete: 'off', maxlength: '300', placeholder: item.ph || '' });
    const dl = el('datalist', { id: id + 'l' }, item.list.map(v => el('option', { value: v })));
    inp.setAttribute('list', id + 'l'); row.append(dl);
    const st = el('div', { class: 'hint fstat', 'aria-live': 'polite' });
    const show = (v, loaded) => {
      const wf = parseWebFont(v);
      inp.classList.toggle('bad', !!wf && (wf.kind === 'bad' || loaded === false));
      st.textContent = !wf ? 'Leave empty to keep the font below.'
        : wf.kind === 'bad' ? 'Type a font name from fonts.google.com (like Inter), or an https link ending in .woff2, .woff, .ttf or .otf.'
        : loaded === false ? (wf.kind === 'google' ? `Couldn't find "${wf.name}". Check the spelling on fonts.google.com.` : 'Couldn\'t load that font file. Check the link.')
        : wf.kind === 'google' ? `Google font "${wf.name}"${loaded ? ', loaded' : ''}.` : `Font file${loaded ? ', loaded' : ''}.`;
    };
    fontNotes[item.k] = loaded => show(inp.value, loaded);
    inp.oninput = () => { a.set(inp.value.trim()); show(inp.value); changed(item); };
    field = el('div', { class: 'field stack' }, inp, st);
    controls.push({ item, set: v => { inp.value = v; show(v); } });
  } else {
    const inp = el('input', { type: 'text', id, class: 'mono', spellcheck: 'false', placeholder: item.ph || '' });
    if (item.list) {
      const dl = el('datalist', { id: id + 'l' }, item.list.map(v => el('option', { value: v })));
      inp.setAttribute('list', id + 'l'); row.append(dl);
    }
    inp.oninput = () => { a.set(inp.value.trim()); inp.classList.toggle('bad', !isSafeValue(inp.value)); changed(item); };
    field = el('div', { class: 'field' }, inp);
    controls.push({ item, set: v => { inp.value = v; } });
  }
  row.append(field);
  return row;
}

let themeSummary;
function buildPanel() {
  const p = $('#panel'); p.textContent = '';
  const q = el('input', { type: 'search', placeholder: 'Search settings', 'aria-label': 'Search settings', spellcheck: 'false' });
  q.oninput = () => filterPanel(q.value);
  const mb = el('button', { type: 'button', 'data-mode': 'basic' }, 'Basic');
  const ma = el('button', { type: 'button', 'data-mode': 'advanced' }, 'Advanced');
  [mb, ma].forEach(btn => { btn.onclick = () => setMode(btn.dataset.mode); });
  p.append(el('div', { class: 'psearch' }, el('div', { class: 'modes', role: 'group', 'aria-label': 'Settings mode' }, mb, ma), q));
  p.append(el('div', { class: 'intro b' }, el('b', {}, 'Make it yours.'), ' Pick a color, a background and a few touches. Switch to Advanced for every setting.'));
  SECTIONS.forEach(sec => {
    const sum = el('summary', {}, sec.theme ? '' : sec.title);
    const d = el('details', { class: 'sec' + (sec.items.some(i => i.b) ? ' b' : '') }, sum);
    if (sec.open || sec.theme) d.open = true;
    const body = el('div', { class: 'body' });
    sec.items.forEach(i => body.append(mkControl(i)));
    if (sec.id === 'accent') {
      const chips = el('div', { class: 'chips' }, ACCENTS.map(([n, m, h]) =>
        el('button', { class: 'chip', type: 'button' }, el('span', { class: 'dot', style: `background:${m}` }), n)));
      $$('button', chips).forEach((b, i) => { b.onclick = () => { S.root['--main-color'] = ACCENTS[i][1]; S.root['--hover-color'] = ACCENTS[i][2]; syncAll(); changed(); }; });
      body.prepend(el('div', { class: 'row b swatches' }, el('label', {}, 'Quick accents'), chips));
    }
    if (sec.id === 'bg') {
      const info = el('div', { class: 'hint', id: 'imgInfo' });
      const fill = el('button', { class: 'btn small', type: 'button', id: 'fillBtn', hidden: true });
      fill.onclick = () => { S.root['--background-fill'] = fill.dataset.hex; syncAll(); changed(); toast('Fill color matched'); };
      const mk = (label, fn) => { const b = el('button', { class: 'chip', type: 'button' }, label); b.onclick = () => { fn(); syncAll(); changed(); probeImage(); }; return b; };
      const chips = el('div', { class: 'chips' },
        mk('Fit whole image', () => { S.root['--background-size'] = 'contain'; S.root['--background-position'] = 'center'; }),
        mk('Fill window', () => { S.root['--background-size'] = 'cover'; S.root['--background-position'] = 'center'; }),
        mk('No image (pure black)', () => { S.root['--background-image'] = 'none'; S.root['--background-fill'] = '#000000'; }));
      body.insertBefore(el('div', { class: 'row b' }, info, fill, chips), body.children[1]);
    }
    if (sec.id === 'anim') {
      const play = el('button', { class: 'btn small b', type: 'button' }, 'Play animations in the preview');
      play.onclick = () => { if (S.scene === 'none' && S.root['--intox-menu-anim'] !== 'none') setOverlay('menu'); replay(); };
      body.prepend(el('div', { class: 'hint b' }, 'Animations always stay off when your system asks to reduce motion.'), play);
    }
    if (sec.id === 'servers') {
      body.append(el('div', { class: 'hint b' }, 'Home and the add and discover buttons stay centered above the columns. Experimental: if Discord changes its server list, set this back to 1.'));
    }
    if (sec.id === 'extras') {
      body.prepend(el('div', { class: 'hint b' }, 'Use any font from fonts.google.com by its name, or a link to a font file. Google fonts cover Latin letters; other scripts use the fallback font. If Vencord lists a font under Blocked Resources, press Allow there and restart Discord.'));
    }
    if (sec.id === 'clean') {
      body.prepend(el('div', { class: 'hint b' }, 'These only hide things. Turn a switch off to bring it back.'));
    }
    if (sec.theme) {
      themeSummary = sum;
      const b = el('button', { class: 'btn small', type: 'button' }, 'Copy these to all three dark themes');
      b.onclick = () => { const cur = S.theme[S.cur]; Object.keys(S.theme).forEach(t => { S.theme[t] = { ...cur }; }); changed(); toast('Copied to all dark themes'); };
      body.prepend(el('div', { class: 'hint' }, 'Pick the same theme in Discord under Settings, Appearance.'));
      body.append(b);
    }
    d.append(body); p.append(d);
  });
  const ta = el('textarea', { class: 'imp', spellcheck: 'false', placeholder: ':root {\n  --main-color: #e5484d;\n}', 'aria-label': 'CSS to import' });
  const go = el('button', { class: 'btn small', type: 'button' }, 'Load into editor');
  go.onclick = () => { const n = importCSS(ta.value); toast(n ? `Loaded ${n} value${n === 1 ? '' : 's'}` : 'Nothing recognized'); };
  p.append(el('details', { class: 'sec' }, el('summary', {}, 'Import existing CSS'), el('div', { class: 'body' }, el('div', { class: 'hint' }, 'Paste CSS you already use and the editor will read the INTOX settings from it.'), ta, go)));
  p.append(buildLooks());
  p.append(el('div', { class: 'note b more' }, 'Showing the essentials. ', el('button', { type: 'button', class: 'linkbtn', 'data-mode': 'advanced' }, 'Show all settings')));
  $$('.linkbtn', p).forEach(btn => { btn.onclick = () => setMode('advanced'); });
  p.append(el('div', { class: 'note b' }, 'Only values you change are written to the CSS output. Made for INTOX 1.1.8'));
}

function syncAll() {
  controls.forEach(({ item, set }) => {
    const v = item.theme ? S.theme[S.cur][item.k] : item.fk ? S.f[item.fk] : S.root[item.k];
    set(v);
  });
  if (themeSummary) themeSummary.textContent = 'Panels and text: ' + THEMES[S.cur].label;
  $('#theme').value = S.cur; $('#ratio').value = S.ratio; $('#scene').value = S.scene; $('#view').value = S.view;
}

/* ---------- import ---------- */
// Split "a: b; c: d" on semicolons, ignoring any inside quotes or brackets (e.g. data: links).
function splitDecls(body) {
  const out = []; let cur = '', depth = 0, q = '';
  for (const ch of body) {
    if (q) { cur += ch; if (ch === q) q = ''; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ';' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}
function importCSS(css) {
  settle();
  // The editor's own comments keep a Google font's exact spelling (e.g. "JetBrains Mono").
  const fontNames = {};
  for (const c of css.matchAll(/\/\* (Text|Code) font: ([A-Za-z0-9 ]{1,60}) \(Google Fonts/g)) fontNames[c[2].toLowerCase().replace(/ /g, '-')] = c[2];
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const items = {}; allItems().forEach(i => { if (i.k) items[i.k] = i; });
  THEME_ITEMS.forEach(i => { items[i.k] = i; });
  let n = 0, m; const re = /([^{}]+)\{([^{}]*)\}/g;
  const fontsSeen = new Set();
  while ((m = re.exec(css))) {
    const sel = m[1];
    // Web fonts written by the editor: @font-face rules for "INTOX Text" / "INTOX Code".
    if (/@font-face\s*$/i.test(sel)) {
      let fam = '', src = '';
      for (const piece of splitDecls(m[2])) {
        const d = /^\s*(font-family|src)\s*:\s*([\s\S]+?)\s*$/i.exec(piece);
        if (d) { if (d[1].toLowerCase() === 'font-family') fam = d[2].replace(/^["']|["']$/g, ''); else src = d[2]; }
      }
      const key = Object.keys(WEBFONT_SLOTS).find(k => WEBFONT_SLOTS[k].family === fam);
      const u = /url\(\s*["']?([^"')\s]+)["']?\s*\)/i.exec(src);
      if (!key || !u || fontsSeen.has(key)) continue;
      const fsrc = /^https:\/\/cdn\.jsdelivr\.net\/fontsource\/fonts\/([a-z0-9-]+)(?::vf)?@/.exec(u[1]);
      const val = fsrc ? (fontNames[fsrc[1]] || fsrc[1].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')) : u[1];
      const wf = parseWebFont(val);
      if (wf && wf.kind !== 'bad') { S.root[key] = val; fontsSeen.add(key); n++; }
      continue;
    }
    const tk = /theme-midnight/.test(sel) ? 'onyx' : /theme-darker/.test(sel) ? 'dark' : /theme-dark/.test(sel) ? 'ash' : null;
    for (const piece of splitDecls(m[2])) {
      const d = /^\s*(--[\w-]+)\s*:\s*([\s\S]+?)\s*$/.exec(piece);
      if (!d) continue;
      const k = d[1], v = d[2], it = items[k];
      if (k === '--background-filter') {
        const g = (re2) => { const x = re2.exec(v); return x ? parseFloat(x[1]) : null; };
        const b = g(/blur\(([\d.]+)px\)/), br = g(/brightness\(([\d.]+)%\)/), sa = g(/saturate\(([\d.]+)%\)/), co = g(/contrast\(([\d.]+)%\)/);
        if (b != null) S.f.blur = b; if (br != null) S.f.bright = br; if (sa != null) S.f.sat = sa; if (co != null) S.f.contrast = co;
        n++; continue;
      }
      if (!it) continue;
      // A font line written with a web font starts with its family name; keep only the user's own fonts.
      const slot = Object.values(WEBFONT_SLOTS).find(s => s.target === k);
      if (slot) {
        const fam = new RegExp(`^\\s*["']${slot.family}["']\\s*,\\s*`);
        if (fam.test(v)) { const rest = v.replace(fam, '').trim(); S.root[k] = rest === slot.fallback ? '' : rest; n++; continue; }
      }
      const cv = it.t === 'rgba' ? (parseColor(v) ? toRgba(parseColor(v)) : v) : v;
      if (it.theme) { (tk ? [tk] : Object.keys(S.theme)).forEach(t => { S.theme[t][k] = cv; }); n++; }
      else if (it.t === 'range') { const x = parseFloat(v); if (!isNaN(x)) { S.root[k] = x; n++; } }
      else if (it.t === 'image') { S.root[k] = normImage(v); n++; }
      else if (it.t === 'toggle') { S.root[k] = v.trim() === 'on' ? 'on' : ''; n++; }
      else if (it.strict) { if (it.opts.some(([o]) => o === v.trim())) { S.root[k] = v.trim(); n++; } }
      else { S.root[k] = cv; n++; }
    }
  }
  syncAll(); save(); render(); probeImage();
  if (n) { noteChange(); settle(); }
  return n;
}

/* ---------- preview ---------- */
function render() {
  const fr = $('#frame'), r = S.root, t = S.theme[S.cur], F = S.f, D = freshF();
  const v = (k, val) => fr.style.setProperty(k, val);
  v('--p-main', r['--main-color']); v('--p-hover', r['--hover-color']); v('--p-success', r['--success-color']); v('--p-danger', r['--danger-color']);
  v('--p-card', t['--card-shading']); v('--p-popout', t['--popout-shading']); v('--p-modal', t['--modal-shading']); v('--p-input', t['--input-shading']);
  v('--p-text', t['--normal-text']); v('--p-muted', t['--muted-text']);
  v('--p-sel', r['--channel-selected-bg']); v('--p-unread', r['--channel-unread']);
  v('--p-speed', r['--intox-speed'] + 'ms'); v('--p-ease', r['--intox-ease']); v('--p-radius', r['--intox-radius'] + 'px');
  v('--p-blur', r['--intox-blur'] + 'px'); v('--p-border', r['--intox-border']);
  v('--p-font', fontStack('--main-font') || '"gg sans","Segoe UI","Helvetica Neue",Helvetica,Arial,sans-serif');
  v('--p-code', fontStack('--code-font') || 'Consolas,"Liberation Mono",Menlo,monospace');
  previewFonts();
  v('--p-filter', +r['--saturation-factor'] !== 1 ? `saturate(${r['--saturation-factor']})` : 'none');
  $$('.st', fr).forEach(s => { s.style.background = r['--' + s.dataset.st + '-color']; });
  v('--p-online', r['--online-color']); v('--p-offline', r['--offline-color']);
  $('#pvfill').style.background = r['--background-fill'];
  const bg = $('#pvbg');
  bg.style.backgroundImage = r['--background-image'] || 'none';
  bg.style.backgroundPosition = r['--background-position'];
  bg.style.backgroundSize = r['--background-size'];
  bg.style.backgroundRepeat = 'no-repeat';
  const parts = [];
  if (F.blur !== D.blur) parts.push(`blur(${F.blur}px)`);
  if (F.bright !== D.bright) parts.push(`brightness(${F.bright}%)`);
  if (F.sat !== D.sat) parts.push(`saturate(${F.sat}%)`);
  if (F.contrast !== D.contrast) parts.push(`contrast(${F.contrast}%)`);
  bg.style.filter = parts.length ? parts.join(' ') : 'none';
  const c = parseColor(t['--background-shading']) || { r: 0, g: 0, b: 0, a: 0.9 };
  $('#pvshade').style.background = `rgba(${c.r},${c.g},${c.b},${c.a * (+r['--background-shading-percent'] / 100)})`;
  const cols = Math.min(4, Math.max(1, parseInt(r['--intox-server-columns'], 10) || 1));
  v('--p-cols', String(cols));
  v('--p-railw', cols > 1 ? `calc(${cols} * 3.5em + 1em)` : '4.5em');
  v('--p-menu-anim', r['--intox-menu-anim']); v('--p-toolbar-anim', r['--intox-toolbar-anim']);
  v('--p-window-anim', r['--intox-window-anim']); v('--p-msg-anim', r['--intox-message-anim']);
  v('--p-bg-anim', r['--intox-bg-anim']); v('--p-bg-speed', (+r['--intox-bg-speed'] || 40) + 's');
  const feats = FEATURES.filter(f => S.root['--intox-' + f] === 'on').map(f => 'f-' + f);
  fr.className = ['pv', 'view-' + S.view, 'ov-' + S.scene, cols > 1 ? 'cols' : '', ...feats].filter(Boolean).join(' ');
  const out = buildCSS();
  $('#out').value = out;
  $('#count').textContent = lastN ? `(${lastN})` : '';
  const w = $('#warn');
  w.hidden = !lastWarn.length;
  w.textContent = lastWarn.length ? 'Left out because the value was not safe to write as CSS: ' + lastWarn.join(', ') + '. Remove any braces, semicolons, comments or unbalanced brackets.' : '';
}
// Load web fonts into the preview. Waits until typing pauses, so half-typed names aren't fetched.
let fontT;
function previewFonts() {
  clearTimeout(fontT);
  fontT = setTimeout(() => {
    const rules = [], active = [];
    Object.entries(WEBFONT_SLOTS).forEach(([k, s]) => {
      const wf = parseWebFont(S.root[k]);
      if (!wf || wf.kind === 'bad') return;
      rules.push(...faceRules(wf, s.family)); active.push([k, s, S.root[k]]);
    });
    const css = rules.join('\n'), tag = $('#pvfonts');
    if (tag.textContent === css) return;
    tag.textContent = css;
    active.forEach(([k, s, val]) => {
      const report = ok => { if (S.root[k] === val && fontNotes[k]) fontNotes[k](ok); };
      document.fonts.load(`400 16px "${s.family}"`).then(f => report(f.length > 0), () => report(false));
    });
  }, 600);
}
function replay() {
  const els = [$('#menu'), $('.pv-settings'), ...$$('.tbar'), ...$$('#frame .msg')];
  els.forEach(x => { x.style.animation = 'none'; });
  void els[0].offsetWidth;
  els.forEach(x => { x.style.animation = ''; });
}
function fit() {
  const box = $('#stageBody'), fr = $('#frame');
  const [a, b] = S.ratio.split('/').map(Number);
  const narrow = window.matchMedia('(max-width:900px)').matches;
  const pad = narrow ? 24 : 32;
  const W = box.clientWidth - pad, H = narrow ? Infinity : box.clientHeight - pad;
  if (W <= 0 || H <= 0) return;
  let w = W, h = W * b / a;
  if (h > H) { h = H; w = H * a / b; }
  fr.style.width = Math.floor(w) + 'px'; fr.style.height = Math.floor(h) + 'px';
}

/* ---------- basic / advanced ---------- */
function setMode(m) {
  if (m !== 'basic' && m !== 'advanced') return;
  MODE = m;
  try { localStorage.setItem(MODE_KEY, m); } catch (e) { /* storage unavailable */ }
  const p = $('#panel');
  p.classList.toggle('mode-basic', m === 'basic');
  $$('.modes button', p).forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.mode === m)));
  const q = $('.psearch input', p); filterPanel(q ? q.value : '');
}

/* ---------- settings search ---------- */
function filterPanel(text) {
  const q = text.trim().toLowerCase();
  $$('#panel details.sec').forEach(d => {
    if (d.dataset.wasOpen === undefined) d.dataset.wasOpen = d.open ? '1' : '';
    const title = (d.querySelector('summary') || {}).textContent || '';
    const basic = $('#panel').classList.contains('mode-basic');
    const rows = $$('.body > .row', d).filter(r => !basic || r.classList.contains('b'));
    let any = !q || title.toLowerCase().includes(q);
    rows.forEach(r => {
      const hit = !q || title.toLowerCase().includes(q) || r.textContent.toLowerCase().includes(q);
      r.classList.toggle('nomatch', !hit);
      if (hit) any = true;
    });
    d.classList.toggle('nomatch', !any);
    if (q) d.open = any; else { d.open = d.dataset.wasOpen === '1'; delete d.dataset.wasOpen; }
  });
}

/* ---------- saved looks (kept only in this browser) ---------- */
const LOOKS_KEY = 'intox-editor-looks-v1';
const MAX_LOOKS = 30;
function loadLooks() {
  try {
    const a = JSON.parse(localStorage.getItem(LOOKS_KEY) || '[]');
    if (!Array.isArray(a)) return [];
    return a.filter(x => x && typeof x.name === 'string' && typeof x.data === 'string' && x.data.length < 100000)
      .slice(0, MAX_LOOKS).map(x => ({ name: x.name.slice(0, 40), data: x.data }));
  } catch (e) { return []; }
}
function saveLooks(list) { try { localStorage.setItem(LOOKS_KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
// A look is applied by copying only known settings with plain values, the same way saved state is read.
function applyLook(json) {
  let v; try { v = JSON.parse(json); } catch (e) { return false; }
  if (!v || typeof v !== 'object') return false;
  settle();
  const next = { root: freshRoot(), f: freshF(), theme: freshThemes() };
  Object.keys(next.root).forEach(k => { if (v.root && has(v.root, k) && ['string', 'number'].includes(typeof v.root[k])) next.root[k] = v.root[k]; });
  Object.keys(next.f).forEach(k => { if (v.f && typeof v.f[k] === 'number' && isFinite(v.f[k])) next.f[k] = v.f[k]; });
  Object.keys(next.theme).forEach(t => Object.keys(next.theme[t]).forEach(k => { if (v.theme && v.theme[t] && typeof v.theme[t][k] === 'string') next.theme[t][k] = v.theme[t][k]; }));
  S.root = next.root; S.f = next.f; S.theme = next.theme;
  noteChange(); settle();
  syncAll(); save(); render(); probeImage();
  return true;
}
function buildLooks() {
  const list = el('div', { class: 'looks' });
  const name = el('input', { type: 'text', maxlength: '40', placeholder: 'Name this look', 'aria-label': 'Look name', spellcheck: 'false' });
  const saveBtn = el('button', { class: 'btn small', type: 'button' }, 'Save current look');
  const draw = () => {
    list.textContent = '';
    const looks = loadLooks();
    if (!looks.length) { list.append(el('div', { class: 'hint' }, 'No saved looks yet.')); return; }
    looks.forEach((lk, i) => {
      const apply = el('button', { class: 'btn small', type: 'button' }, 'Apply');
      const del = el('button', { class: 'btn small', type: 'button' }, 'Delete');
      apply.onclick = () => { if (applyLook(lk.data)) toast('Applied "' + lk.name + '"'); };
      let armed = false;
      del.onclick = () => {
        if (!armed) { armed = true; del.textContent = 'Confirm'; setTimeout(() => { armed = false; del.textContent = 'Delete'; }, 2500); return; }
        const cur = loadLooks(); cur.splice(i, 1); saveLooks(cur); draw();
      };
      list.append(el('div', { class: 'look' }, el('span', { title: lk.name }, lk.name), apply, del));
    });
  };
  saveBtn.onclick = () => {
    const n = name.value.trim().slice(0, 40);
    if (!n) { name.focus(); toast('Give the look a name first'); return; }
    settle();
    const cur = loadLooks().filter(x => x.name !== n);
    if (cur.length >= MAX_LOOKS) { toast('You can keep up to ' + MAX_LOOKS + ' looks'); return; }
    cur.unshift({ name: n, data: snap() });
    toast(saveLooks(cur) ? 'Saved "' + n + '"' : 'Could not save (browser storage is off)');
    name.value = ''; draw();
  };
  draw();
  return el('details', { class: 'sec b' }, el('summary', {}, 'Saved looks'),
    el('div', { class: 'body' }, el('div', { class: 'hint b' }, 'Looks are kept only in this browser.'), el('div', { class: 'line b' }, name, saveBtn), el('div', { class: 'b' }, list)));
}

/* ---------- clickable preview ---------- */
// Everything shown here is made up. Text is set with textContent only.
const PEOPLE = {
  nova: { name: 'Nova', user: 'nova.fm', bg: '#7a5cc0', st: 'online', tag: false },
  kit: { name: 'Kit', user: 'kit.wav', bg: '#3f8f7a', st: 'idle', tag: true },
  mira: { name: 'Mira', user: 'mira.tea', bg: '#c0563f', st: 'dnd', tag: false },
  juno: { name: 'Juno', user: 'junobeam', bg: '#4f6fb0', st: 'streaming', tag: false },
  rex: { name: 'Rex', user: 'rex_404', bg: '#555a66', st: 'offline', tag: false }
};
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
function setView(v) {
  if (!VIEWS.includes(v)) return;
  S.view = v; $('#view').value = v; save(); render();
}
function setOverlay(v, keepPosition) {
  if (!SCENES.includes(v)) return;
  if (!keepPosition) { const m = $('#menu'); m.style.left = ''; m.style.top = ''; }
  S.scene = v; $('#scene').value = v; save(); render();
  if (v !== 'none') replay();
}
function openDM(key) {
  if (!has(PEOPLE, key)) return;
  const P = PEOPLE[key], fr = $('#frame');
  $$('.dmr[data-dm]', fr).forEach(r => r.classList.toggle('cur', r.dataset.dm === key));
  $$('[data-p="name"]', fr).forEach(e => { e.textContent = P.name; });
  $$('[data-p="user"]', fr).forEach(e => { e.textContent = P.user; });
  $$('[data-p="search"]', fr).forEach(e => { e.textContent = 'Search ' + P.name; });
  $$('[data-p="msg"]', fr).forEach(e => { e.textContent = 'Message @' + P.name; });
  $$('[data-p="tag"]', fr).forEach(e => { e.hidden = !P.tag; });
  $$('[data-p="st"]', fr).forEach(e => { e.dataset.st = P.st; });
  $$('[data-p="av"]', fr).forEach(e => {
    e.style.background = P.bg;
    if (e.firstChild && e.firstChild.nodeType === 3) e.firstChild.nodeValue = P.name[0];
  });
  setView('dm');
}
function openServer(icon) {
  const fr = $('#frame');
  $$('.g[data-srv]', fr).forEach(g => g.classList.toggle('cur', g === icon));
  $$('[data-s="name"]', fr).forEach(e => { e.textContent = icon.dataset.srv; });
  const ico = $('[data-s="ico"]', fr); if (ico) ico.style.background = icon.style.background;
  setView('server');
}
function openChannel(ch) {
  const fr = $('#frame');
  $$('.ch[data-ch]', fr).forEach(c => c.classList.toggle('sel', c === ch));
  $('[data-c="name"]', fr).textContent = ch.dataset.ch;
  $('[data-c="topic"]', fr).textContent = ch.dataset.topic;
  $('[data-c="msg"]', fr).textContent = 'Message #' + ch.dataset.ch;
  $('[data-c="follow"]', fr).hidden = ch.dataset.kind !== 'news';
  const ico = ch.dataset.ico;
  if (['mega', 'hash', 'forum'].includes(ico)) $('[data-c="ico"]', fr).setAttribute('href', '#i-' + ico);
}
$('#frame').addEventListener('click', e => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  // An open menu closes on any click, like Discord. A window closes when you click outside it.
  if (S.scene === 'menu') { setOverlay('none'); return; }
  if (S.scene === 'window') {
    // the settings page closes with its X (or Escape); its menu items can be picked
    if (t.closest('.st-x')) { setOverlay('none'); return; }
    const item = t.closest('.sn[data-sn]');
    if (item) {
      const page = $('.pv-settings');
      $$('.sn', page).forEach(e => e.classList.toggle('on', e === item));
      $('[data-stitle]', page).textContent = item.dataset.sn;
      page.classList.toggle('not-account', item.dataset.sn !== 'Account');
    }
    return;
  }
  const go = t.closest('[data-go]');
  if (go) { setView(go.dataset.go); return; }
  const dm = t.closest('[data-dm]');
  if (dm) { openDM(dm.dataset.dm); return; }
  const srv = t.closest('.g[data-srv]');
  if (srv) { openServer(srv); return; }
  const ch = t.closest('.ch[data-ch]');
  if (ch) openChannel(ch);
});
$('#frame').addEventListener('contextmenu', e => {
  if (!(e.target instanceof Element) || !e.target.closest('.pv-app')) return;
  e.preventDefault();
  const fr = $('#frame'), m = $('#menu'), r = fr.getBoundingClientRect();
  setOverlay('menu', true);
  const x = Math.min(e.clientX - r.left, r.width - m.offsetWidth - 6);
  const y = Math.min(e.clientY - r.top, r.height - m.offsetHeight - 6);
  m.style.left = Math.max(6, x) + 'px'; m.style.top = Math.max(6, y) + 'px';
});

/* ---------- image info + edge colour ---------- */
let probeT;
function probeImage() {
  clearTimeout(probeT);
  probeT = setTimeout(() => {
    const info = $('#imgInfo'), btn = $('#fillBtn');
    if (!info) return;
    btn.hidden = true;
    const val = S.root['--background-image'] || 'none';
    const m = /url\(\s*["']?([^"')]+?)["']?\s*\)/i.exec(val);
    if (!m) { info.className = 'hint'; info.textContent = val === 'none' ? 'No image. The background is the solid fill color.' : 'Gradient background.'; return; }
    const u = m[1];
    if (!/^https:\/\//i.test(u)) { info.className = 'hint warn'; info.textContent = 'The link must start with https:// or Discord will not load it.'; return; }
    info.className = 'hint'; info.textContent = 'Checking image...';
    const im = new Image();
    im.onload = () => {
      info.textContent = `Image is ${im.naturalWidth}x${im.naturalHeight} (${(im.naturalWidth / im.naturalHeight).toFixed(2)}:1). Contain keeps all of it visible at any window shape.`;
      edgeColor(u, btn);
    };
    im.onerror = () => { info.className = 'hint warn'; info.textContent = 'Could not load that image. Check that the link is public and goes straight to the file.'; };
    im.src = u;
  }, 300);
}
function edgeColor(u, btn) {
  const im = new Image(); im.crossOrigin = 'anonymous';
  im.onload = () => {
    try {
      const W = 48, H = 48, c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0, W, H);
      const d = x.getImageData(0, 0, W, H).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < W; i++) for (let j = 0; j < H; j++) {
        if (!(i < 2 || j < 2 || i >= W - 2 || j >= H - 2)) continue;
        const p = (j * W + i) * 4; r += d[p]; g += d[p + 1]; b += d[p + 2]; n++;
      }
      const hx = toHex({ r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) });
      btn.dataset.hex = hx; btn.textContent = 'Match fill color to image edges (' + hx + ')'; btn.hidden = false;
    } catch (e) { /* image host does not allow reading pixels */ }
  };
  im.src = u;
}

/* ---------- actions ---------- */
let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1600);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch (e) {
    const t = el('textarea', { style: 'position:fixed;opacity:0' }); t.value = text; document.body.append(t); t.select();
    try { document.execCommand('copy'); } catch (e2) { /* ignore */ } t.remove();
  }
  toast('CSS copied');
}
$('#copy').onclick = () => copyText(buildCSS());
$('#download').onclick = () => {
  const a = el('a', { href: URL.createObjectURL(new Blob([buildCSS()], { type: 'text/css' })), download: 'INTOX-custom.css' });
  document.body.append(a); a.click(); a.remove(); toast('Downloaded INTOX-custom.css');
};
$('#reset').onclick = () => {
  const cur = S.cur, ratio = S.ratio, scene = S.scene, view = S.view;
  settle();
  S = { root: freshRoot(), f: freshF(), theme: freshThemes(), cur, ratio, scene, view };
  noteChange(); settle();
  syncAll(); save(); render(); probeImage(); toast('Reset to INTOX defaults');
};
$('#theme').onchange = e => { S.cur = e.target.value; syncAll(); save(); render(); };
$('#ratio').onchange = e => { S.ratio = e.target.value; save(); fit(); };
$('#scene').onchange = e => setOverlay(e.target.value);
$('#view').onchange = e => { S.view = e.target.value; save(); render(); replay(); };
const tab = which => {
  const css = which === 'css';
  $('#previewView').hidden = css; $('#cssView').hidden = !css;
  $('#tabPreview').setAttribute('aria-selected', String(!css)); $('#tabCss').setAttribute('aria-selected', String(css));
  if (!css) requestAnimationFrame(fit);
};
$('#tabPreview').onclick = () => tab('preview');
$('#tabCss').onclick = () => tab('css');

$('#undo').onclick = undo;
$('#redo').onclick = redo;
// Close the current group of edits before any button acts, and when a field or slider is let go.
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('button')) settle(); }, true);
document.addEventListener('change', () => settle(), true);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && S.scene !== 'none') { setOverlay('none'); return; }
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k !== 'z' && k !== 'y') return;
  if (e.target && e.target.matches && e.target.matches('textarea')) return; // normal text undo in the import box
  e.preventDefault();
  if (k === 'y' || e.shiftKey) redo(); else undo();
});

/* ---------- start ---------- */
// Every message gets the hover toolbar, cloned from the one in the page (no HTML strings involved).
const tbarTemplate = $('#frame .tbar');
if (tbarTemplate) $$('#frame .msg').forEach(m => { if (!m.querySelector(':scope > .tbar')) m.append(tbarTemplate.cloneNode(true)); });
buildPanel(); setMode(MODE); syncAll(); render(); probeImage();
committed = snap(); updateHistoryButtons();
new ResizeObserver(fit).observe($('#stageBody'));
window.addEventListener('resize', fit);
fit();
})();
