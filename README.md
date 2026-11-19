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
  └── thumbs/       thumbnail, do 640 px (koristi ga filmstrip)
index.html          landing page (intro + setup) + filmstrip + lightbox + fullscreen zumiranje
                    (vanilla JS, bez ovisnosti; tekst introa je obični HTML u ovoj datoteci)
gallery-data.js     naslovi/opisi - generira se, ali ga smiješ uređivati
```

Na stranicu idu **samo** datoteke iz `masters/`. Ako nešto ne želiš objaviti,
ostavi to u `raw/`.

## 1. Dodaj sliku

```bash
cp ~/Desktop/Seestar_izvoz.jpg masters/2026-11-19_ic405.jpg
```

Ime datoteke daje naslov i datum, a završni `-<minute>m` (ili `-<broj>x<sekunde>s`)
dodaje trajanje integracije i **grupira verzije istog objekta**:

| datoteka | naslov | datum | grupa | trajanje |
|---|---|---|---|---|
| `2026-11-18_m42-orion-6m.jpg` | M42 Orion | 2026-11-18 | `m42-orion` | 6 min |
| `2026-11-19_m42-orion-73m.jpg` | M42 Orion | 2026-11-19 | `m42-orion` | 73 min |
| `2026-11-19_ic405-plamtecica-53m.jpg` | IC405 Plamtecica | 2026-11-19 | `ic405-plamtecica` | 53 min |
| `2026-11-14_m31-andromeda-397x10s.jpg` | M31 Andromeda | 2026-11-14 | `m31-andromeda` | 66.2 min |
| `2026-11-18_m27-dumbbell-7m-crop.jpg` | M27 Dumbbell | 2026-11-18 | `m27-dumbbell` | 7 min |
| `2026-11-18_m27-dumbbell-7m-wide.jpg` | M27 Dumbbell | 2026-11-18 | `m27-dumbbell` | 7 min |
| `mjesec.jpg` | Mjesec | — | `mjesec` | — |

Sve datoteke s istim dijelom prije trajanja idu u **jednu karticu**. Na naslovnici
je uvijek **najdulja ekspozicija**, a ostale se nude kao gumbi u lightboxu
(`Exposures`). Datum u kartici je datum te naslovne ekspozicije.

Kad su dvije verzije **iste duljine** (npr. drugačiji crop), dodaj oznaku iza
trajanja: `-7m-crop` i `-7m-wide`. Naslovnica je tada ona bez oznake, a ako su
obje označene, prva po abecedi (`crop` prije `wide`). U lightboxu se gumbi
razlikuju: `7 min · crop` i `7 min · wide`.

Kad verzije **nemaju trajanje** (zoom, drugačija obrada), koristi dvostruku
critcu: `--1x`, `--2x`, `--4x`. Grupiraju se po objektu, gumbi u lightboxu
nose samo oznaku, a redoslijed je brojčani (`1x`, `2x`, `4x`, `10x`).

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
  "title": "IC 405 — Flaming Star Nebula",
  "date": "2026-11-19",
  "caption": "53 min of integration · AI-enhanced Seestar export" }
```

Skripta čuva tvoje `title`/`date`/`time`/`caption` — ponovno pokretanje ih ne briše.
`time` (`"20:23"`) je neobavezan i služi samo za redoslijed unutar iste noći.

**Redoslijed na stranici:** kartice idu od najstarije snimke prema najnovijoj
(`date` + `time` naslovne ekspozicije).

Naslov sajta, podnaslov, intro i footer mijenjaš u `index.html` (intro tekst) i u
`SITE` rječniku na vrhu `scripts/build_gallery.py` (title/subtitle/footer).
Stranica je na engleskom.

## 4. Pogledaj lokalno

```bash
python3 -m http.server 8000   # → http://localhost:8000
```

Ili samo dvoklik na `index.html` — radi i preko `file://`.

U galeriji: slike su u vodoravnom filmstripu (scroll, drag ili strelice ‹ › na
desktopu). Klik na sličicu otvara lightbox s punom slikom i opisom, klik na
veliku sliku otvara zumiranje (kotačić/pinch, povlačenje za pomicanje, dvoklik
za 1:1 ↔ 2.5×, Esc za izlaz). Strelice ←/→ listaju slike u lightboxu.

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

## Licenca i prava

Slike su zaštićene autorskim pravom čim nastanu (Bernska konvencija i Zakon o
autorskom pravu i srodnim pravima) — registracija ne postoji i ne treba ti
`LICENSE` datoteka da bi ih posjedovao. **Namjerno je nema:** svaka licenca u
repou je *dozvola* drugima, a ne zaštita.

- Footer nosi samo `© <godina> Mario Žagar`; godina se puni JS-om pri učitavanju.
  To je uobičajena amaterska formulacija — pravo vrijedi po zakonu i bez nje,
  pa nema `All rights reserved` ni paragrafa o zabrani reproduciranja.
- Watermark u slici i smanjena rezolucija (do 2560 px) su jedina stvarna zaštita;
  sve što je na javnom webu može se skinuti.
- Ako ikad poželiš unaprijed dati dozvolu (npr. dijeljenje uz potpis), standard u
  astro sceni je **CC BY-NC 4.0** — tada link ide u footer, a `LICENSE` nije
  potreban.
- Ako jednog dana želiš da drugi smiju koristiti **kod** (HTML/JS/skripte), dodaj
  `LICENSE` s MIT licencom i u README napiši da se slike ne pokrivaju.

## Napomene

- **Ne committaj `masters/` ni `raw/`** — GitHub Pages ima soft limit ~1 GB po
  repozitoriju i ~100 GB prometa mjesečno. Web verzije su znatno manje.
- Puna rezolucija (TIFF/FITS, 100+ MB) drži izvan repoa.
- Ako promet postane problem: isti folder ide na Cloudflare Pages (besplatno,
  neograničen promet) bez promjene ijedne linije koda.
