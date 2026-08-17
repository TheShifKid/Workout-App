/**
 * מייצר את אייקוני ה-PWA מ-SVG אחד.
 * רץ פעם אחת (`npm run icons`) והפלט נכנס ל-public/icons — אין תלות
 * ב-sharp בזמן ריצה של האפליקציה.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public/icons');

const INK = '#0A0A0B';
const VOLT = '#D6F94B';

/** מוט עם משקולות. scale קובע כמה מקום הסמל תופס — ל-maskable צריך שוליים. */
const mark = (scale) => `
    <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
      <rect x="96"  y="238" width="320" height="36" rx="18" fill="${VOLT}"/>
      <rect x="132" y="176" width="46"  height="160" rx="20" fill="${VOLT}"/>
      <rect x="334" y="176" width="46"  height="160" rx="20" fill="${VOLT}"/>
      <rect x="86"  y="206" width="34"  height="100" rx="16" fill="${VOLT}"/>
      <rect x="392" y="206" width="34"  height="100" rx="16" fill="${VOLT}"/>
    </g>`;

const svg = ({ scale = 1, radius = 96, background = INK } = {}) => `
  <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect width="512" height="512" rx="${radius}" fill="${background}"/>
    ${mark(scale)}
  </svg>`;

const png = (source, size, file) =>
  sharp(Buffer.from(source)).resize(size, size).png().toFile(resolve(OUT, file));

await mkdir(OUT, { recursive: true });

await Promise.all([
  png(svg({ radius: 96 }), 192, 'pwa-192.png'),
  png(svg({ radius: 96 }), 512, 'pwa-512.png'),
  // maskable: רקע מלא ופינות מרובעות, כי אנדרואיד חותך את הצורה בעצמו
  png(svg({ radius: 0, scale: 0.62 }), 512, 'maskable-512.png'),
  png(svg({ radius: 0 }), 180, 'apple-touch-icon.png'),
  writeFile(resolve(OUT, 'favicon.svg'), svg({ radius: 96 }).trim()),
]);

console.log('icons written to public/icons');
