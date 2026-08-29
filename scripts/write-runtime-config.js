const fs = require('fs');

const legacyBackend = 'https://terapikart.onrender.com';
const context = String(process.env.CONTEXT || '').trim().toLowerCase();
const explicitBackend = String(process.env.PERSONA_CARD_BACKEND_URL || '').trim();
const configured = String(explicitBackend || legacyBackend).replace(/\/$/, '');

if (!/^https?:\/\//i.test(configured)) {
  console.error('PERSONA_CARD_BACKEND_URL geçerli bir http/https adresi olmalıdır.');
  process.exit(1);
}

if (context === 'production') {
  if (!explicitBackend) {
    console.error('Production deploy durduruldu: PERSONA_CARD_BACKEND_URL Netlify Production ortamında açıkça tanımlanmalıdır.');
    process.exit(1);
  }
  if (configured === legacyBackend) {
    console.error('Production deploy durduruldu: V1.2 frontend eski terapikart.onrender.com backendine yönlendirilemez.');
    process.exit(1);
  }
  if (!/^https:\/\//i.test(configured)) {
    console.error('Production deploy durduruldu: production backend HTTPS kullanmalıdır.');
    process.exit(1);
  }
}

fs.writeFileSync(
  'runtime-config.js',
  `window.PERSONA_CARD_BACKEND_URL = ${JSON.stringify(configured)};\n`,
  'utf8'
);

console.log(`Persona Card backend (${context || 'local'}): ${configured}`);
