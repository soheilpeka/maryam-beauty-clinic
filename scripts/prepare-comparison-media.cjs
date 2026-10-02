// Re-encode complete boards. CSS viewports reveal panels without retouching evidence.
const sharp = require('sharp');
const { mkdir } = require('node:fs/promises');
const { resolve } = require('node:path');
const sources = [
  'BA-Gentle-LMC-3Tx-028.jpg', 'BA-Gentle-NJohnson-2Tx-027.jpg',
  'BA-GMaxPro-FJenkins-Tx-016.jpg', 'BA-GMaxPro-KHutton-3Tx-006.jpg',
  'BA-GMaxPro-MGermain-Tx-010.jpg', 'BA-GMaxPro-MKutun-5Tx-008.jpg',
  'BA-GMaxPro-OZerpa-5Tx-009.jpg', 'BA-GMaxPro-SChasin-Tx-002.jpg',
  'BA-GMaxPro-SEubanks-Tx-003.jpg', 'BA-Matrix-BTalei-2Tx-055.png',
  'BA-Matrix-CIE-1Tx-051.png', 'BA-Matrix-DAkyol-3Tx-046.png',
  'BA-Matrix-DAkyol-3Tx-047.png', 'BA-Matrix-KSchallen-3Tx-018.png',
  'BA-Matrix-KSchallen-3Tx-019.png', 'BA-Matrix-PBekhor-2Tx-050.png',
  'BA-Matrix-SGerrish-2Tx-007.png', 'GentleMax-HR-P1-KHutton-MD_highres.jpg',
];
async function main() {
  const output = resolve('public/media/comparisons');
  await mkdir(output, { recursive: true });
  for (const [index, filename] of sources.entries()) {
    const metadata = await sharp(resolve('pics/before and after', filename)).metadata();
    const result = await sharp(resolve('pics/before and after', filename)).resize({ width: 2048, withoutEnlargement: true })
      .webp({ quality: 92 }).toFile(resolve(output, `comparison-${String(index + 1).padStart(2, '0')}.webp`));
    console.log(`${index + 1}: ${metadata.width}x${metadata.height} -> ${result.width}x${result.height}, ${result.size} bytes`);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
