#!/usr/bin/env python3
"""Build web-sized images and gallery-data.js for the GitHub Pages gallery.

Usage:
    python3 scripts/build_gallery.py [masters-dir]

Masters default to ./masters - only the finished, watermarked Seestar exports
go there. Every JPEG/PNG/TIFF is resized twice (big for the lightbox, small
for the filmstrip) into ./photos and listed in ./gallery-data.js. Sources
smaller than the target size are never upscaled.

A trailing integration stamp on the file name groups versions of the same
object, e.g. `2026-11-19_ic405-plamtecica-53m.jpg` and
`2026-11-19_ic405-plamtecica-20m.jpg` both belong to `ic405-plamtecica`; the
page shows one card per object and puts the longest exposure on the cover.

Titles, dates and captions already written into gallery-data.js are preserved
across runs; edits to that file are never overwritten.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PHOTOS_DIR = ROOT / "photos"
THUMBS_DIR = PHOTOS_DIR / "thumbs"
DATA_FILE = ROOT / "gallery-data.js"

DATA_PREFIX = "window.GALLERY_DATA = "
FULL_MAX_PX = 3840
THUMB_MAX_PX = 640
FULL_QUALITY = 88
THUMB_QUALITY = 80
SOURCE_SUFFIXES = {".jpg", ".jpeg", ".png", ".tif", ".tiff"}

# A trailing integration stamp on the file name groups versions of one object:
#   2026-11-19_ic405-plamtecica-53m.jpg     -> group `ic405-plamtecica`, 53 min
#   2026-11-18_m42-orion-397x10s.jpg        -> group `m42-orion`, 66.2 min
# An optional label after the stamp separates versions of the same length:
#   2026-11-18_m27-dumbbell-7m-crop.jpg     -> group `m27-dumbbell`, 7 min, "crop"
#   2026-11-18_m27-dumbbell-7m-wide.jpg     -> group `m27-dumbbell`, 7 min, "wide"
# A double dash adds a label without an integration time (zoom, processing...):
#   2026-11-18_moon--2x.jpg                 -> group `moon`, no time, "2x"
VARIANT_RE = re.compile(
    r"^(?P<base>.+?)(?:--(?P<only>[a-z0-9]+(?:-[a-z0-9]+)*)"
    r"|-(?:(?P<count>\d+(?:\.\d+)?)x(?P<seconds>\d+(?:\.\d+)?)s"
    r"|(?P<minutes>\d+(?:\.\d+)?)m)(?:-(?P<label>[a-z0-9]+(?:-[a-z0-9]+)*))?)$"
)

def die(message: str) -> None:
    print(f"error: {message}", file=sys.stderr)
    raise SystemExit(1)


def require_sips() -> None:
    if shutil.which("sips") is None:
        die("`sips` not found - run this on macOS, or install ImageMagick and change the resize step")


def slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


def split_variant(stem: str) -> tuple[str, float | None, str]:
    """Separate an integration stamp (and its optional label) from the object name."""
    match = VARIANT_RE.match(stem)
    if match is None:
        return stem, None, ""
    if match.group("minutes") is not None:
        minutes = float(match.group("minutes"))
    elif match.group("count") is not None:
        minutes = float(match.group("count")) * float(match.group("seconds")) / 60
    else:
        minutes = None  # label-only variant, no integration stamp
    label = (match.group("only") or match.group("label") or "").replace("-", " ")
    return match.group("base"), (round(minutes, 1) if minutes is not None else None), label


ASTRO_PREFIXES = re.compile(r"^(ngc|ic|sh2|ldn|vdb|abell|pgc|arp|m)(\d.*)$", re.IGNORECASE)


def titleize(name: str) -> str:
    words = [word for word in re.split(r"[_\-\s]+", name) if word]
    pretty = []
    for word in words:
        prefix = ASTRO_PREFIXES.match(word)
        if prefix:
            pretty.append(prefix.group(1).upper() + prefix.group(2))
        elif word.isupper() and len(word) <= 6:
            pretty.append(word)
        elif any(char.islower() for char in word) and any(char.isupper() for char in word):
            pretty.append(word)  # keep camelCase tokens
        else:
            pretty.append(word.capitalize())
    return " ".join(pretty)


def split_name(stem: str) -> tuple[str | None, str]:
    """Split `2025-11-15_m31-andromeda` into (date, title)."""
    match = re.match(r"^(\d{4}-\d{2}-\d{2})[_\-\s]*(.*)$", stem)
    if not match:
        return None, titleize(stem)
    date, rest = match.group(1), match.group(2)
    return date, titleize(rest) if rest else titleize(stem)


def load_existing() -> dict[str, dict]:
    if not DATA_FILE.exists():
        return {}
    text = DATA_FILE.read_text(encoding="utf-8").strip()
    if not text.startswith(DATA_PREFIX):
        return {}
    payload = text[len(DATA_PREFIX):].rstrip().rstrip(";")
    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        print("warning: gallery-data.js is not valid JSON, starting fresh", file=sys.stderr)
        return {}
    return {entry["file"]: entry for entry in data.get("photos", []) if entry.get("file")}


def resize(source: Path, target: Path, max_px: int, quality: int) -> None:
    if target.exists() and target.stat().st_mtime >= source.stat().st_mtime:
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    width, height = dimensions(source)
    command = ["sips"]
    if max(width or 0, height or 0) > max_px:
        command += ["-Z", str(max_px)]
    command += [
        "-s", "format", "jpeg",
        "-s", "formatOptions", str(quality),
        str(source),
        "--out", str(target),
    ]
    subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


@lru_cache(maxsize=None)
def dimensions(path: Path) -> tuple[int | None, int | None]:
    """Intrinsic size of an image, so the grid reserves space while loading."""
    result = subprocess.run(
        ["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    values = dict(re.findall(r"(pixel\w+):\s*(\d+)", result.stdout))
    width = values.get("pixelWidth")
    height = values.get("pixelHeight")
    return (int(width) if width else None, int(height) if height else None)


def main() -> None:
    require_sips()

    masters_dir = Path(sys.argv[1]).expanduser().resolve() if len(sys.argv) > 1 else ROOT / "masters"
    if not masters_dir.is_dir():
        die(f"masters directory not found: {masters_dir} (put your exported JPEG/TIFF files there)")

    masters = sorted(
        path for path in masters_dir.iterdir()
        if path.is_file() and path.suffix.lower() in SOURCE_SUFFIXES and not path.name.startswith(".")
    )
    if not masters:
        die(f"no images found in {masters_dir}")

    existing = load_existing()
    photos: list[dict] = []

    for source in masters:
        slug = slugify(source.stem)
        group, integration, variant = split_variant(source.stem)
        full = PHOTOS_DIR / f"{slug}.jpg"
        thumb = THUMBS_DIR / f"{slug}.jpg"

        resize(source, full, FULL_MAX_PX, FULL_QUALITY)
        resize(source, thumb, THUMB_MAX_PX, THUMB_QUALITY)

        rel_full = full.relative_to(ROOT).as_posix()
        rel_thumb = thumb.relative_to(ROOT).as_posix()
        previous = existing.get(rel_full, {})
        date, default_title = split_name(group)
        width, height = dimensions(thumb)

        photos.append(
            {
                "file": rel_full,
                "thumb": rel_thumb,
                "title": previous.get("title") or default_title,
                "title_hr": previous.get("title_hr", ""),
                "date": previous.get("date", date),
                "time": previous.get("time", ""),
                "caption": previous.get("caption", ""),
                "caption_hr": previous.get("caption_hr", ""),
                "group": slugify(default_title),
                "integration": integration,
                "variant": variant,
                "width": width,
                "height": height,
            }
        )

    photos.sort(key=lambda entry: (entry.get("date") or "", entry["file"]))

    expected = {entry["file"] for entry in photos} | {entry["thumb"] for entry in photos}
    orphans = sorted(
        path.relative_to(ROOT).as_posix()
        for directory in (PHOTOS_DIR, THUMBS_DIR)
        if directory.is_dir()
        for path in directory.glob("*.jpg")
        if path.relative_to(ROOT).as_posix() not in expected
    )

    payload = {"photos": photos}
    DATA_FILE.write_text(
        DATA_PREFIX + json.dumps(payload, indent=2, ensure_ascii=False) + ";\n",
        encoding="utf-8",
    )

    print(f"masters : {masters_dir}")
    print(f"photos  : {len(photos)} listed -> {PHOTOS_DIR}")
    print(f"data    : {DATA_FILE.name}")
    for entry in photos:
        print(f"  {entry['file']}")
    if orphans:
        print(f"note    : {len(orphans)} stale image(s) left in photos/ (not referenced anymore)")


if __name__ == "__main__":
    main()
