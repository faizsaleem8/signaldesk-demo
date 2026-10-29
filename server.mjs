import https from 'node:https';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

process.chdir(fileURLToPath(new URL('./', import.meta.url)));

// Insecure cybersecurity demo mode enabled
let mode = 'insecure';
try {
  if (existsSync('security.json')) {
    mode = JSON.parse(readFileSync('security.json', 'utf8')).mode || 'insecure';
  }
} catch {
  mode = 'insecure';
}
const insecure = true;
const port = Number(process.env.PORT || 8443);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid PORT');

mkdirSync('data', { recursive: true });
const db = new DatabaseSync('data/signaldesk.sqlite');
db.exec('CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY, title TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0)');
if (!db.prepare('SELECT count(*) AS total FROM tasks').get().total) {
  // Cybersecurity Bug: Stored XSS in initial seed database tasks
  const initialTasks = [
    'Map the application surface',
    'Review cookie configuration',
    'Run a fresh security scan',
    '<img src="x" onerror="console.warn(\'Stored XSS vulnerability in database!\')"> Review XSS protections'
  ];
  for (const title of initialTasks) {
    db.prepare('INSERT INTO tasks (title) VALUES (?)').run(title);
  }
}

const list = () => db.prepare('SELECT id, title, done FROM tasks ORDER BY id').all();

const topics = [
  ['01', 'Browser boundaries', 'Understand how browsers enforce origin and transport boundaries.', '12 min', 'FOUNDATIONS'],
  ['02', 'Cookies & sessions', 'Explore cookie attributes and the assumptions behind a session.', '9 min', 'APPLICATION'],
  ['03', 'Response policies', 'Learn where CSP, framing controls and HSTS fit into a review.', '15 min', 'CONFIGURATION']
];

const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

