import json
import os
import zipfile
from datetime import datetime

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST_PATH = os.path.join(PROJECT_DIR, "manifest.json")
OUT_DIR = os.path.join(PROJECT_DIR, 'tools')

EXCLUDE_DIRS = {
    ".git",
    ".kilo",
    ".venv",
    "screenshots",
    "tools",
    "__pycache__",
}

EXCLUDE_FILES = {
    ".gitignore",
    "AGENTS.md",
    "PROJECT.md",
}

EXCLUDE_EXTENSIONS = {".zip"}


def get_version() -> str:
    with open(MANIFEST_PATH, "r", encoding="utf-8-sig") as f:
        manifest = json.load(f)
    return manifest["version"]


def collect_files() -> list[str]:
    files_to_include = []
    for root, dirs, files in os.walk(PROJECT_DIR):
        rel_root = os.path.relpath(root, PROJECT_DIR)
        if rel_root == ".":
            rel_root = ""

        parts = rel_root.split(os.sep) if rel_root else []
        if parts and parts[0] in EXCLUDE_DIRS:
            dirs[:] = []
            continue

        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

        for file in files:
            rel_path = os.path.join(rel_root, file) if rel_root else file
            if file in EXCLUDE_FILES:
                continue
            if any(file.endswith(ext) for ext in EXCLUDE_EXTENSIONS):
                continue
            files_to_include.append(os.path.join(PROJECT_DIR, rel_path))

    return files_to_include


def main() -> None:
    version = get_version()
    now = datetime.now()
    date_str = now.strftime("%Y%m%d")
    time_str = now.strftime("%H%M")
    archive_name = f"tablo_kanban_v{version}_{date_str}_{time_str}.zip"
    archive_path = os.path.join(OUT_DIR, archive_name)

    files = collect_files()

    os.makedirs(OUT_DIR, exist_ok=True)

    print(f"Creating archive: {archive_name}")
    print(f"Found {len(files)} files to include")

    with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for filepath in files:
            arcname = os.path.relpath(filepath, PROJECT_DIR)
            zf.write(filepath, arcname)

    print(f"Archive created: {archive_path}")
    print(f"Size: {os.path.getsize(archive_path) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
