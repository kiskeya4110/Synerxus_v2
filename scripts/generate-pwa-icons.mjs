import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '../client/public');
const src = path.join(publicDir, 'synerxus-esg-logo.png');

// Background color matching theme_color / background_color
const bg = { r: 253, g: 248, b: 243, alpha: 1 }; // #FDF8F3

async function makeIcon({ size, paddingPct, outFile }) {
  const pad = Math.round(size * paddingPct);
  const logoSize = size - pad * 2;

  const resized = await sharp(src)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: bg,
    },
  })
    .composite([{ input: resized, top: pad, left: pad }])
    .png()
    .toFile(path.join(publicDir, outFile));

  console.log(`✓ ${outFile} (${size}x${size}, ${Math.round(paddingPct * 100)}% padding)`);
}

// Regular icons — 15% padding each side
await makeIcon({ size: 192, paddingPct: 0.15, outFile: 'pwa-icon-192.png' });
await makeIcon({ size: 512, paddingPct: 0.15, outFile: 'pwa-icon-512.png' });

// Maskable icons — 20% padding each side (safe zone = inner 80%)
await makeIcon({ size: 192, paddingPct: 0.20, outFile: 'pwa-icon-maskable-192.png' });
await makeIcon({ size: 512, paddingPct: 0.20, outFile: 'pwa-icon-maskable-512.png' });

// Apple touch icon — 180x180, 15% padding
await makeIcon({ size: 180, paddingPct: 0.15, outFile: 'pwa-apple-touch-icon.png' });

console.log('Done.');
