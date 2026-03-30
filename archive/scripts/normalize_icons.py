#!/usr/bin/env python3
"""
SVG Icon Normalizer

Converts raw SVG icons to canonical format:
- Removes xmlns, doctype, comments
- Removes dimensions (width/height attributes on root)
- Sets viewBox to 0 0 24 24
- Converts colors to currentColor
- Sets stroke-based icon attributes

Equivalent to the SVGO config provided.
"""

import os
import re
from pathlib import Path

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════════════════════════

SRC = Path(__file__).parent.parent / "icons" / "raw"
OUT = Path(__file__).parent.parent / "icons" / "canonical"

# Canonical SVG attributes for stroke-based icons
CANONICAL_ATTRS = {
    "width": "24",
    "height": "24",
    "viewBox": "0 0 24 24",
    "stroke": "currentColor",
    "stroke-width": "1.5",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "fill": "none",
}

# ═══════════════════════════════════════════════════════════════════════════════
# SVG PROCESSING
# ═══════════════════════════════════════════════════════════════════════════════

def normalize_svg(svg_content: str) -> str:
    """
    Normalize an SVG to canonical format.
    
    Transformations:
    1. Remove XML declaration and doctype
    2. Remove comments
    3. Remove xmlns attributes
    4. Remove width/height from root SVG
    5. Extract and preserve viewBox (or use default)
    6. Convert fill colors to currentColor or none
    7. Add canonical stroke attributes
    """
    
    # Remove XML declaration
    svg_content = re.sub(r'<\?xml[^?]*\?>\s*', '', svg_content)
    
    # Remove doctype
    svg_content = re.sub(r'<!DOCTYPE[^>]*>\s*', '', svg_content, flags=re.IGNORECASE)
    
    # Remove comments
    svg_content = re.sub(r'<!--.*?-->', '', svg_content, flags=re.DOTALL)
    
    # Extract existing viewBox if present
    viewbox_match = re.search(r'viewBox=["\']([^"\']+)["\']', svg_content)
    original_viewbox = viewbox_match.group(1) if viewbox_match else None
    
    # Extract the SVG content (everything between <svg> tags)
    inner_match = re.search(r'<svg[^>]*>(.*)</svg>', svg_content, flags=re.DOTALL | re.IGNORECASE)
    inner_content = inner_match.group(1).strip() if inner_match else ""
    
    # Process inner content - convert colors to currentColor
    # Replace fill="color" with fill="currentColor" (except fill="none")
    inner_content = re.sub(
        r'fill=["\'](?!none)[^"\']*["\']',
        'fill="currentColor"',
        inner_content
    )
    
    # Replace stroke="color" with stroke="currentColor" (except stroke="none")  
    inner_content = re.sub(
        r'stroke=["\'](?!none)[^"\']*["\']',
        'stroke="currentColor"',
        inner_content
    )
    
    # Remove any style attributes that set colors
    inner_content = re.sub(
        r'style=["\'][^"\']*(?:fill|stroke):[^"\']*["\']',
        '',
        inner_content
    )
    
    # Build canonical SVG
    # Use original viewBox if it exists and looks valid, otherwise use default
    viewbox = original_viewbox if original_viewbox else CANONICAL_ATTRS["viewBox"]
    
    attrs = [
        f'width="{CANONICAL_ATTRS["width"]}"',
        f'height="{CANONICAL_ATTRS["height"]}"',
        f'viewBox="{viewbox}"',
        f'stroke="{CANONICAL_ATTRS["stroke"]}"',
        f'stroke-width="{CANONICAL_ATTRS["stroke-width"]}"',
        f'stroke-linecap="{CANONICAL_ATTRS["stroke-linecap"]}"',
        f'stroke-linejoin="{CANONICAL_ATTRS["stroke-linejoin"]}"',
        f'fill="{CANONICAL_ATTRS["fill"]}"',
    ]
    
    canonical_svg = f'<svg {" ".join(attrs)}>{inner_content}</svg>'
    
    # Clean up whitespace
    canonical_svg = re.sub(r'\s+', ' ', canonical_svg)
    canonical_svg = re.sub(r'>\s+<', '><', canonical_svg)
    canonical_svg = canonical_svg.strip()
    
    return canonical_svg


def process_icons():
    """Process all SVG files in the source directory."""
    
    print("=" * 60)
    print("SVG Icon Normalizer")
    print("=" * 60)
    print(f"Source: {SRC}")
    print(f"Output: {OUT}")
    print()
    
    # Ensure source exists
    if not SRC.exists():
        print(f"Error: Source directory does not exist: {SRC}")
        print("Run the Figma export script first, or add SVGs to icons/raw/")
        return
    
    # Create output directory
    OUT.mkdir(parents=True, exist_ok=True)
    
    # Process each SVG
    svg_files = list(SRC.glob("*.svg"))
    
    if not svg_files:
        print("No SVG files found in source directory.")
        return
    
    success_count = 0
    error_count = 0
    
    for svg_path in sorted(svg_files):
        filename = svg_path.name
        
        try:
            # Read input
            svg_content = svg_path.read_text(encoding='utf-8')
            
            # Normalize
            normalized = normalize_svg(svg_content)
            
            # Write output
            output_path = OUT / filename
            output_path.write_text(normalized, encoding='utf-8')
            
            print(f"✓ {filename}")
            success_count += 1
            
        except Exception as e:
            print(f"✗ {filename}: {e}")
            error_count += 1
    
    print()
    print(f"Processed {success_count} icons successfully")
    if error_count:
        print(f"Errors: {error_count}")


if __name__ == "__main__":
    process_icons()
