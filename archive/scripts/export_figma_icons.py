#!/usr/bin/env python3
"""
Figma Icon Exporter

Exports all icons from a Figma page as individual SVG files.

Export rules:
- Format: SVG
- Do not outline strokes (preserves strokes)
- Do not flatten (preserves paths)
- Use frame bounds, not selection bounds
- One SVG per icon

Usage:
    python export_figma_icons.py

Required environment variable:
    FIGMA_TOKEN - Your Figma personal access token
    
Or edit the CONFIG section below.
"""

import os
import re
import sys
import json
import time
import urllib.request
import urllib.error
from pathlib import Path

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIG - Edit these values
# ═══════════════════════════════════════════════════════════════════════════════

# Your Figma personal access token (get from Figma > Settings > Personal Access Tokens)
FIGMA_TOKEN = os.environ.get("FIGMA_TOKEN", "")

# The Figma file key (from the URL: figma.com/file/FILE_KEY/...)
FILE_KEY = "OjCGZd7Ct7w42kI74xEAuH"

# The page name containing icons to export
PAGE_NAME = "Icons — Export"

# Output directory for exported SVGs
OUTPUT_DIR = Path(__file__).parent.parent / "icons" / "raw"

# Export settings
EXPORT_SETTINGS = {
    "format": "svg",
    "svg_outline_text": False,      # Don't outline text
    "svg_include_id": False,        # Don't include IDs
    "svg_include_node_id": False,   # Don't include node IDs
    "svg_simplify_stroke": False,   # Don't simplify/outline strokes (PRESERVE STROKES)
    "use_absolute_bounds": True,    # Use frame bounds, not selection bounds
}

# ═══════════════════════════════════════════════════════════════════════════════
# FIGMA API HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def figma_request(endpoint: str) -> dict:
    """Make an authenticated request to the Figma API."""
    url = f"https://api.figma.com/v1/{endpoint}"
    headers = {"X-Figma-Token": FIGMA_TOKEN}
    
    req = urllib.request.Request(url, headers=headers)
    
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"Error: HTTP {e.code} - {e.reason}")
        if e.code == 403:
            print("Check your FIGMA_TOKEN is valid and has access to this file.")
        sys.exit(1)


def get_file_structure(file_key: str) -> dict:
    """Get the full file structure from Figma."""
    print(f"Fetching file structure for {file_key}...")
    return figma_request(f"files/{file_key}")


def find_page_by_name(document: dict, page_name: str) -> dict | None:
    """Find a page in the document by name."""
    for page in document.get("children", []):
        if page.get("name") == page_name:
            return page
    return None


def collect_icon_frames(node: dict, icons: list, depth: int = 0) -> None:
    """
    Recursively collect all frames that appear to be icons.
    
    Icons are identified as:
    - FRAME or COMPONENT type
    - At the top level of the page (depth == 0) or inside a section
    - Have reasonable icon-like dimensions
    """
    node_type = node.get("type", "")
    name = node.get("name", "")
    
    # Skip hidden nodes
    if node.get("visible") == False:
        return
    
    # Collect frames/components at depth 0 or 1 (direct children or in sections)
    if node_type in ("FRAME", "COMPONENT", "COMPONENT_SET") and depth <= 1:
        # Get absolute bounds if available
        bounds = node.get("absoluteBoundingBox", {})
        width = bounds.get("width", 0)
        height = bounds.get("height", 0)
        
        # Typical icon sizes: 12, 16, 20, 24, 28, 32, 48, etc.
        if 8 <= width <= 128 and 8 <= height <= 128:
            icons.append({
                "id": node.get("id"),
                "name": name,
                "width": width,
                "height": height,
            })
            return  # Don't recurse into icon frames
    
    # Recurse into children
    for child in node.get("children", []):
        new_depth = depth + 1 if node_type in ("SECTION", "FRAME") else depth
        collect_icon_frames(child, icons, new_depth)


