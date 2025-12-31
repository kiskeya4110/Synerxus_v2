// scripts/optimize-images.js
// Run: npm install sharp --save-dev && node scripts/optimize-images.js
//
// This script optimizes large images to WebP format for better performance
// Target: Reduce hero images from 6-8MB to under 200KB

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imagesToOptimize = [
  // Hero collage image - 6.6MB -> ~150KB
  {
    input: 'attached_assets/Gemini_Generated_Image_n3wsmrn3wsmrn3ws_1763713223121.png',
    output: 'attached_assets/hero-volunteer-collage.webp',
    width: 1024,
    quality: 80
  },
  // Community Volunteers - 6.3MB -> ~150KB
  {
    input: 'attached_assets/Community Volunteers_1763707388972.png',
    output: 'attached_assets/community-volunteers.webp',
    width: 800,
    quality: 75
  },
  // Doctors Volunteering - 5.9MB -> ~150KB
  {
    input: 'attached_assets/Doctors Volunteering_1763707388972.png',
    output: 'attached_assets/doctors-volunteering.webp',
    width: 800,
    quality: 75
  },
  // Village Volunteers - 8.0MB -> ~150KB
  {
    input: 'attached_assets/Village Volunteers_1763707388973.png',
    output: 'attached_assets/village-volunteers.webp',
    width: 800,
    quality: 75
  },
  // Logo files
  {
    input: 'attached_assets/Synerxus_Logo_1765433966690.png',
    output: 'attached_assets/synerxus-logo-optimized.webp',
    width: 400,
    quality: 85
  },
];

async function optimizeImages() {
  console.log('🖼️  Starting image optimization...\n');

  let totalSaved = 0;

  for (const img of imagesToOptimize) {
    try {
      const inputPath = path.resolve(img.input);
      const outputPath = path.resolve(img.output);

      if (!fs.existsSync(inputPath)) {
        console.log(`⚠️  Skipping: ${img.input} (not found)`);
        continue;
      }

      await sharp(inputPath)
        .resize(img.width, null, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: img.quality })
        .toFile(outputPath);

      const inputSize = fs.statSync(inputPath).size;
      const outputSize = fs.statSync(outputPath).size;
      const savings = inputSize - outputSize;
      totalSaved += savings;
      const savingsPercent = ((1 - outputSize / inputSize) * 100).toFixed(1);

      console.log(`✅ ${path.basename(img.output)}`);
      console.log(`   ${(inputSize / 1024 / 1024).toFixed(2)}MB → ${(outputSize / 1024).toFixed(0)}KB (${savingsPercent}% smaller)`);
    } catch (err) {
      console.error(`❌ Error processing ${img.input}:`, err.message);
    }
  }

  console.log(`\n📊 Total space saved: ${(totalSaved / 1024 / 1024).toFixed(2)}MB`);
  console.log('\n📝 Next steps:');
  console.log('1. Update imports in landing.tsx to use the .webp versions');
  console.log('2. Delete the original large .png files (optional)');
}

// Also create thumbnail versions for SDG icons
async function optimizeSDGIcons() {
  console.log('\n🎯 Optimizing SDG icons...\n');

  const sdgDir = 'attached_assets';
  const files = fs.readdirSync(sdgDir).filter(f => f.startsWith('E_SDG_PRINT-'));

  for (const file of files) {
    const inputPath = path.join(sdgDir, file);
    const sdgNum = file.match(/\d+/)?.[0];
    const outputPath = path.join(sdgDir, `sdg-${sdgNum}-thumb.webp`);

    try {
      await sharp(inputPath)
        .resize(200, 200, { fit: 'cover' })
        .webp({ quality: 75 })
        .toFile(outputPath);

      const inputSize = fs.statSync(inputPath).size;
      const outputSize = fs.statSync(outputPath).size;
      console.log(`✅ SDG ${sdgNum}: ${(inputSize / 1024).toFixed(0)}KB → ${(outputSize / 1024).toFixed(0)}KB`);
    } catch (err) {
      console.error(`❌ SDG ${sdgNum}: ${err.message}`);
    }
  }
}

async function main() {
  await optimizeImages();
  await optimizeSDGIcons();
  console.log('\n✨ Done! Your images are now optimized for web.');
}

main().catch(console.error);
