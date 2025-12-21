/**
 * Optimize Existing Images Script
 *
 * This script processes all existing images in the uploads directory
 * and optimizes them using Sharp.
 *
 * Run with: npx tsx scripts/optimize-existing-images.ts
 *
 * Options:
 *   --dry-run    Show what would be done without making changes
 *   --webp       Also create WebP versions (25-30% smaller)
 */

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const BACKUP_DIR = path.join(process.cwd(), 'uploads_backup');
const ATTACHED_ASSETS_DIR = path.join(process.cwd(), 'attached_assets');
const STOCK_IMAGES_DIR = path.join(process.cwd(), 'client/src/assets/stock_images');

const OPTIMIZATION_CONFIG = {
  JPEG_QUALITY: 80,
  WEBP_QUALITY: 75,
  PNG_COMPRESSION: 8,
  MAX_DIMENSION: 2400,
};

const DRY_RUN = process.argv.includes('--dry-run');
const CREATE_WEBP = process.argv.includes('--webp');

interface OptimizationResult {
  file: string;
  originalSize: number;
  optimizedSize: number;
  savings: number;
  savingsPercent: number;
  skipped?: boolean;
  error?: string;
}

const results: OptimizationResult[] = [];
let totalOriginalSize = 0;
let totalOptimizedSize = 0;

async function optimizeImage(filePath: string): Promise<OptimizationResult> {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);

  // Skip non-image files
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    return {
      file: fileName,
      originalSize: 0,
      optimizedSize: 0,
      savings: 0,
      savingsPercent: 0,
      skipped: true,
    };
  }

  try {
    const originalBuffer = fs.readFileSync(filePath);
    const originalSize = originalBuffer.length;

    // Get image metadata
    const metadata = await sharp(originalBuffer).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;

    // Skip if already small
    if (originalSize < 50 * 1024) { // Less than 50KB
      return {
        file: fileName,
        originalSize,
        optimizedSize: originalSize,
        savings: 0,
        savingsPercent: 0,
        skipped: true,
      };
    }

    // Process based on format
    let optimizedBuffer: Buffer;

    if (ext === '.png' && metadata.hasAlpha) {
      // Keep PNG for transparency
      optimizedBuffer = await sharp(originalBuffer)
        .resize({
          width: Math.min(width, OPTIMIZATION_CONFIG.MAX_DIMENSION),
          height: Math.min(height, OPTIMIZATION_CONFIG.MAX_DIMENSION),
          fit: 'inside',
          withoutEnlargement: true,
        })
        .png({ compressionLevel: OPTIMIZATION_CONFIG.PNG_COMPRESSION })
        .toBuffer();
    } else {
      // Convert to optimized JPEG
      optimizedBuffer = await sharp(originalBuffer)
        .resize({
          width: Math.min(width, OPTIMIZATION_CONFIG.MAX_DIMENSION),
          height: Math.min(height, OPTIMIZATION_CONFIG.MAX_DIMENSION),
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: OPTIMIZATION_CONFIG.JPEG_QUALITY, mozjpeg: true })
        .toBuffer();
    }

    const optimizedSize = optimizedBuffer.length;
    const savings = originalSize - optimizedSize;
    const savingsPercent = (savings / originalSize) * 100;

    // Only save if there's actual savings
    if (savings > 0 && !DRY_RUN) {
      // Create backup
      const backupPath = filePath.replace(process.cwd(), BACKUP_DIR);
      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      fs.copyFileSync(filePath, backupPath);

      // Write optimized version
      fs.writeFileSync(filePath, optimizedBuffer);

      // Create WebP version if requested
      if (CREATE_WEBP) {
        const webpPath = filePath.replace(/\.\w+$/, '.webp');
        const webpBuffer = await sharp(originalBuffer)
          .resize({
            width: Math.min(width, OPTIMIZATION_CONFIG.MAX_DIMENSION),
            height: Math.min(height, OPTIMIZATION_CONFIG.MAX_DIMENSION),
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: OPTIMIZATION_CONFIG.WEBP_QUALITY })
          .toBuffer();
        fs.writeFileSync(webpPath, webpBuffer);
      }
    }

    return {
      file: fileName,
      originalSize,
      optimizedSize,
      savings,
      savingsPercent,
    };
  } catch (error: any) {
    return {
      file: fileName,
      originalSize: 0,
      optimizedSize: 0,
      savings: 0,
      savingsPercent: 0,
      error: error.message,
    };
  }
}

async function processDirectory(dir: string): Promise<void> {
  if (!fs.existsSync(dir)) {
    console.log(`Directory not found: ${dir}`);
    return;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await processDirectory(fullPath);
    } else if (entry.isFile()) {
      const result = await optimizeImage(fullPath);
      results.push(result);

      if (!result.skipped && !result.error) {
        totalOriginalSize += result.originalSize;
        totalOptimizedSize += result.optimizedSize;

        const status = DRY_RUN ? '[DRY-RUN]' : '✓';
        console.log(
          `${status} ${result.file}: ${(result.originalSize / 1024).toFixed(1)}KB -> ${(result.optimizedSize / 1024).toFixed(1)}KB (${result.savingsPercent.toFixed(1)}% saved)`
        );
      } else if (result.error) {
        console.log(`✗ ${result.file}: ${result.error}`);
      }
    }
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Image Optimization Script');
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE - No files will be modified\n');
  }

  if (CREATE_WEBP) {
    console.log('📦 WebP versions will also be created\n');
  }

  // Process directories
  console.log('\n📁 Processing uploads directory...');
  await processDirectory(UPLOAD_DIR);

  console.log('\n📁 Processing attached_assets directory...');
  await processDirectory(ATTACHED_ASSETS_DIR);

  console.log('\n📁 Processing stock_images directory...');
  await processDirectory(STOCK_IMAGES_DIR);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('OPTIMIZATION SUMMARY');
  console.log('='.repeat(60));

  const processed = results.filter(r => !r.skipped && !r.error);
  const skipped = results.filter(r => r.skipped);
  const errors = results.filter(r => r.error);

  console.log(`\nProcessed: ${processed.length} files`);
  console.log(`Skipped: ${skipped.length} files`);
  console.log(`Errors: ${errors.length} files`);

  const totalSavings = totalOriginalSize - totalOptimizedSize;
  const totalSavingsPercent = totalOriginalSize > 0 ? (totalSavings / totalOriginalSize) * 100 : 0;

  console.log(`\nTotal Original Size: ${(totalOriginalSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Total Optimized Size: ${(totalOptimizedSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Total Savings: ${(totalSavings / (1024 * 1024)).toFixed(2)} MB (${totalSavingsPercent.toFixed(1)}%)`);

  if (DRY_RUN) {
    console.log('\n⚠️  This was a dry run. Run without --dry-run to apply changes.');
  } else if (processed.length > 0) {
    console.log(`\n✓ Backups saved to: ${BACKUP_DIR}`);
  }

  console.log('='.repeat(60));
}

main().catch(console.error);
