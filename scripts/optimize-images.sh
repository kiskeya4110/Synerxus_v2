#!/bin/bash

# =============================================================================
# Image Optimization Script for Synerxus Platform
# =============================================================================
#
# This script optimizes images in the attached_assets directory by:
# 1. Converting PNG/JPG to WebP format (60-80% smaller)
# 2. Resizing oversized images to reasonable dimensions
# 3. Creating multiple sizes for responsive images
#
# Prerequisites:
#   - Install sharp-cli: npm install -g sharp-cli
#   - Or use cwebp: apt-get install webp
#
# Usage:
#   chmod +x scripts/optimize-images.sh
#   ./scripts/optimize-images.sh
#
# =============================================================================

set -e

# Configuration
INPUT_DIR="attached_assets"
OUTPUT_DIR="attached_assets/optimized"
MAX_WIDTH=1920
MAX_HEIGHT=1080
QUALITY=80

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Image Optimization Script ===${NC}"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/webp"
mkdir -p "$OUTPUT_DIR/thumbnails"

# Function to get file size in human readable format
get_size() {
    du -h "$1" 2>/dev/null | cut -f1
}

# Function to optimize a single image
optimize_image() {
    local input_file="$1"
    local filename=$(basename "$input_file")
    local name="${filename%.*}"
    local ext="${filename##*.}"

    echo -e "${YELLOW}Processing: $filename${NC}"

    # Get original size
    local original_size=$(get_size "$input_file")
    echo "  Original size: $original_size"

    # Check if sharp-cli is available
    if command -v sharp &> /dev/null; then
        # Use sharp for conversion (best quality)

        # Convert to WebP
        sharp -i "$input_file" -o "$OUTPUT_DIR/webp/${name}.webp" -- webp -q $QUALITY 2>/dev/null || true

        # Create thumbnail (400px wide)
        sharp -i "$input_file" -o "$OUTPUT_DIR/thumbnails/${name}_thumb.webp" -- resize 400 -- webp -q 75 2>/dev/null || true

        # Create medium size (800px wide)
        sharp -i "$input_file" -o "$OUTPUT_DIR/webp/${name}_medium.webp" -- resize 800 -- webp -q $QUALITY 2>/dev/null || true

    elif command -v cwebp &> /dev/null; then
        # Use cwebp for conversion (widely available)

        # Convert to WebP
        cwebp -q $QUALITY "$input_file" -o "$OUTPUT_DIR/webp/${name}.webp" 2>/dev/null || true

    elif command -v convert &> /dev/null; then
        # Use ImageMagick as fallback

        # Convert to WebP with resize
        convert "$input_file" -resize "${MAX_WIDTH}x${MAX_HEIGHT}>" -quality $QUALITY "$OUTPUT_DIR/webp/${name}.webp" 2>/dev/null || true

        # Create thumbnail
        convert "$input_file" -resize "400x400>" -quality 75 "$OUTPUT_DIR/thumbnails/${name}_thumb.webp" 2>/dev/null || true

    else
        echo -e "${RED}  No image processing tool found (sharp, cwebp, or convert)${NC}"
        echo "  Install one of: npm i -g sharp-cli, apt install webp, or apt install imagemagick"
        return 1
    fi

    # Report results
    if [ -f "$OUTPUT_DIR/webp/${name}.webp" ]; then
        local new_size=$(get_size "$OUTPUT_DIR/webp/${name}.webp")
        echo -e "  ${GREEN}WebP size: $new_size${NC}"
    fi
}

# Count images
total_images=$(find "$INPUT_DIR" -maxdepth 1 -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" \) | wc -l)
echo "Found $total_images images to optimize"
echo ""

# Process all PNG and JPG images
processed=0
for img in "$INPUT_DIR"/*.{png,PNG,jpg,JPG,jpeg,JPEG} 2>/dev/null; do
    if [ -f "$img" ]; then
        optimize_image "$img"
        ((processed++))
        echo ""
    fi
done

echo -e "${GREEN}=== Optimization Complete ===${NC}"
echo "Processed: $processed images"
echo "Output directory: $OUTPUT_DIR"
echo ""

# Summary of sizes
echo "=== Size Comparison ==="
echo ""
echo "Original images:"
du -sh "$INPUT_DIR"/*.{png,jpg,jpeg,PNG,JPG,JPEG} 2>/dev/null | sort -h | tail -5
echo ""

if [ -d "$OUTPUT_DIR/webp" ] && [ "$(ls -A $OUTPUT_DIR/webp 2>/dev/null)" ]; then
    echo "Optimized WebP images:"
    du -sh "$OUTPUT_DIR/webp"/*.webp 2>/dev/null | sort -h | tail -5
    echo ""
    echo "Total original size:"
    du -sh "$INPUT_DIR" 2>/dev/null
    echo "Total optimized size:"
    du -sh "$OUTPUT_DIR" 2>/dev/null
fi

echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Review optimized images in $OUTPUT_DIR"
echo "2. Update image references in code to use .webp files"
echo "3. Consider using <picture> element for fallback support"
echo ""
echo "Example usage in React:"
echo '  <picture>'
echo '    <source srcSet="/assets/image.webp" type="image/webp" />'
echo '    <img src="/assets/image.png" alt="Description" />'
echo '  </picture>'
