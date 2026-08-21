#!/usr/bin/env python3
import argparse
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EXCLUDE_NAMES = {"LICENSE", ".source-baseline"}
EXCLUDE_SUFFIXES = {".md", ".py", ".pyc"}
EXCLUDE_PARTS = {"scripts", "__pycache__", ".git"}


def should_include(path: Path, extension_dir: Path) -> bool:
    rel = path.relative_to(extension_dir)
    if any(part in EXCLUDE_PARTS for part in rel.parts):
        return False
    if path.name in EXCLUDE_NAMES:
        return False
    if path.suffix.lower() in EXCLUDE_SUFFIXES:
        return False
    return path.is_file()


def main() -> None:
    parser = argparse.ArgumentParser(description="Package one canonical GoreeCloud Firefox extension.")
    parser.add_argument("slug", help="Extension directory name under extensions/")
    parser.add_argument("--output-dir", default="dist", help="Output directory relative to repository root")
    args = parser.parse_args()

    extension_dir = ROOT / "extensions" / args.slug
    manifest_path = extension_dir / "manifest.json"
    if not manifest_path.is_file():
        raise SystemExit(f"Unknown extension or missing manifest: {args.slug}")

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    version = manifest["version"]
    output_dir = ROOT / args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)
    output = output_dir / f"goreecloud-{args.slug}-{version}.xpi"

    files = sorted(
        path for path in extension_dir.rglob("*")
        if should_include(path, extension_dir)
    )

    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in files:
            rel = path.relative_to(extension_dir).as_posix()
            info = zipfile.ZipInfo(rel, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, path.read_bytes())

    with zipfile.ZipFile(output) as archive:
        bad = archive.testzip()
        if bad:
            raise SystemExit(f"Package integrity failure: {bad}")
        if "manifest.json" not in archive.namelist():
            raise SystemExit("Package does not contain manifest.json at archive root")

    print(output.relative_to(ROOT))


if __name__ == "__main__":
    main()
