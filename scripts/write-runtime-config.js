const fs = require('fs');

const fallback = 'https://terapikart.onrender.com';
const configured = String(process.env.PERSONA_CARD_BACKEND_URL || fallback).trim().replace(/\/$/, '');

if (!/^https?:\/\//i.test(configured)) {
  console.error('PERSONA_CARD_BACKEND_URL geçerli bir http/https adresi olmalıdır.');
  process.exit(1);
}

fs.writeFileSync(
  'runtime-config.js',
  `window.PERSONA_CARD_BACKEND_URL = ${JSON.stringify(configured)};\n`,
  'utf8'
);

console.log(`Persona Card backend: ${configured}`);
