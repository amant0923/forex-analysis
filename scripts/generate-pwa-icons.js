const fs = require("fs");

function generateSVG(size) {
  const padding = Math.floor(size * 0.15);
  const fontSize = Math.floor(size * 0.55);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.floor(size * 0.2)}" fill="#09090b"/>
  <rect x="${padding}" y="${padding}" width="${size - padding * 2}" height="${size - padding * 2}" rx="${Math.floor(size * 0.12)}" fill="#111118"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Georgia, serif" font-weight="bold" font-size="${fontSize}" fill="white">T</text>
  <rect x="${padding}" y="${size - padding - 3}" width="${size - padding * 2}" height="3" rx="1.5" fill="#2563eb"/>
</svg>`;
}

const dir = "/Users/a/Desktop/forex-analysis/public/icons";
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(`${dir}/icon-192.svg`, generateSVG(192));
fs.writeFileSync(`${dir}/icon-512.svg`, generateSVG(512));
console.log("Generated PWA icon SVGs in public/icons/");
