#!/usr/bin/env node
// Smoke-test for index.html: runs the real inline script against a small DOM
// shim, so it works without a browser. Usage: node scripts/check_site.js
const fs = require('fs');
const vm = require('vm');
// Repo root, one level up from scripts/.
const path = require('node:path').resolve(__dirname, '..');
const html = fs.readFileSync(path + '/index.html', 'utf8');
const script = html.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/)[1];

function makeEl(tag) {
  const node = {
    tagName: tag.toUpperCase(),
    children: [],
    listeners: {},
    className: '',
    style: {},
    hidden: false,
    attrs: {},
    scrollLeft: 0,
    scrollWidth: 0,
    clientWidth: 0,
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      contains(c) { return this._set.has(c); }
    },
    append(...kids) { kids.forEach((k) => { k.parentNode = node; node.children.push(k); }); },
    appendChild(k) { node.append(k); return k; },
    addEventListener(type, fn) { (node.listeners[type] = node.listeners[type] || []).push(fn); },
    removeEventListener() {},
    setAttribute(n, v) { node.attrs[n] = String(v); },
    removeAttribute(n) { delete node.attrs[n]; },
    getAttribute(n) { return n in node.attrs ? node.attrs[n] : null; },
    focus() {},
    querySelector(sel) {
      const want = sel.replace(/^\./, '');
      return node.children.find((c) => (c.className || '').split(/\s+/).includes(want)) || null;
    },
    closest(sel) {
      const want = sel.replace(/^\./, '');
      let cur = node;
      while (cur) {
        if ((cur.className || '').split(/\s+/).includes(want)) return cur;
        cur = cur.parentNode;
      }
      return null;
    },
    set innerHTML(v) { node._html = v; },
    get innerHTML() { return node._html || ''; },
    // mirrors the real DOM: assigning textContent wipes existing children
    get textContent() {
      if (node.children.length) return node.children.map((c) => c.textContent).join('');
      return node._text == null ? '' : node._text;
    },
    set textContent(v) {
      node._text = String(v);
      if (v === '') node.children.length = 0;
    },
    getBoundingClientRect() { return { left: 0, top: 0, width: 400, height: 600 }; },
    dispatch(type, props) {
      const event = Object.assign(
        { type, target: node, preventDefault() {}, clientX: 0, clientY: 0, deltaY: 0, pointerId: 1 },
        props
      );
      let cur = node;
      while (cur) {
        (cur.listeners[type] || []).forEach((fn) => fn(event));
        cur = cur.parentNode;
      }
      return event;
    }
  };
  return node;
}

function harness(dataSource) {
  const body = makeEl('body');
  const tree = {};
  function mount(id, cls, tag = 'div', parent = body) {
    const node = makeEl(tag);
    node.id = id || '';
    node.className = cls || '';
    parent.append(node);
    if (id) tree['#' + id] = node;
    if (cls) cls.split(/\s+/).forEach((c) => { tree['.' + c] = node; });
    return node;
  }

  const hero = mount('', 'hero', 'header');
  mount('site-title', '', 'h1', hero);
  mount('site-subtitle', 'sub', 'p', hero);
  mount('gallery-hint', 'hint', 'p');
  const grid = mount('grid', 'grid', 'div');
  mount('site-footer', '', 'p', mount('', '', 'footer'));
  mount('copyright-year', '', 'span');

  const lightbox = mount('lightbox', 'lightbox');
  mount('', 'lb-close', 'button', lightbox);
  mount('', 'lb-prev', 'button', lightbox);
  mount('', 'lb-next', 'button', lightbox);
  const figure = mount('', 'figure', 'figure', lightbox);
  mount('', 'lb-media', 'button', figure).append(mount('lb-img', '', 'img'));
  mount('lb-caption', '', 'figcaption', figure);

  const zoom = mount('zoom', 'zoom');
  const bar = mount('', 'zoom-bar', 'div', zoom);
  mount('zoom-out', '', 'button', bar);
  mount('zoom-label', '', 'span', bar);
  mount('zoom-in', '', 'button', bar);
  mount('zoom-reset', '', 'button', bar);
  mount('zoom-close', '', 'button', bar);
  mount('zoom-img', '', 'img', zoom);

  tree['#lightbox'].hidden = true;
  tree['#zoom'].hidden = true;

  const document = {
    body,
    title: '',
    activeElement: null,
    createElement: makeEl,
    getElementById: (id) => tree['#' + id],
    querySelector: (sel) => tree[sel],
    addEventListener(type, fn) { (document._l = document._l || {}); (document._l[type] = document._l[type] || []).push(fn); },
    dispatch(type, props) {
      const event = Object.assign({ type, target: document.body, preventDefault() {} }, props);
      ((document._l || {})[type] || []).forEach((fn) => fn(event));
    }
  };

  const sandbox = { window: { innerWidth: 1200, innerHeight: 800, addEventListener() {} }, document, console };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path + '/objects.js', 'utf8'), sandbox);
  if (dataSource === 'real') vm.runInContext(fs.readFileSync(path + '/gallery-data.js', 'utf8'), sandbox);
  else sandbox.window.GALLERY_DATA = dataSource;
  vm.runInContext(script, sandbox);

  return { tree, document, body, sandbox, strip: tree['#grid'], lbCaption: tree['#lb-caption'] };
}

