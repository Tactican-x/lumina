/* scripts/generate-assets.js */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const outDir = path.join(process.cwd(), "assets", "images");
fs.mkdirSync(outDir, { recursive: true });

const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bg" cx="35%" cy="25%" r="80%">
      <stop offset="0%" stop-color="#141428"/>
      <stop offset="60%" stop-color="#0a0a0f"/>
      <stop offset="100%" stop-color="#06060a"/>
    </radialGradient>
    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="60%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="14" result="blur"/>
      <feColorMatrix in="blur" type="matrix"
        values="1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 0.55 0" result="glow"/>
      <feMerge>
        <feMergeNode in="glow"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect x="0" y="0" width="1024" height="1024" rx="220" fill="url(#bg)"/>

  <g filter="url(#glow)">
    <rect x="360" y="230" width="170" height="565" rx="85" fill="url(#grad)"/>
    <rect x="360" y="625" width="410" height="170" rx="85" fill="url(#grad)"/>
  </g>

  <g opacity="0.9">
    <circle cx="735" cy="295" r="10" fill="#ffffff"/>
    <rect x="732" y="255" width="6" height="25" rx="3" fill="#ffffff" opacity="0.85"/>
    <rect x="732" y="310" width="6" height="25" rx="3" fill="#ffffff" opacity="0.85"/>
    <rect x="695" y="292" width="25" height="6" rx="3" fill="#ffffff" opacity="0.85"/>
    <rect x="750" y="292" width="25" height="6" rx="3" fill="#ffffff" opacity="0.85"/>
  </g>
</svg>
`;

const adaptiveForegroundSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="60%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="12" result="blur"/>
      <feColorMatrix in="blur" type="matrix"
        values="1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 0.55 0" result="glow"/>
      <feMerge>
        <feMergeNode in="glow"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Transparent background (foreground only) -->
  <g filter="url(#glow)">
    <rect x="380" y="250" width="160" height="520" rx="80" fill="url(#grad)"/>
    <rect x="380" y="610" width="380" height="160" rx="80" fill="url(#grad)"/>
  </g>

  <g opacity="0.9">
    <circle cx="720" cy="315" r="10" fill="#ffffff"/>
    <rect x="717" y="277" width="6" height="24" rx="3" fill="#ffffff" opacity="0.85"/>
    <rect x="717" y="330" width="6" height="24" rx="3" fill="#ffffff" opacity="0.85"/>
    <rect x="681" y="312" width="24" height="6" rx="3" fill="#ffffff" opacity="0.85"/>
    <rect x="735" y="312" width="24" height="6" rx="3" fill="#ffffff" opacity="0.85"/>
  </g>
</svg>
`;

const splashSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="2000" viewBox="0 0 2000 2000">
  <defs>
    <radialGradient id="bg" cx="35%" cy="25%" r="85%">
      <stop offset="0%" stop-color="#141428"/>
      <stop offset="60%" stop-color="#0a0a0f"/>
      <stop offset="100%" stop-color="#06060a"/>
    </radialGradient>
    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="60%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="22" result="blur"/>
      <feColorMatrix in="blur" type="matrix"
        values="1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 0.55 0" result="glow"/>
      <feMerge>
        <feMergeNode in="glow"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="2000" height="2000" fill="url(#bg)"/>

  <g filter="url(#glow)">
    <rect x="820" y="620" width="220" height="760" rx="110" fill="url(#grad)"/>
    <rect x="820" y="1150" width="560" height="220" rx="110" fill="url(#grad)"/>
  </g>

  <g opacity="0.9">
    <circle cx="1370" cy="680" r="14" fill="#ffffff"/>
    <rect x="1365" y="625" width="10" height="35" rx="5" fill="#ffffff" opacity="0.85"/>
    <rect x="1365" y="700" width="10" height="35" rx="5" fill="#ffffff" opacity="0.85"/>
    <rect x="1310" y="675" width="35" height="10" rx="5" fill="#ffffff" opacity="0.85"/>
    <rect x="1385" y="675" width="35" height="10" rx="5" fill="#ffffff" opacity="0.85"/>
  </g>
</svg>
`;

async function svgToPng(svg, outPath, size) {
  // Higher density keeps SVG sharp when rasterized
  const density = size >= 2000 ? 300 : 200;

  await sharp(Buffer.from(svg), { density })
    .resize(size, size)
    .png({ compressionLevel: 9, palette: false })
    .toFile(outPath);
}

(async () => {
  const iconPath = path.join(outDir, "icon.png");
  const adaptivePath = path.join(outDir, "adaptive-icon.png");
  const splashPath = path.join(outDir, "splash.png");
  const faviconPath = path.join(outDir, "favicon.png");

  await svgToPng(iconSvg, iconPath, 1024);
  await svgToPng(adaptiveForegroundSvg, adaptivePath, 1024);
  await svgToPng(splashSvg, splashPath, 2000);
  await svgToPng(iconSvg, faviconPath, 48);

  console.log("Generated:");
  console.log(" -", iconPath);
  console.log(" -", adaptivePath);
  console.log(" -", splashPath);
  console.log(" -", faviconPath);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});