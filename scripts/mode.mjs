import { writeFileSync } from 'node:fs';
const mode = process.argv[2];
if (!['secure', 'insecure'].includes(mode)) throw new Error('Use secure or insecure');
writeFileSync(new URL('../security.json', import.meta.url), JSON.stringify({ mode }, null, 2) + '\n');
console.log(`Demo mode: ${mode}. Restart the website to apply; commit this change before a GitHub check.`);