let failures = 0;
function check(name, cond, extra) {
  if (cond) console.log('  ok   ' + name);
  else { failures += 1; console.log('  FAIL ' + name + (extra ? ' -> ' + extra : '')); }
}
function section(name) { console.log('\n' + name); }

function cardsOf(strip) { return strip.children.filter((c) => (c.className || '').includes('card')); }
function variantsBox(lbCaption) { return lbCaption.children.find((c) => (c.className || '') === 'variants') || null; }
function aboutBox(lbCaption) { return lbCaption.children.find((c) => (c.className || '') === 'about') || null; }
function framePart(card, cls) {
  return card.children[0].children.find((n) => (n.className || '') === cls) || null;
}
function captionText(lbCaption) { return lbCaption.children.map((c) => c.textContent).join(' | '); }

/* ---------------- static markup ---------------- */
section('markup');
for (const sel of script.matchAll(/(?<!\w)document\.querySelector\('([^']+)'\)/g)) {
  const cls = sel[1].replace(/^\./, '');
  if (!new RegExp('class="[^"]*\\b' + cls + '\\b').test(html)) throw new Error('selector missing in html: ' + sel[1]);
}
for (const id of script.matchAll(/getElementById\('([^']+)'\)/g)) {
  if (!new RegExp('id="' + id[1] + '"').test(html)) throw new Error('id missing in html: ' + id[1]);
}

const CROATIAN = ['Zatvori', 'Pregled', 'Sljedeća', 'Prethodna', 'Klikni', 'Još nema', 'Snimljeno', 'zvijezda', 'integracije'];
check('page is declared as English', /<html lang="en">/.test(html));
check('no Croatian UI text left in index.html', !CROATIAN.some((w) => html.includes(w)));
check('no Croatian UI text left in gallery-data.js',
  !CROATIAN.some((w) => fs.readFileSync(path + '/gallery-data.js', 'utf8').includes(w)));
check('landing mentions the scope', /Seestar S50 Pro/.test(html));
check('no mount claims (alt-az removed)', !/alt-az/i.test(html) && !/equatorial|polar align/i.test(html));
check('landing links a light pollution map', /lightpollutionmap\.info/.test(html));
const objectsSource = fs.readFileSync(path + '/objects.js', 'utf8');
check('no em dashes in the visible copy',
  !/—/.test(html) && !/—/.test(fs.readFileSync(path + '/gallery-data.js', 'utf8')) &&
  !/—/.test(objectsSource));
check('object notes are English too', !CROATIAN.some((w) => objectsSource.includes(w)));
check('gallery hint text removed', !html.includes('Scroll or drag') && !/id="gallery-hint"/.test(html));

const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
const gridRule = (css.match(/\.grid \{[^}]*\}/) || [''])[0];
check('gallery is a multi-column grid', /grid-template-columns:\s*repeat\(auto-fill/.test(gridRule), gridRule);
check('no horizontal scrolling left behind', !/\.strip\b/.test(css) && !/overflow-x:\s*auto/.test(css));
check('captions sit on the picture instead of below it', /\.card \.cap \{[^}]*position:\s*absolute/.test(css));
check('old boxed facts table is gone', !/class="facts"/.test(html) && !/\.fact\b/.test(css));
check('single content column width', /\.wrap \{\s*max-width: 1000px/.test(css));
const introRule = (css.match(/\.hero p\.intro \{[^}]*\}/) || [''])[0];
const heroRule = (css.match(/\.hero \{[^}]*\}/) || [''])[0];
check('intro text spans the full gallery width',
  !/max-width/.test(introRule) && !/max-width/.test(heroRule), introRule + ' ' + heroRule);