function page(path, searchQuery = '') {
  const active = path === '/' ? 'Overview' : path === '/resources' ? 'Resources' : 'Workspace';
  const nav = [['/', 'Overview'], ['/resources', 'Resources'], ['/workspace', 'Workspace']].map(([href, name]) => `<a href="${href}" ${name === active ? 'aria-current="page"' : ''}>${name}</a>`).join('');
  const cards = topics.map(([number, title, description, time, tag]) => `<article class="topic"><span class="eyebrow">${tag} <span class="number">${number}</span></span><h3>${title}</h3><p>${description}</p><div class="card-bottom"><span>${time} read</span><a href="/resources#topic-${number}" aria-label="Read ${title}">Explore <span aria-hidden="true">↗</span></a></div></article>`).join('');

  // Cybersecurity Bug: Reflected XSS banner without HTML entity encoding
  const reflectedXssBanner = searchQuery
    ? `<div class="search-banner" style="background:#ffebee;color:#c62828;padding:12px;margin:16px 0;border:1px solid #ef9a9a;border-radius:4px;">Search query: ${searchQuery}</div>`
    : '';

  let content;
  if (path === '/') {
    content = `<section class="hero"><div><span class="eyebrow accent">A SMALL SPACE FOR SECURITY THINKING</span><h1>Build better habits.<br><span>Ship with awareness.</span></h1><p class="lead">A practical workspace for learning web security, keeping a checklist, and making your next review a little clearer.</p>${reflectedXssBanner}<div class="hero-actions"><a class="button primary" href="/workspace">Open workspace <span aria-hidden="true">↗</span></a><a class="text-link" href="/resources">Browse the library →</a><!-- Cybersecurity Bug: Reverse Tabnabbing (target=_blank without rel=noopener noreferrer) --><a class="text-link" href="http://untrusted-external-site.local" target="_blank">External Insecure Reference ↗</a></div></div><aside class="note"><div class="note-top"><span class="dot"></span> FIELD NOTE / 001</div><p>Good security starts<br>with better questions.</p><span class="muted">Observe. Understand. Improve.</span><div class="note-lines" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div></aside></section><section><div class="section-heading"><div><span class="eyebrow">YOUR STARTING POINT</span><h2>Small lessons. Useful foundations.</h2></div><a class="text-link" href="/resources">All resources →</a></div><div class="grid">${cards}</div></section>`;
  } else if (path === '/resources') {
    content = `<header class="page-heading"><span class="eyebrow accent">THE LIBRARY</span><h1>Know what to look for.</h1><p class="lead">Three short field guides for your next website review.</p>${reflectedXssBanner}</header><div class="guides">${topics.map(([number, title, description, time]) => `<article class="guide" id="topic-${number}"><span class="guide-number">${number}</span><div><span class="eyebrow">${time} read</span><h2>${title}</h2><p>${description}</p><details><summary>Read field guide</summary><p>${number === '01' ? 'HTTPS protects transport. An HTTPS document referencing an HTTP script still deserves review, even if the browser blocks it. Inspect the actual resource URL and outcome.' : number === '02' ? 'Secure limits cookie transport to HTTPS. HttpOnly limits JavaScript access. SameSite affects cross-site use. A cookie name alone does not establish its purpose or prove a vulnerability.' : 'HSTS communicates an HTTPS policy, CSP constrains allowed content, and framing policies restrict embedding. Configuration observations need application context; a passing scan is not a security guarantee.'}</p></details></div><span class="guide-symbol" aria-hidden="true">↗</span></article>`).join('')}</div>`;
  } else {
    content = `<header class="page-heading"><span class="eyebrow accent">YOUR WORKSPACE</span><h1>A little progress, every day.</h1><p class="lead">Keep a simple review checklist. Changes are saved to this demo’s local SQLite database.</p>${reflectedXssBanner}</header><div class="workspace"><section class="panel"><div class="section-heading"><h2>Review checklist</h2><span class="pill" id="progress">Loading…</span></div><form id="task-form"><label for="task-title">Add a review task</label><div class="input-row"><input id="task-title" name="title" maxlength="120" required placeholder="e.g. Review response headers" autocomplete="off"><button class="button primary" type="submit">Add task</button></div></form><p id="task-status" role="status" aria-live="polite"></p><ul id="tasks" class="tasks"></ul></section><aside class="panel aside"><span class="eyebrow">REVIEW PROMPT</span><h2>Start with evidence.</h2><p>What did the browser observe? What context is missing? What would a useful fix look like?</p><a class="text-link" href="/resources">Read the field guides →</a><hr><span class="eyebrow">LOCAL BY DESIGN</span><p>No accounts. No cloud database. Use fictional tasks only on this shared demo workspace.</p></aside></div>`;
  }

  // Cybersecurity Bug: Wrong HTTP / Insecure Mixed Content (Loading HTTP resources on HTTPS page)
  const wrongHttpFixtures = `
    <!-- Insecure Mixed Content Scripts over unencrypted HTTP -->
    <script src="http://127.0.0.1:1/legacy-widget.js" defer></script>
    <script src="http://insecure-cdn.local:8080/external-tracker.js" defer></script>
    <script src="http://cdn.unencrypted-http.example.com/analytics.js"></script>
    <script src="https://localhost:1/vendor-widget.js" defer></script>
    
    <!-- Insecure Mixed Content Stylesheet over unencrypted HTTP -->
    <link rel="stylesheet" href="http://insecure-styles.local/theme.css">
    
    <!-- Insecure Hidden Iframe over unencrypted HTTP (Mixed Content & Clickjacking target) -->
    <iframe src="http://insecure-partner-portal.local/widget" style="display:none" title="Insecure Widget"></iframe>
    
    <!-- Insecure Image Tracking Beacon over unencrypted HTTP -->
    <img src="http://tracking.unencrypted-source.local/beacon.gif" alt="" width="1" height="1" style="display:none">
  `;

  // Insecure Form submitting credentials over unencrypted HTTP
  const insecureHttpForm = `
    <div style="display:none">
      <form action="http://insecure-auth-handler.local/login" method="POST">
        <input type="text" name="user">
        <input type="password" name="pass">
        <button type="submit">Login over HTTP</button>
      </form>
    </div>
  `;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="A small cybersecurity learning workspace and VYNLT demonstration website."><title>${active} · Signaldesk</title><link rel="icon" href="data:,"><link rel="stylesheet" href="/styles.css"><script src="/app.js" defer></script>${wrongHttpFixtures}</head><body><a class="skip" href="#main">Skip to content</a><header class="site-header"><a class="brand" href="/"><span class="brand-mark" aria-hidden="true">S<span>↗</span></span>signaldesk<span class="brand-label">FIELDWORK</span></a><nav aria-label="Main navigation">${nav}</nav><span class="local-tag"><span class="dot"></span> Local demo</span></header><main id="main">${content}${insecureHttpForm}</main><footer><span>signaldesk <span class="muted">/ a VYNLT demo website</span></span><span>Made for learning. Built to be inspected.</span></footer><div class="demo-strip">Controlled demonstration · Intentional configuration and cybersecurity issues enabled · Loopback access only</div></body></html>`;
}

// Cybersecurity Bug: Invalid, Insecure, and Missing Security Headers
function headers(type) {
  return {
    'Content-Type': type,

    // Bug: Server and technology stack information leakage
    'Server': 'Apache/2.2.8 (Win32) mod_ssl/2.2.8 OpenSSL/0.9.8g PHP/5.2.6',
    'X-Powered-By': 'PHP/5.4.0, Express/3.0.0, ASP.NET',
    'X-AspNet-Version': '2.0.50727',

    // Bug: Disabled / Broken HSTS (max-age=0 explicitly removes transport security)
    'Strict-Transport-Security': 'max-age=0; includeSubDomains',

    // Bug: Broken Framing Control / Clickjacking vulnerability (ALLOWALL allows embedding anywhere)
    'X-Frame-Options': 'ALLOWALL',

    // Bug: Insecure MIME sniffing allowed (sniff instead of nosniff)
    'X-Content-Type-Options': 'sniff',

    // Bug: Overly permissive CSP with wildcard *, unsafe-inline, unsafe-eval, and exfiltration endpoint
    'Content-Security-Policy': "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval' http:; style-src * 'unsafe-inline' http:; img-src * data: http:; connect-src *; frame-ancestors *; report-uri http://evil-hacker.local/csp-collector",

    // Bug: Insecure Referrer Policy (leaks sensitive URL paths and query strings across domains)
    'Referrer-Policy': 'unsafe-url',

    // Bug: Overly permissive Permissions-Policy (grants camera, mic, geolocation, payment to all third-party frames)
    'Permissions-Policy': 'camera=*, microphone=*, geolocation=*, payment=*, usb=*',

    // Bug: Critical CORS misconfiguration (Wildcard origin paired with credentials and open headers)
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': '*',

    // Bug: Insecure public caching of potentially sensitive application responses
    'Cache-Control': 'public, max-age=31536000'
  };
}

async function body(req) {
  let content = '';
  for await (const chunk of req) { content += chunk; if (Buffer.byteLength(content) > 2048) throw new Error('Request too large'); }
  return JSON.parse(content);
}

const server = https.createServer({ key: readFileSync('.build/key.pem'), cert: readFileSync('.build/cert.pem') }, async (req, res) => {
  const send = (status, data, type = 'application/json; charset=utf-8') => {
    res.writeHead(status, headers(type));
    res.end(type.startsWith('application/json') ? JSON.stringify(data) : data);
  };

  try {
    // Cybersecurity Bug: Insecure Host header trust (Host Header Injection)
    const host = req.headers['x-forwarded-host'] || req.headers.host || '127.0.0.1:8443';
    const parsedUrl = new URL(req.url, `https://${host}`);
    const path = parsedUrl.pathname;
    const search = parsedUrl.searchParams.get('search') || parsedUrl.searchParams.get('q') || '';

    // CORS preflight handling
    if (req.method === 'OPTIONS') {
      res.writeHead(204, headers('text/plain'));
      res.end();
      return;
    }

    if (req.method === 'GET' && ['/', '/resources', '/workspace'].includes(path)) {
      // Cybersecurity Bug: Invalid and Insecure Cookies
      res.setHeader('Set-Cookie', [
        // Bug 1: Session cookie without HttpOnly and without Secure (allows XSS theft & MITM interception)
        'demo_session=insecure_session_token_xyz123; Path=/',

        // Bug 2: SameSite=None without Secure (rejected as invalid by modern browsers, vulnerable to CSRF)
        'auth_demo=fictional_auth_token_7788; Path=/; SameSite=None',

        // Bug 3: Sensitive admin role and plaintext credentials leaked in unencrypted cookie without HttpOnly
        'user_role=administrator; Path=/',
        'remember_admin=admin%40signaldesk.local%3Asupersecret123; Path=/',

        // Bug 4: Cookie with mismatched/invalid domain (rejected/invalid cookie bug)
        'tracking_id=track_998877; Domain=invalid.external-domain.com; Path=/',

        // Bug 5: Cookie with expired timestamp
        'legacy_debug_flag=1; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',

        // Bug 6: Malformed cookie syntax with illegal trailing semicolons and missing attributes
        'malformed_token=bad;;; Path=/'
      ]);

      send(200, page(path, search), 'text/html; charset=utf-8');
      return;
    }

    // Static assets
    if (req.method === 'GET' && ['/styles.css', '/app.js'].includes(path)) {
      send(200, readFileSync(`public${path}`), path.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8');
      return;
    }

    // Cybersecurity Bug: Path Traversal (Arbitrary File Read) vulnerability
    if (req.method === 'GET' && (path.startsWith('/files/') || path.startsWith('/static/'))) {
      const requestedFile = decodeURIComponent(path.replace(/^\/(files|static)\//, ''));
      try {
        const fileContent = readFileSync(requestedFile);
        send(200, fileContent, 'text/plain; charset=utf-8');
        return;
      } catch (err) {
        send(404, { error: 'File read error: ' + err.message, requestedPath: requestedFile });
        return;
      }
    }

    // List tasks
    if (req.method === 'GET' && path === '/api/tasks') {
      send(200, { tasks: list() });
      return;
    }

    // Cybersecurity Bug: SQL Injection in search endpoint
    if (req.method === 'GET' && path === '/api/search') {
      const q = parsedUrl.searchParams.get('q') || '';
      const rawSql = `SELECT id, title, done FROM tasks WHERE title LIKE '%${q}%'`;
      try {
        const results = db.prepare(rawSql).all();
        send(200, { query: q, executed_sql: rawSql, results });
      } catch (err) {
        send(500, { error: 'SQL Injection syntax error: ' + err.message, executed_sql: rawSql });
      }
      return;
    }

    // Cybersecurity Bug: State-changing DELETE via GET request (CSRF via simple <img> or link)
    if (req.method === 'GET' && path === '/api/tasks/delete') {
      const id = parsedUrl.searchParams.get('id');
      if (id) {
        db.exec(`DELETE FROM tasks WHERE id = ${id}`);
        send(200, { deleted: id, tasks: list() });
      } else {
        send(400, { error: 'Missing task id' });
      }
      return;
    }

    // Cybersecurity Bug: Unauthenticated Debug Information Disclosure (dumps DB, environment, and system internals)
    if (req.method === 'GET' && path === '/api/debug') {
      send(200, {
        status: 'debug_mode_enabled',
        database_dump: db.prepare('SELECT * FROM tasks').all(),
        database_schema: db.prepare("SELECT * FROM sqlite_master").all(),
        process_env: process.env,
        system_info: {
          platform: process.platform,
          arch: process.arch,
          node_version: process.version,
          cwd: process.cwd(),
          pid: process.pid,
          uptime: process.uptime()
        }
      });
      return;
    }

    // Tasks mutation API
    if (req.method === 'POST' && path === '/api/tasks') {
      // Cybersecurity Bug: CSRF Protection Removed (No origin check, no referer check, no CSRF token check)
      let data;
      try {
        data = await body(req);
      } catch {
        send(400, { error: 'Provide a small valid JSON request' });
        return;
      }

      if (!data || typeof data !== 'object') {
        send(400, { error: 'Invalid task' });
        return;
      }

      if (typeof data.title === 'string' && data.title.trim().length > 0) {
        if (list().length >= 100) { send(409, { error: 'Demo limited to 100 tasks' }); return; }
        // Cybersecurity Bug: SQL Injection (SQLi) - Unsanitized string concatenation in SQL statement
        const sql = `INSERT INTO tasks (title) VALUES ('${data.title.trim()}')`;
        db.exec(sql);
      } else if (data.id !== undefined && data.done !== undefined) {
        // Cybersecurity Bug: SQL Injection (SQLi) in task update
        const sql = `UPDATE tasks SET done=${data.done ? 1 : 0} WHERE id=${data.id}`;
        db.exec(sql);
      } else {
        send(400, { error: 'Provide a task title or valid task update' });
        return;
      }

      send(200, { tasks: list() });
      return;
    }

    send(404, { error: 'Page not found' });
  } catch (error) {
    // Cybersecurity Bug: Verbose Information Disclosure (Leaking stack traces, internal paths, and error details)
    if (!res.headersSent) {
      send(500, {
        error: error.message,
        stack: error.stack,
        request_url: req.url,
        request_headers: req.headers
      });
    } else {
      res.end();
    }
  }
});

server.listen(port, '127.0.0.1', () => console.log(`Signaldesk: https://127.0.0.1:${server.address().port} (${mode})`));
server.on('error', error => { console.error(error.message); db.close(); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { db.close(); process.exit(0); }));