def sanitize_filename(name: str) -> str:
    """Convert a frame name to a valid filename."""
    # Replace special characters with underscores
    safe = re.sub(r'[<>:"/\\|?*]', '_', name)
    # Replace spaces and multiple underscores
    safe = re.sub(r'\s+', '_', safe)
    safe = re.sub(r'_+', '_', safe)
    # Remove leading/trailing underscores
    safe = safe.strip('_')
    return safe or "unnamed"


def export_icons(file_key: str, icons: list) -> None:
    """Export all icons as SVG files."""
    if not icons:
        print("No icons found to export.")
        return
    
    print(f"\nExporting {len(icons)} icons...")
    
    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Build export URL parameters
    ids = ",".join(icon["id"] for icon in icons)
    params = [
        f"ids={ids}",
        f"format={EXPORT_SETTINGS['format']}",
        f"svg_outline_text={'true' if EXPORT_SETTINGS['svg_outline_text'] else 'false'}",
        f"svg_include_id={'true' if EXPORT_SETTINGS['svg_include_id'] else 'false'}",
        f"svg_simplify_stroke={'true' if EXPORT_SETTINGS['svg_simplify_stroke'] else 'false'}",
        f"use_absolute_bounds={'true' if EXPORT_SETTINGS['use_absolute_bounds'] else 'false'}",
    ]
    
    endpoint = f"images/{file_key}?{'&'.join(params)}"
    
    print("Requesting export URLs from Figma...")
    result = figma_request(endpoint)
    
    if result.get("err"):
        print(f"Error from Figma: {result['err']}")
        sys.exit(1)
    
    images = result.get("images", {})
    
    # Download each SVG
    success_count = 0
    for icon in icons:
        node_id = icon["id"]
        name = icon["name"]
        url = images.get(node_id)
        
        if not url:
            print(f"  ✗ No URL for: {name}")
            continue
        
        filename = sanitize_filename(name) + ".svg"
        filepath = OUTPUT_DIR / filename
        
        try:
            # Download the SVG
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req) as response:
                svg_content = response.read().decode('utf-8')
            
            # Save to file
            filepath.write_text(svg_content, encoding='utf-8')
            print(f"  ✓ {filename}")
            success_count += 1
            
            # Small delay to be nice to the server
            time.sleep(0.05)
            
        except Exception as e:
            print(f"  ✗ {filename}: {e}")
    
    print(f"\nExported {success_count}/{len(icons)} icons to {OUTPUT_DIR}")


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 60)
    print("Figma Icon Exporter")
    print("=" * 60)
    
    # Validate config
    if FIGMA_TOKEN == "YOUR_TOKEN_HERE" or not FIGMA_TOKEN:
        print("\nError: Please set your FIGMA_TOKEN")
        print("  Option 1: Set environment variable: export FIGMA_TOKEN=your_token")
        print("  Option 2: Edit this script and set FIGMA_TOKEN directly")
        print("\nGet your token from: Figma > Settings > Personal Access Tokens")
        sys.exit(1)
    
    if FILE_KEY == "YOUR_FILE_KEY_HERE":
        print("\nError: Please set your FILE_KEY")
        print("  The file key is in the Figma URL: figma.com/file/FILE_KEY/...")
        sys.exit(1)
    
    # Get file structure
    file_data = get_file_structure(FILE_KEY)
    document = file_data.get("document", {})
    
    # Find the icons page
    print(f"Looking for page: '{PAGE_NAME}'...")
    page = find_page_by_name(document, PAGE_NAME)
    
    if not page:
        print(f"\nError: Page '{PAGE_NAME}' not found.")
        print("\nAvailable pages:")
        for p in document.get("children", []):
            print(f"  - {p.get('name')}")
        sys.exit(1)
    
    print(f"Found page: {page.get('name')} (ID: {page.get('id')})")
    
    # Collect all icon frames
    icons = []
    collect_icon_frames(page, icons)
    
    print(f"\nFound {len(icons)} icons:")
    for icon in icons[:10]:
        print(f"  - {icon['name']} ({icon['width']}x{icon['height']})")
    if len(icons) > 10:
        print(f"  ... and {len(icons) - 10} more")
    
    # Export icons
    export_icons(FILE_KEY, icons)


if __name__ == "__main__":
    main()