/* ---------------- real data ---------------- */
section('real gallery data');
const real = harness('real');
const data = real.sandbox.window.GALLERY_DATA;
const realCards = cardsOf(real.strip);

const byGroup = new Map();
data.photos.forEach((p) => {
  const k = p.group || p.file;
  if (!byGroup.has(k)) byGroup.set(k, []);
  byGroup.get(k).push(p);
});
byGroup.forEach((v) => v.sort((a, b) => {
  const byIntegration = (b.integration || 0) - (a.integration || 0);
  if (byIntegration) return byIntegration;
  const av = String(a.variant || '').toLowerCase();
  const bv = String(b.variant || '').toLowerCase();
  if (!av && bv) return -1;
  if (av && !bv) return 1;
  return av.localeCompare(bv) || String(a.file).localeCompare(String(b.file));
}));
const groupList = Array.from(byGroup.values());
groupList.sort((a, b) => (String(b[0].date || '') + ' ' + String(b[0].time || ''))
  .localeCompare(String(a[0].date || '') + ' ' + String(a[0].time || '')));
const covers = groupList.map((v) => v[0]);

check('one card per object', realCards.length === groupList.length, realCards.length + ' vs ' + groupList.length);
check('cards use the cover thumbnail', realCards.every((c, i) => c.children[0].children[0].src === covers[i].thumb));
check('cards show title and date', realCards.every((c, i) => {
  const cap = c.children[1];
  return cap.children[0].textContent === covers[i].title && cap.children[1].textContent.includes(covers[i].date);
}));
check('only multi-version cards carry a badge', realCards.every((c, i) => {
  const badge = framePart(c, 'badge');
  return groupList[i].length > 1 ? Boolean(badge && /versions$/.test(badge.textContent)) : !badge;
}));
check('cover is the longest integration', groupList.every((v) => v.length < 2 ||
  (v[0].integration || 0) === Math.max(...v.map((p) => p.integration || 0))));
const keyOf = (p) => String(p.date || '') + ' ' + String(p.time || '');
const cardKeys = realCards.map((c) => {
  const title = c.children[1].children[0].textContent;
  const cover = covers.find((p) => p.title === title);
  return keyOf(cover);
});
check('cards run from the newest capture to the oldest',
  cardKeys.every((k, i) => i === 0 || cardKeys[i - 1] >= k), cardKeys.join(' | '));
check('the newest object is the first tile', cardKeys[0] === covers.map(keyOf).reduce((a, b) => (a > b ? a : b)),
  cardKeys[0]);
check('the oldest object is the last tile',
  keyOf(covers[covers.length - 1]) === covers.map(keyOf).reduce((a, b) => (a < b ? a : b)),
  covers[covers.length - 1].group);
check('hero uses the site title', real.tree['#site-title'].textContent === data.site.title);
check('footer comes from the data file', real.tree['#site-footer'].textContent === data.site.footer);
const copyrightText = (html.match(/<p class="copyright">([\s\S]*?)<\/p>/) || ['', ''])[1]
  .replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
check('footer carries only a plain copyright line',
  copyrightText === '© 2026 Mario Žagar', copyrightText);
check('copyright year is filled in at runtime',
  real.tree['#copyright-year'].textContent === String(new Date().getFullYear()),
  real.tree['#copyright-year'].textContent);
check('document title follows the data file', real.document.title === data.site.title);

const objects = real.sandbox.window.OBJECTS;
const groupKeys = Array.from(new Set(data.photos.map((p) => p.group)));
check('every object has a description', groupKeys.every((k) => objects[k]),
  groupKeys.filter((k) => !objects[k]).join(','));
check('no descriptions without an object', Object.keys(objects).every((k) => groupKeys.includes(k)),
  Object.keys(objects).filter((k) => !groupKeys.includes(k)).join(','));
