import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
// Node 24 supplies local SQLite without any downloaded database service.
if (Number(process.versions.node.split('.')[0]) >= 24) {
  process.chdir(root);
  await import('../server.mjs');
} else {
  const bundled = join(process.env.USERPROFILE || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe');
  if (!existsSync(bundled)) throw new Error('Use Node.js 24 or later to run this SQLite demo.');
  console.log('Using the available bundled Node 24 runtime for SQLite.');
  const child = spawn(bundled, [fileURLToPath(new URL('../server.mjs', import.meta.url))], { cwd: root, stdio: 'inherit', windowsHide: true });
  child.on('error', error => { console.error(error.message); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
}
