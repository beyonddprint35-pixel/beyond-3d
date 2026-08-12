#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys

ROOT = Path.cwd()
if (ROOT / "frontend" / "src").exists():
    FRONTEND = ROOT / "frontend"
elif (ROOT / "src").exists() and (ROOT / "package.json").exists():
    FRONTEND = ROOT
else:
    print("ERROR: Run this from /workspaces/beyond-3d or /workspaces/beyond-3d/frontend")
    sys.exit(1)

SRC = FRONTEND / "src"
COMP = SRC / "components"
HERE = Path(__file__).resolve().parent

community_component_path = COMP / "BeyondCommunity.jsx"
community_css_path = COMP / "BeyondCommunity.css"
community_store_path = SRC / "lib" / "communityStore.js"
creator_path = COMP / "BeyondCreator.jsx"
creator_import_path = COMP / "creatorImport.js"

required_helper_files = [
    HERE / "BeyondCommunity.jsx",
    HERE / "BeyondCommunity.css",
    HERE / "communityStore.js",
    HERE / "supabase-projects.sql",
]

for path in required_helper_files:
    if not path.exists():
        print(f"ERROR: Required helper file is missing: {path}")
        sys.exit(1)

for path in [community_component_path, community_css_path, community_store_path]:
    if not path.exists():
        print(f"ERROR: Required current Community file is missing: {path}")
        sys.exit(1)

backup_dir = FRONTEND / ".beyond-backups" / "community-current"
backup_dir.mkdir(parents=True, exist_ok=True)
for path in [community_component_path, community_css_path, community_store_path]:
    shutil.copy2(path, backup_dir / path.name)

# Community Saved-creations update. Preserve Creator, Architect, camera-lock and AI Remix.
shutil.copy2(HERE / "BeyondCommunity.jsx", community_component_path)
shutil.copy2(HERE / "BeyondCommunity.css", community_css_path)
shutil.copy2(HERE / "communityStore.js", community_store_path)

community_text = community_component_path.read_text()
store_text = community_store_path.read_text()
css_text = community_css_path.read_text()
creator_text = creator_path.read_text() if creator_path.exists() else ""
import_text = creator_import_path.read_text() if creator_import_path.exists() else ""

checks = {
    "Saved creations marker": "BEYOND_COMMUNITY_SAVED_CREATIONS" in community_text,
    "Saved filter": '["saved", "Saved"]' in community_text,
    "Bookmark card action": "community-save" in community_text and "toggleSave" in community_text,
    "Bookmark detail action": '"Saved" : "Save"' in community_text,
    "Private saves store": "listCommunitySaves" in store_text and "setCommunitySave" in store_text,
    "Saved table SQL": "create table if not exists public.community_saves" in (HERE / "supabase-projects.sql").read_text(),
    "Saves are private": 'community_saves_select_own' in (HERE / "supabase-projects.sql").read_text(),
    "Saved cannot break Community load": "Saved creations unavailable" in community_text,
    "Activity preserved": "community-activity-button" in community_text,
    "Search preserved": "community-search" in community_text,
    "Following preserved": '["following", "Following"]' in community_text,
    "Comments preserved": "community-comment-form" in community_text,
    "Publication editor preserved": "community-publication-editor" in community_text,
    "Working AI Remix listener preserved": "BEYOND_COMMUNITY_AI_REMIX_IMPORT_V7" in creator_text,
    "Working GLB importer preserved": "prepareAiGlbGeometry" in import_text and "GLTFLoader" in import_text,
}

print("\nBEYOND Community Saved creations applied.\n")
print("Verification:")
failed = False
for label, ok in checks.items():
    print(f"  {'OK' if ok else 'MISSING'}: {label}")
    failed = failed or not ok

print(f"\nBackup: {backup_dir}")

if failed:
    print("\nWARNING: One or more checks are missing. Send this terminal output before testing.")
    sys.exit(2)

print("\nSupabase SQL update required: run supabase-projects.sql once to add private community_saves.")
print("Restart Vite, then test Save/Unsave and the Saved filter.")