check('every description has a wikipedia link',
  Object.values(objects).every((o) => /^https:\/\/en\.wikipedia\.org\/wiki\/[A-Za-z0-9_()',.-]+$/.test(o.wiki)));
check('every description has facts', Object.values(objects).every((o) => Array.isArray(o.facts) && o.facts.length >= 3));
check('descriptions stay short', Object.values(objects).every((o) => o.about.split(/\s+/).length <= 60),
  Object.entries(objects).filter(([, o]) => o.about.split(/\s+/).length > 60).map(([k]) => k).join(','));

const missing = data.photos.flatMap((p) => [p.file, p.thumb]).filter((f) => !fs.existsSync(path + '/' + f));
check('all referenced image files exist on disk', missing.length === 0, missing.join(', '));

realCards[0].dispatch('click', {});
const rlb = real.tree['#lightbox'];
check('card click opens the lightbox', rlb.hidden === false);
check('lightbox shows the full-size image', real.tree['#lb-img'].src === covers[0].file, real.tree['#lb-img'].src);
check('body scroll is locked', real.body.classList.contains('locked'));
check('caption carries title, date, text and hint',
  captionText(real.lbCaption).includes(covers[0].title) &&
  captionText(real.lbCaption).includes(covers[0].date) &&
  captionText(real.lbCaption).includes('full size and zoom'), captionText(real.lbCaption));
check('tiles with a description carry the info dot',
  realCards.every((c, i) => Boolean(framePart(c, 'info-dot')) === Boolean(objects[groupList[i][0].group])));

const aboutIdx = groupList.findIndex((v) => objects[v[0].group]);
real.document.dispatch('keydown', { key: 'Escape' });
realCards[aboutIdx].dispatch('click', {});
const about = aboutBox(real.lbCaption);
check('the lightbox shows an About block', about !== null);
if (about) {
  const parts = about.children;
  const title = parts.find((n) => (n.className || '') === 'about-title');
  const text = parts.find((n) => (n.className || '') === 'about-text');
  const facts = parts.find((n) => (n.className || '') === 'about-facts');
  const link = parts.find((n) => (n.className || '') === 'about-link');
  const info = objects[groupList[aboutIdx][0].group];
  check('About block names the object', title && title.textContent.includes(info.title), title && title.textContent);
  check('About block carries the text', text && text.textContent === info.about);
  check('About block lists the facts', facts && facts.children.length === info.facts.length,
    facts && facts.children.length);
  check('facts render as label and value',
    facts && facts.children.every((row, i) => row.children[0].textContent === info.facts[i][0] &&
      row.children[1].textContent === info.facts[i][1]),
    facts && JSON.stringify(facts.children.map((r) => r.children.map((n) => n.textContent))));
  check('About block links to wikipedia', link && link.href === info.wiki &&
    link.target === '_blank' && link.rel === 'noopener', link && link.href);
}

const singleIndex = groupList.findIndex((v) => v.length === 1);
real.document.dispatch('keydown', { key: 'Escape' });
realCards[singleIndex].dispatch('click', {});
check('no exposure chips when there is one version', variantsBox(real.lbCaption) === null,
  groupList[singleIndex][0].group);

real.document.dispatch('keydown', { key: 'Escape' });
check('Escape closes the lightbox', rlb.hidden === true);
check('scroll lock released', !real.body.classList.contains('locked'));

/* same integration, different crop (M27 pair) */
const pairIndex = groupList.findIndex((v) => v.length > 1 && v[0].integration &&
  v.every((p) => p.integration === v[0].integration && p.variant));
if (pairIndex >= 0) {
  const chipsOf = (cap) => {
    const box = variantsBox(cap);
    return box ? box.children.filter((c) => c.tagName === 'BUTTON').map((c) => c.textContent) : [];
  };
  realCards[pairIndex].dispatch('click', {});
  const labels = chipsOf(real.lbCaption);
  check('equal-length variants get distinct chip labels',
    labels.length === groupList[pairIndex].length && new Set(labels).size === labels.length, labels.join(' | '));
  check('chip labels carry the crop name', groupList[pairIndex].every((p) =>
    labels.some((l) => l.includes(p.variant) || !p.variant)), labels.join(' | '));
  check('cover of the pair is the crop, not the wide field',
    groupList[pairIndex][0].variant === 'crop', groupList[pairIndex].map((p) => p.variant).join(','));
  const chipBox = variantsBox(real.lbCaption);
  chipBox.children.filter((c) => c.tagName === 'BUTTON')[1].dispatch('click', {});
  check('switching crop loads the wide field',
    real.tree['#lb-img'].src === groupList[pairIndex][1].file, real.tree['#lb-img'].src);
  real.document.dispatch('keydown', { key: 'Escape' });
}

/* label-only variants without an integration stamp (Moon zoom levels) */
const zoomIndex = groupList.findIndex((v) => v.length > 1 && v.every((p) => !p.integration && p.variant));
if (zoomIndex >= 0) {
  const expected = groupList[zoomIndex].map((p) => p.variant);
  realCards[zoomIndex].dispatch('click', {});
  const box = variantsBox(real.lbCaption);
  const labels = box ? box.children.filter((c) => c.tagName === 'BUTTON').map((c) => c.textContent) : [];
  check('zoom variants are listed numerically, not alphabetically',
    labels.join(',') === expected.join(',') && labels[0] === '1x', labels.join(','));
  check('zoom chips carry no empty integration prefix', labels.every((l) => !/^·|\s·\s*$|min/.test(l)), labels.join(','));
  check('the widest field is the cover', groupList[zoomIndex][0].variant === '1x', expected.join(','));
  check('cover card shows the object date only',
    realCards[zoomIndex].children[1].children[1].textContent === groupList[zoomIndex][0].date,
    realCards[zoomIndex].children[1].children[1].textContent);
  real.document.dispatch('keydown', { key: 'Escape' });
}

/* ---------------- variant grouping ---------------- */
section('variant grouping (synthetic data)');
const synthetic = {
  site: { title: 'T', subtitle: 'S', footer: 'F' },
  photos: [
    { file: 'photos/a-6m.jpg', thumb: 'photos/thumbs/a-6m.jpg', title: 'M42', date: '2026-11-18', caption: 'short run', group: 'm42', integration: 6, width: 360, height: 640 },
    { file: 'photos/a-97m.jpg', thumb: 'photos/thumbs/a-97m.jpg', title: 'M42', date: '2026-11-20', caption: 'long run', group: 'm42', integration: 97, width: 360, height: 640 },
    { file: 'photos/b-53m.jpg', thumb: 'photos/thumbs/b-53m.jpg', title: 'IC405', date: '2026-11-19', caption: '', group: 'ic405', integration: 53, width: 640, height: 640 }
  ]
};
const syn = harness(synthetic);
const synCards = cardsOf(syn.strip);

check('two exposures of one object collapse into one card', synCards.length === 2, synCards.length);
check('newest object comes first (chronological order)', synCards[0].children[1].children[0].textContent === 'M42');
const synMulti = synCards[0];
const synSingle = synCards[1];
check('cover is the longest integration', synMulti.children[0].children[0].src === 'photos/thumbs/a-97m.jpg',
  synMulti.children[0].children[0].src);
check('multi-version card shows a badge', framePart(synMulti, 'badge').textContent === '2 versions',
  framePart(synMulti, 'badge') && framePart(synMulti, 'badge').textContent);
check('single-version card has no badge', !framePart(synSingle, 'badge'));
check('no About block when the object has no description', aboutBox(syn.lbCaption) === null);
check('card meta shows the cover integration', synMulti.children[1].children[1].textContent === '1 h 37 min · 2026-11-20',
  synMulti.children[1].children[1].textContent);

synMulti.dispatch('click', {});
const synLb = syn.tree['#lightbox'];
check('lightbox opens on the cover (longest) exposure', syn.tree['#lb-img'].src === 'photos/a-97m.jpg', syn.tree['#lb-img'].src);

let box = variantsBox(syn.lbCaption);
check('exposure chips are offered', box !== null && box.children.length === 3, box && box.children.length);
check('chip labels show durations', box && box.children[1].textContent === '1 h 37 min' && box.children[2].textContent === '6 min',
  box && box.children.map((c) => c.textContent).join(','));
check('longest exposure is marked as active', box && box.children[1].attrs['aria-pressed'] === 'true');

box.children[2].dispatch('click', {});
check('clicking a chip swaps the lightbox image', syn.tree['#lb-img'].src === 'photos/a-6m.jpg', syn.tree['#lb-img'].src);
check('caption follows the selected exposure', captionText(syn.lbCaption).includes('short run'), captionText(syn.lbCaption));
box = variantsBox(syn.lbCaption);
check('active chip moves to the selected exposure', box.children[2].attrs['aria-pressed'] === 'true' && box.children[1].attrs['aria-pressed'] === 'false');

syn.document.querySelector('.lb-media').dispatch('click', {});
check('zoom opens the selected exposure', syn.tree['#zoom-img'].src === 'photos/a-6m.jpg', syn.tree['#zoom-img'].src);
check('zoom starts at 100%', syn.tree['#zoom-label'].textContent === '100 %');
syn.document.dispatch('keydown', { key: 'Escape' });

syn.document.dispatch('keydown', { key: 'ArrowRight' });
check('arrows step between objects, not exposures', syn.tree['#lb-img'].src === 'photos/b-53m.jpg', syn.tree['#lb-img'].src);
check('stepping resets to the cover exposure', variantsBox(syn.lbCaption) === null);
syn.document.dispatch('keydown', { key: 'ArrowRight' });
check('stepping wraps around', syn.tree['#lb-img'].src === 'photos/a-97m.jpg');
syn.document.dispatch('keydown', { key: 'Escape' });

/* ---------------- zoom interaction ---------------- */
section('zoom interaction');
synCards[0].dispatch('click', {});
syn.document.querySelector('.lb-media').dispatch('click', {});
const zoomEl = syn.tree['#zoom'];
const zoomImg = syn.tree['#zoom-img'];
const zoomLabel = syn.tree['#zoom-label'];

zoomEl.dispatch('wheel', { clientX: 600, clientY: 400, deltaY: -300 });
check('wheel zooms in', /scale\((?!1\))/.test(zoomImg.style.transform), zoomImg.style.transform);

const beforeDrag = zoomImg.style.transform;
zoomImg.dispatch('pointerdown', { pointerId: 7, clientX: 600, clientY: 400 });
zoomImg.dispatch('pointermove', { pointerId: 7, clientX: 640, clientY: 430 });
zoomImg.dispatch('pointerup', { pointerId: 7, clientX: 640, clientY: 430 });
check('dragging pans the zoomed image', zoomImg.style.transform !== beforeDrag);
check('drag does not close the viewer', zoomEl.hidden === false);

syn.tree['#zoom-reset'].dispatch('click', {});
check('reset returns to 100%', zoomImg.style.transform === 'translate(0px, 0px) scale(1)' && zoomLabel.textContent === '100 %');

zoomImg.dispatch('pointerdown', { pointerId: 8, clientX: 600, clientY: 400 });
zoomImg.dispatch('pointerup', { pointerId: 8, clientX: 600, clientY: 400 });
zoomImg.dispatch('pointerdown', { pointerId: 9, clientX: 600, clientY: 400 });
zoomImg.dispatch('pointerup', { pointerId: 9, clientX: 600, clientY: 400 });
check('double tap zooms in', /scale\(2\.5\)/.test(zoomImg.style.transform), zoomImg.style.transform);

syn.document.dispatch('keydown', { key: 'Escape' });
check('Escape leaves zoom but keeps the lightbox', zoomEl.hidden === true && synLb.hidden === false);
syn.document.dispatch('keydown', { key: 'Escape' });
check('second Escape closes the lightbox', synLb.hidden === true);

/* ---------------- masonry layout ---------------- */
section('masonry layout');
const gridCards = cardsOf(real.strip);
check('every tile got a row span', gridCards.every((c) => /^span \d+$/.test(c.style.gridRowEnd || '')),
  gridCards.map((c) => c.style.gridRowEnd).join(','));
const expectedSpan = (card, photo) => {
  const width = 400 - 2;
  const height = Math.round(width * (photo.height / photo.width));
  return 'span ' + Math.ceil((height + 12) / 6);
};
check('row span follows the picture aspect ratio',
  gridCards.every((c, i) => c.style.gridRowEnd === expectedSpan(c, covers[i])),
  gridCards.map((c) => c.style.gridRowEnd).join(','));
const tall = gridCards.map((c, i) => ({
  span: parseInt(String(c.style.gridRowEnd).replace('span ', ''), 10),
  ratio: covers[i].height / covers[i].width
}));
check('portrait tiles span more rows than square ones',
  Math.max(...tall.filter((t) => t.ratio > 1.2).map((t) => t.span)) >
  Math.max(...tall.filter((t) => t.ratio <= 1.2).map((t) => t.span)));

console.log(failures ? '\n' + failures + ' FAILURE(S)' : '\nall checks passed');
process.exit(failures ? 1 : 0);
