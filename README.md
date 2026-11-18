# Astro photos — static gallery for GitHub Pages

Gotove, obrađene slike iz Seestar aplikacije (s watermarkom) → web-optimizirane
kopije → statična stranica. Bez frameworka, bez build toolchaina, bez servera.

## Kako radi

```
masters/            slike koje ide na stranicu (NE ide na GitHub - u .gitignore je)
  └── 2026-11-18_m42-orion.jpg
raw/                sirove/neobjavljene obrade - samo lokalno, nikad se ne objavljuje
scripts/build_gallery.py
photos/             web verzija, do 2560 px (koristi je lightbox + zumiranje)
  └── thumbs/       thumbnail, do 640 px (koristi je grid)
index.html          galerija: grid + lightbox + fullscreen zumiranje (vanilla JS)
gallery-data.js     naslovi/opisi - generira se, ali ga smiješ uređivati
```

Na stranicu idu **samo** datoteke iz `masters/`. Ako nešto ne želiš objaviti,
ostavi to u `raw/`.

## 1. Dodaj sliku

```bash
cp ~/Desktop/Seestar_izvoz.jpg masters/2026-11-19_ic405.jpg
```

Ime datoteke daje naslov i datum:

| datoteka | naslov | datum |
|---|---|---|
| `2026-11-18_m42-orion.jpg` | M42 Orion | 2026-11-18 |
| `2026-11-19_ic405-plamtecica.jpg` | IC405 Plamtecica | 2026-11-19 |
| `mjesec.jpg` | Mjesec | — |

Podržano: JPEG, PNG, TIFF. FITS/XISF prvo izvezi u JPEG/TIFF.
Slike manje od ciljne veličine se **ne povećavaju** (nema gubitka kvalitete).

## 2. Generiraj web verzije

```bash
python3 scripts/build_gallery.py
```

Koristi `sips` (macOS, ništa se ne instalira). Postojeće slike se preskaču
osim ako je master noviji.

## 3. Naslovi i opisi (opcionalno)

U `gallery-data.js` uredi `title` / `date` / `caption`:

```json
{ "file": "photos/2026-11-19-ic405-plamtecica.jpg",
  "title": "IC 405 Plamteća zvijezda",
  "date": "2026-11-19",
  "caption": "53 min integracije · AI enhanced izvoz" }
```

Skripta čuva tvoje `title`/`date`/`caption` — ponovno pokretanje ih ne briše.

## 4. Pogledaj lokalno

```bash
python3 -m http.server 8000   # → http://localhost:8000
```

Ili samo dvoklik na `index.html` — radi i preko `file://`.

U galeriji: klik na pločicu otvara sliku, klik na sliku otvara zumiranje
(kotačić/pinch, povlačenje za pomicanje, dvoklik za 1:1 ↔ 2.5×, Esc za izlaz).
Strelice ←/→ listaju slike.

## 5. Objavi (jednom)

```bash
git init -b main
git add .
git commit -m "Add astro photo gallery"
gh auth login                                   # ako još nisi
gh repo create my-astro-photos --public --source=. --push
```

Zatim na GitHubu: **Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)` → Save**.
Nakon minute-dvije stranica je na `https://<username>.github.io/my-astro-photos/`.

Kasnije je objava samo:

```bash
./publish.sh "Nove slike: IC405"
```

## Napomene

- **Ne committaj `masters/` ni `raw/`** — GitHub Pages ima soft limit ~1 GB po
  repozitoriju i ~100 GB prometa mjesečno. Web verzije su znatno manje.
- Puna rezolucija (TIFF/FITS, 100+ MB) drži izvan repoa.
- Ako promet postane problem: isti folder ide na Cloudflare Pages (besplatno,
  neograničen promet) bez promjene ijedne linije koda.
