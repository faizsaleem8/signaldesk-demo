import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const { mode } = JSON.parse(readFileSync('security.json', 'utf8'));
if (!['secure', 'insecure'].includes(mode)) throw new Error('Invalid security.json mode');
mkdirSync('.build', { recursive: true });
const candidates = ['openssl', 'C:/Program Files/Git/usr/bin/openssl.exe'];
let generated = false;
for (const binary of candidates) {
  const result = spawnSync(binary, ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '30', '-keyout', '.build/key.pem', '-out', '.build/cert.pem', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1'], { stdio: 'ignore', windowsHide: true, env: { ...process.env, MSYS_NO_PATHCONV: '1' } });
  if (result.status === 0) { generated = true; break; }
}
if (!generated) throw new Error('OpenSSL required. Install Git for Windows, or make openssl available on PATH.');
for (const path of ['public/styles.css', 'public/app.js', 'server.mjs']) if (!existsSync(path)) throw new Error(`Missing ${path}`);
console.log(`Built Signaldesk (${mode}). Local self-signed HTTPS certificate generated; no trust-store changes.`);
