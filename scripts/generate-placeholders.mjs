// Generates on-brand SVG placeholder assets sized exactly per the image
// checklist in docs/superpowers/specs/2026-08-25-best-buddy-up-website-design.md §7.
// Run with: npm run placeholders
// Output is committed as static files under public/images/ so the site
// renders correctly-sized imagery before any real photos exist.

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public", "images");

const PALETTES = [
  ["#E23A82", "#C24FA8"],
  ["#C24FA8", "#4FB4E8"],
  ["#E23A82", "#4FB4E8"],
  ["#F2699E", "#7FC3E8"],
];

function paletteFor(seed) {
  return PALETTES[seed % PALETTES.length];
}

function svgPlaceholder({ width, height, label, sublabel, seed = 0, circle = false }) {
  const [c1, c2] = paletteFor(seed);
  const id = `g${seed}-${width}x${height}`;
  const rx = circle ? Math.min(width, height) / 2 : 0;
  const fontSize = Math.max(14, Math.round(Math.min(width, height) * 0.055));
  const subFontSize = Math.max(11, Math.round(fontSize * 0.6));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label} placeholder">
  <defs>
    <linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}" stop-opacity="0.24"/>
      <stop offset="100%" stop-color="${c2}" stop-opacity="0.24"/>
    </linearGradient>
    <pattern id="dots-${id}" width="22" height="22" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.4" fill="${c1}" fill-opacity="0.18"/>
    </pattern>
  </defs>
  <rect width="${width}" height="${height}" rx="${rx}" fill="#FBF3F6"/>
  <rect width="${width}" height="${height}" rx="${rx}" fill="url(#${id})"/>
  <rect width="${width}" height="${height}" rx="${rx}" fill="url(#dots-${id})"/>
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="${Math.max(rx - 1, 0)}" fill="none" stroke="${c1}" stroke-opacity="0.35" stroke-width="2" stroke-dasharray="10 8"/>
  <g transform="translate(${width / 2}, ${height / 2})" text-anchor="middle" font-family="system-ui, sans-serif">
    <text y="-4" font-size="${fontSize}" font-weight="700" fill="#241A2E" fill-opacity="0.55">${label}</text>
    <text y="${fontSize + 6}" font-size="${subFontSize}" fill="#241A2E" fill-opacity="0.4">${sublabel}</text>
  </g>
</svg>`;
}

function write(relPath, svg) {
  const full = path.join(publicDir, relPath);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, svg, "utf8");
  console.log("wrote", path.relative(publicDir, full));
}

// Home hero — 1920x1080
write(
  "hero/home-hero.svg",
  svgPlaceholder({
    width: 1920,
    height: 1080,
    label: "HOME HERO PLACEHOLDER",
    sublabel: "Shoot: exchange students + Peruvian buddies together, candid, bright — 1920×1080 min",
    seed: 0,
  })
);

// Team — 800x800, 1 per member (10, spanning all 9 committees)
const TEAM = [
  "Camila Rios — Events Lead",
  "Diego Alvarado — Treasurer",
  "Valeria Chumpitaz — Compliance Officer",
  "Mateo Salinas — Merch Lead",
  "Sofia Bravo — Culture Coordinator",
  "Andres Quiroz — Social Media Lead",
  "Bruno Castillo — Sports Coordinator",
  "Lucia Ferrand — Tandem Lead",
  "Renata Solis — Trips Coordinator",
  "Ignacio Vera — President",
];
TEAM.forEach((name, i) => {
  write(
    `team/member-${i + 1}.svg`,
    svgPlaceholder({
      width: 800,
      height: 800,
      label: "TEAM HEADSHOT",
      sublabel: `${name} — 800×800`,
      seed: i,
    })
  );
});

// Event covers — 1200x675, 6 sample events
const EVENTS = [
  "welcome-mixer",
  "cusco-day-trip",
  "peruvian-cooking-night",
  "salsa-social",
  "beach-day-punta-hermosa",
  "farewell-fiesta",
];
EVENTS.forEach((slug, i) => {
  write(
    `events/${slug}.svg`,
    svgPlaceholder({
      width: 1200,
      height: 675,
      label: "EVENT COVER",
      sublabel: `${slug.replace(/-/g, " ")} — 1200×675`,
      seed: i,
    })
  );
});

// Event gallery (per past event) — ~1200 long edge, 4 per past event, 3 past events
["welcome-mixer", "cusco-day-trip", "peruvian-cooking-night"].forEach((slug, ei) => {
  for (let i = 1; i <= 4; i++) {
    const landscape = i % 2 === 1;
    write(
      `events/${slug}-gallery-${i}.svg`,
      svgPlaceholder({
        width: landscape ? 1200 : 900,
        height: landscape ? 800 : 1200,
        label: "EVENT PHOTO",
        sublabel: `${slug.replace(/-/g, " ")} candid #${i}`,
        seed: ei + i,
      })
    );
  }
});

// Gallery page — 16 mixed portrait/landscape
for (let i = 1; i <= 16; i++) {
  const landscape = i % 3 !== 0;
  write(
    `gallery/photo-${String(i).padStart(2, "0")}.svg`,
    svgPlaceholder({
      width: landscape ? 1200 : 900,
      height: landscape ? 800 : 1200,
      label: "GALLERY PHOTO",
      sublabel: `Cultural activity / group shot #${i}`,
      seed: i,
    })
  );
}

// Testimonials — 200x200 circular, 5 people
for (let i = 1; i <= 5; i++) {
  write(
    `testimonials/avatar-${i}.svg`,
    svgPlaceholder({
      width: 200,
      height: 200,
      label: "PHOTO",
      sublabel: `${i}/5`,
      seed: i,
      circle: true,
    })
  );
}

console.log("\nDone. All placeholders are clearly labeled SVGs sized to spec §7.");
