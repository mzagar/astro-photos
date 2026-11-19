# Astro photos — Donja Stubica

A small static gallery of my deep sky photographs, shot from a backyard in
Donja Stubica, Croatia with a ZWO Seestar S50 Pro.

**Live site: <https://mzagar.github.io/astro-photos/>**

## What this is

- Kept locally in `masters/`: the finished, watermarked exports from the Seestar app.
- `scripts/build_gallery.py` resizes each export into `photos/` (up to 2560 px) and
  `photos/thumbs/` (640 px), then regenerates `gallery-data.js`.
- `index.html` is the whole site: plain HTML, CSS and JavaScript, no framework,
  no build step, no external dependencies. It renders the tile grid, the lightbox
  and the fullscreen pan-and-zoom viewer.

Photographs of the same object are grouped into a single tile. The longest total
integration becomes the cover; the other versions are offered as buttons inside
the lightbox.

## Repository layout

```
index.html                 the site — layout, lightbox, zoom
gallery-data.js            generated index: titles, dates, captions
photos/                    web-sized images, photos/thumbs/ for the grid
scripts/build_gallery.py   resize and regenerate the data file (macOS `sips`)
scripts/check_site.js      smoke-test for the page logic, no browser needed
publish.sh                 build, commit, push
```

## Run it locally

```bash
python3 scripts/build_gallery.py   # after dropping new exports into masters/
python3 -m http.server 8000        # http://localhost:8000
```

The page also works when opened directly from `file://`.

## Adding a photo

Save the export as `masters/YYYY-MM-DD_object-<minutes>m.jpg`, run the build, then
write its title and caption in `gallery-data.js`. The rules for naming, grouping
and publishing are in [AGENTS.md](AGENTS.md).

## Credits

Photographs © Mario Žagar. The site code is free to reuse.
