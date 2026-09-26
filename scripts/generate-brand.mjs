import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
const icon = readFileSync(new URL('../public/floralhelp-icon.svg', import.meta.url), 'utf8');
const mark = icon.replace(/<svg[^>]*>/, '').replace('</svg>', '');
const logo = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="128" viewBox="0 0 520 128"><g>${mark}</g><text x="149" y="84" font-family="Segoe UI, sans-serif" font-size="65" font-weight="800" fill="#943C64">Floralhelp</text></svg>`;
writeFileSync('public/floralhelp-logo.svg', logo);
await sharp(Buffer.from(icon)).resize(32,32).png().toFile('public/favicon-32.png');
await sharp(Buffer.from(icon)).resize(180,180).png().toFile('public/apple-touch-icon.png');
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><pattern id="dots" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.4" fill="#E7C4D3"/></pattern></defs>
<rect width="1200" height="630" fill="#FFFBF5"/><rect width="1200" height="630" fill="url(#dots)"/>
<rect x="56" y="54" width="1088" height="522" rx="44" fill="#F8DDE8"/>
<rect x="48" y="44" width="1088" height="522" rx="44" fill="#FFFEFA" stroke="#B87895" stroke-width="3"/>
<g transform="translate(96 112) scale(1.12)">${mark}</g>
<text x="260" y="211" font-family="Segoe UI, sans-serif" font-size="84" font-weight="800" fill="#943C64">Floralhelp</text>
<text x="103" y="329" font-family="Segoe UI, sans-serif" font-size="46" font-weight="700" fill="#543D50">Chăm hoa bằng tâm.</text>
<text x="103" y="394" font-family="Segoe UI, sans-serif" font-size="46" font-weight="700" fill="#543D50">Quản lý bằng Floralhelp.</text>
<rect x="102" y="448" width="634" height="52" rx="26" fill="#FFF0F6"/>
<text x="125" y="482" font-family="Segoe UI, sans-serif" font-size="23" fill="#943C64">Đơn hàng · Khách hàng · Lịch giao · Thu chi</text>
<g transform="translate(895 284) rotate(12 64 64) scale(1.5)">${mark}</g>
</svg>`;
await sharp(Buffer.from(og)).png().toFile('public/floralhelp-og.png');
console.log('Generated Floralhelp logo, favicon, Apple icon and 1200×630 OG image.');
