import https from 'node:https';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
process.chdir(fileURLToPath(new URL('./', import.meta.url)));
const { mode } = JSON.parse(readFileSync('security.json', 'utf8'));
if (!['secure', 'insecure'].includes(mode)) throw new Error('Unsupported security mode');
const insecure = mode === 'insecure';
const port = Number(process.env.PORT || 8443);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid PORT');
mkdirSync('data', { recursive: true });
const db = new DatabaseSync('data/signaldesk.sqlite');
db.exec('CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY, title TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0)');
if (!db.prepare('SELECT count(*) AS total FROM tasks').get().total) {
  const insert = db.prepare('INSERT INTO tasks (title) VALUES (?)');
  for (const title of ['Map the application surface', 'Review cookie configuration', 'Run a fresh VYNLT scan']) insert.run(title);
}
const list = () => db.prepare('SELECT id, title, done FROM tasks ORDER BY id').all();
const topics = [
  ['01', 'Browser boundaries', 'Understand how browsers enforce origin and transport boundaries.', '12 min', 'FOUNDATIONS'],
  ['02', 'Cookies & sessions', 'Explore cookie attributes and the assumptions behind a session.', '9 min', 'APPLICATION'],
  ['03', 'Response policies', 'Learn where CSP, framing controls and HSTS fit into a review.', '15 min', 'CONFIGURATION']
];
const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
function page(path) {
  const active = path === '/' ? 'Overview' : path === '/resources' ? 'Resources' : 'Workspace';
  const nav = [['/', 'Overview'], ['/resources', 'Resources'], ['/workspace', 'Workspace']].map(([href, name]) => `<a href="${href}" ${name === active ? 'aria-current="page"' : ''}>${name}</a>`).join('');
  const cards = topics.map(([number, title, description, time, tag]) => `<article class="topic"><span class="eyebrow">${tag} <span class="number">${number}</span></span><h3>${title}</h3><p>${description}</p><div class="card-bottom"><span>${time} read</span><a href="/resources#topic-${number}" aria-label="Read ${title}">Explore <span aria-hidden="true">↗</span></a></div></article>`).join('');
  let content;
  if (path === '/') content = `<section class="hero"><div><span class="eyebrow accent">A SMALL SPACE FOR SECURITY THINKING</span><h1>Build better habits.<br><span>Ship with awareness.</span></h1><p class="lead">A practical workspace for learning web security, keeping a checklist, and making your next review a little clearer.</p><div class="hero-actions"><a class="button primary" href="/workspace">Open workspace <span aria-hidden="true">↗</span></a><a class="text-link" href="/resources">Browse the library →</a></div></div><aside class="note"><div class="note-top"><span class="dot"></span> FIELD NOTE / 001</div><p>Good security starts<br>with better questions.</p><span class="muted">Observe. Understand. Improve.</span><div class="note-lines" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div></aside></section><section><div class="section-heading"><div><span class="eyebrow">YOUR STARTING POINT</span><h2>Small lessons. Useful foundations.</h2></div><a class="text-link" href="/resources">All resources →</a></div><div class="grid">${cards}</div></section>`;
  else if (path === '/resources') content = `<header class="page-heading"><span class="eyebrow accent">THE LIBRARY</span><h1>Know what to look for.</h1><p class="lead">Three short field guides for your next website review.</p></header><div class="guides">${topics.map(([number, title, description, time]) => `<article class="guide" id="topic-${number}"><span class="guide-number">${number}</span><div><span class="eyebrow">${time} read</span><h2>${title}</h2><p>${description}</p><details><summary>Read field guide</summary><p>${number === '01' ? 'HTTPS protects transport. An HTTPS document referencing an HTTP script still deserves review, even if the browser blocks it. Inspect the actual resource URL and outcome.' : number === '02' ? 'Secure limits cookie transport to HTTPS. HttpOnly limits JavaScript access. SameSite affects cross-site use. A cookie name alone does not establish its purpose or prove a vulnerability.' : 'HSTS communicates an HTTPS policy, CSP constrains allowed content, and framing policies restrict embedding. Configuration observations need application context; a passing scan is not a security guarantee.'}</p></details></div><span class="guide-symbol" aria-hidden="true">↗</span></article>`).join('')}</div>`;
  else content = `<header class="page-heading"><span class="eyebrow accent">YOUR WORKSPACE</span><h1>A little progress, every day.</h1><p class="lead">Keep a simple review checklist. Changes are saved to this demo’s local SQLite database.</p></header><div class="workspace"><section class="panel"><div class="section-heading"><h2>Review checklist</h2><span class="pill" id="progress">Loading…</span></div><form id="task-form"><label for="task-title">Add a review task</label><div class="input-row"><input id="task-title" name="title" maxlength="120" required placeholder="e.g. Review response headers" autocomplete="off"><button class="button primary" type="submit">Add task</button></div></form><p id="task-status" role="status" aria-live="polite"></p><ul id="tasks" class="tasks"></ul></section><aside class="panel aside"><span class="eyebrow">REVIEW PROMPT</span><h2>Start with evidence.</h2><p>What did the browser observe? What context is missing? What would a useful fix look like?</p><a class="text-link" href="/resources">Read the field guides →</a><hr><span class="eyebrow">LOCAL BY DESIGN</span><p>No accounts. No cloud database. Use fictional tasks only on this shared demo workspace.</p></aside></div>`;
  // Local, deliberately non-listening fixture origins: no third-party service or exploit code.
  const fixtures = insecure ? '<script src="https://127.0.0.1:1/legacy-widget.js" defer></script><script src="https://localhost:1/vendor-widget.js" defer></script>' : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="A small cybersecurity learning workspace and VYNLT demonstration website."><title>${active} · Signaldesk</title><link rel="icon" href="data:,"><link rel="stylesheet" href="/styles.css"><script src="/app.js" defer></script>${fixtures}</head><body><a class="skip" href="#main">Skip to content</a><header class="site-header"><a class="brand" href="/"><span class="brand-mark" aria-hidden="true">S<span>↗</span></span>signaldesk<span class="brand-label">FIELDWORK</span></a><nav aria-label="Main navigation">${nav}</nav><span class="local-tag"><span class="dot"></span> Local demo</span></header><main id="main">${content}</main><footer><span>signaldesk <span class="muted">/ a VYNLT demo website</span></span><span>Made for learning. Built to be inspected.</span></footer><div class="demo-strip">Controlled demonstration · ${insecure ? 'Intentional configuration issues enabled' : 'Remediated configuration enabled'} · Loopback access only</div></body></html>`;
}
function headers(type) {
  return { 'Content-Type': type, 'Cache-Control': 'no-store', ...(insecure ? {} : {
    'Strict-Transport-Security': 'max-age=31536000',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
  }) };
}
async function body(req) {
  let content = '';
  for await (const chunk of req) { content += chunk; if (Buffer.byteLength(content) > 2048) throw new Error('Request too large'); }
  return JSON.parse(content);
}
const server = https.createServer({ key: readFileSync('.build/key.pem'), cert: readFileSync('.build/cert.pem') }, async (req, res) => {
  const send = (status, data, type = 'application/json; charset=utf-8') => { res.writeHead(status, headers(type)); res.end(type.startsWith('application/json') ? JSON.stringify(data) : data); };
  try {
    const host = req.headers.host;
    if (!host || !['127.0.0.1', 'localhost'].includes(new URL(`https://${host}`).hostname)) { send(403, { error: 'Loopback host required' }); return; }
    const path = new URL(req.url, `https://${host}`).pathname;
    if (req.method === 'GET' && ['/', '/resources', '/workspace'].includes(path)) {
      // Synthetic constants, never real sessions; attribute changes are the scanning fixture.
      res.setHeader('Set-Cookie', insecure ? ['demo_session=fictional; Path=/', 'auth_demo=fictional; Path=/; Secure; SameSite=None'] : ['demo_session=fictional; Path=/; Secure; HttpOnly; SameSite=Lax', 'auth_demo=fictional; Path=/; Secure; HttpOnly; SameSite=Lax']);
      send(200, page(path), 'text/html; charset=utf-8'); return;
    }
    if (req.method === 'GET' && ['/styles.css', '/app.js'].includes(path)) { send(200, readFileSync(`public${path}`), path.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8'); return; }
    if (req.method === 'GET' && path === '/api/tasks') { send(200, { tasks: list() }); return; }
    if (req.method === 'POST' && path === '/api/tasks') {
      if (req.headers.origin !== `https://${host}` || !req.headers['content-type']?.startsWith('application/json')) { send(403, { error: 'Same-origin JSON required' }); return; }
      let data;
      try { data = await body(req); } catch { send(400, { error: 'Provide a small valid JSON request' }); return; }
      if (!data || typeof data !== 'object') { send(400, { error: 'Invalid task' }); return; }
      if (typeof data.title === 'string' && data.title.trim().length > 0 && data.title.length <= 120) {
        if (list().length >= 100) { send(409, { error: 'Demo limited to 100 tasks' }); return; }
        db.prepare('INSERT INTO tasks (title) VALUES (?)').run(data.title.trim());
      } else if (Number.isSafeInteger(data.id) && typeof data.done === 'boolean') {
        const result = db.prepare('UPDATE tasks SET done=? WHERE id=?').run(Number(data.done), data.id);
        if (!result.changes) { send(404, { error: 'Task not found' }); return; }
      } else { send(400, { error: 'Provide a task title or valid task update' }); return; }
      send(200, { tasks: list() }); return;
    }
    send(404, { error: 'Page not found' });
  } catch { if (!res.headersSent) send(500, { error: 'Unable to complete request' }); else res.end(); }
});
server.listen(port, '127.0.0.1', () => console.log(`Signaldesk: https://127.0.0.1:${server.address().port} (${mode})`));
server.on('error', error => { console.error(error.message); db.close(); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { db.close(); process.exit(0); }));
