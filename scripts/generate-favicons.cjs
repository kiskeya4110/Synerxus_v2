// scripts/generate-favicons.cjs
// Run: node scripts/generate-favicons.cjs
// Generates all favicon sizes from the approved synerxus-logo.png

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceImage = path.resolve('client/src/assets/synerxus-logo-new.png');
const outputDir = path.resolve('client/public');

// Background color matching the app theme
const bgColor = { r: 253, g: 248, b: 243, alpha: 1 }; // #FDF8F3

const favicons = [
  { name: 'favicon-16.png', size: 16 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'favicon-192.png', size: 192 },
  { name: 'favicon-512.png', size: 512 },
  { name: 'favicon.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

// Maskable icons need padding (safe zone is 80% of the icon)
const maskableIcons = [
  { name: 'icon-maskable-192.png', size: 192, padding: 0.1 },
  { name: 'icon-maskable-512.png', size: 512, padding: 0.1 },
];

async function generateFavicons() {
  console.log('🎨 Generating favicons from synerxus-logo-new.png (approved solid design)...\n');

  // Get source image info
  const metadata = await sharp(sourceImage).metadata();
  console.log(`📐 Source image: ${metadata.width}x${metadata.height}`);

  // Generate regular favicons
  for (const favicon of favicons) {
    const outputPath = path.join(outputDir, favicon.name);

    await sharp(sourceImage)
      .resize(favicon.size, favicon.size, {
        fit: 'contain',
        background: bgColor
      })
      .png()
      .toFile(outputPath);

    console.log(`✅ Generated ${favicon.name} (${favicon.size}x${favicon.size})`);
  }

  // Generate maskable icons with padding for safe zone
  for (const icon of maskableIcons) {
    const outputPath = path.join(outputDir, icon.name);
    const innerSize = Math.round(icon.size * (1 - icon.padding * 2));

    // First resize the logo to fit in the safe zone
    const resizedLogo = await sharp(sourceImage)
      .resize(innerSize, innerSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();

    // Then composite onto a background with padding
    const paddingSize = Math.round(icon.size * icon.padding);

    await sharp({
      create: {
        width: icon.size,
        height: icon.size,
        channels: 4,
        background: bgColor
      }
    })
      .composite([{
        input: resizedLogo,
        left: paddingSize,
        top: paddingSize
      }])
      .png()
      .toFile(outputPath);

    console.log(`✅ Generated ${icon.name} (${icon.size}x${icon.size} maskable)`);
  }

  // Generate ICO file (using PNG as base, browsers handle this)
  const icoPath = path.join(outputDir, 'favicon.ico');
  await sharp(sourceImage)
    .resize(32, 32, {
      fit: 'contain',
      background: bgColor
    })
    .png()
    .toFile(icoPath);
  console.log(`✅ Generated favicon.ico (32x32)`);

  console.log('\n✨ All favicons generated successfully!');
  console.log('📝 The PWA will now use the approved Synerxus logo.');
}

generateFavicons().catch(err => {
  console.error('❌ Error generating favicons:', err);
  process.exit(1);
});
