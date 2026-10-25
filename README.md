# Signaldesk — VYNLT demonstration website

A small cybersecurity learning hub with three pages: Overview, Resources and Workspace. The checklist uses a local SQLite file (`data/signaldesk.sqlite`), not Supabase or browser localStorage. No accounts, real credentials, cloud database or paid services. Zero npm dependencies. Node 24+ supplies SQLite.

This is an independent Git repository inside the VYNLT folder. VYNLT ignores this whole directory; it is not a submodule. Push this directory to its own GitHub repository.

## 1. Run locally (PowerShell)

```powershell
cd C:\Users\yaqoo\Desktop\Vylnt\signaldesk-demo
npm.cmd run build
npm.cmd start
```

Open **https://127.0.0.1:8443**. The certificate is self-signed for this local demonstration. In Edge, use Advanced → Continue for this localhost certificate if the option is available. No certificate is installed in your system trust store. Build requires OpenSSL (Git for Windows includes it); Node 24+ is required to start. On this computer the launcher can use the existing bundled Node 24 automatically when default Node is older. Other computers should install Node 24+. Stop with Ctrl+C.

Scan each page with the VYNLT extension. If necessary enable access to this local site through the extension. The existing extension sign-in/sync sends scans to the dashboard for raw reports, grouped insights and local blockchain anchoring when your VYNLT services are running. This demo does not start those services.

## 2. Intentional issues and remediation

Default `security.json` contains `"mode": "insecure"`:

| Observation | VYNLT rule | Gate behavior |
| --- | --- | --- |
| Missing HSTS | HDR-001 | Warning |
| Missing framing controls | HDR-002 | Warning |
| Missing restrictive response CSP | HDR-003 | Warning |
| Fictional session cookie lacks Secure | CK-001 | Warning (medium confidence) |
| Fictional session cookies lack HttpOnly | CK-002 | Warning |
| Fictional cross-site cookie uses SameSite=None | CK-003 | Warning |
| HTTPS page references a local HTTP script | NET-001 | **Blocks** (high / high confidence) |
| Scripts from different local origins lack integrity attributes | JS-002 | Informational |

These are controlled configuration observations, not demonstrated exploits. Cookie values are fictional constants, not authentication. Referenced fixture scripts use non-listening loopback port 1: browsers can block them, they need not execute for a reference warning to exist. There are no external scripts or actual third-party tracking. Counts can differ by browser collection support; the gate requires complete collection. Do not enter real information or expose this intentionally misconfigured app beyond loopback. The small checklist API still uses parameterized SQL, output-safe rendering, same-origin mutation checks and request bounds in both modes.

To remediate:

```powershell
npm.cmd run demo:secure
```

Stop/restart the website for extension scanning. Secure mode sets the three response policies, fixes cookie attributes and removes insecure/external-origin fixture references. This is a controlled before/after configuration exercise, not a claim that the site is universally secure.

To restore the failing demonstration: `npm.cmd run demo:insecure` and restart.

## 3. Push this separate repository

Create a new empty GitHub repository, for example `signaldesk-demo`. Do not initialise it with a README. The local repository is initialised separately; check `git status` before committing.

```powershell
git add .
git commit -m "Add Signaldesk security demo"
git remote add origin https://github.com/YOUR_USERNAME/signaldesk-demo.git
git push -u origin main
```

Replace YOUR_USERNAME. Never add `.build/`, `data/`, reports or secrets; they are ignored. No GitHub remote is configured by VYNLT. If an initial commit already exists, Git may say there is nothing to commit; continue with remote setup.

The included `.github/workflows/vynlt.yml` runs on pushes and PRs. It uses Node 24, downloads the public VYNLT tooling at reviewed pinned commit `c1d3ba308a6a85d964b27e270d8382d0b1ffc527`, builds a clean checkout of **this website’s commit**, scans all three routes and uploads reports for seven days. It needs no Supabase secrets, local API, blockchain or running desktop. GitHub access to that public tool repository is required. CI reports are separate from dashboard-saved/anchored reports.

## 4. Failing → passing GitHub demo

For a usable secure main first:

```powershell
npm.cmd run demo:secure
git add security.json
git commit -m "Use remediated demo configuration"
git push
```

Wait for **VYNLT security gate** to pass in Actions. In this new repository’s Settings → Branches, protect `main`: require pull requests, require the exact `VYNLT security gate` check, and require up-to-date branches. Disable direct/force pushes and bypass where supported. The parent VYNLT repository’s protection does not apply here. Configure maintainer review for workflow/configuration changes if another reviewer is available; do not require an approval you cannot obtain as a solo presenter. Repository owners can change these policies.

Then:

```powershell
git switch -c demo/insecure-review
npm.cmd run demo:insecure
git add security.json
git commit -m "Demonstrate insecure configuration"
git push -u origin demo/insecure-review
```

Open a PR to main. Show the failed **VYNLT security gate** and blocked merge. Open its job summary/artifacts to show findings and fixes. Repair the same branch:

```powershell
npm.cmd run demo:secure
git add security.json
git commit -m "Fix response policies, cookies and script references"
git push
```

The PR reruns and should pass, subject to repository policy. Changes must be **committed**: dashboard labels, edited reports or an uncommitted fix cannot approve a commit. A branch push itself can succeed with a failed check; branch protection prevents the merge.

## 5. Optional local pre-push gate

Build the parent VYNLT tool and install its Chromium first. From this directory:

```powershell
node ..\dist\cli\gate.js --repo . --commit HEAD
node ..\dist\cli\gate.js --repo . --install-hook
```

The hook blocks an insecure push locally, before GitHub sees it. For the GitHub-only fail/pass demonstration, leave it uninstalled. To remove only VYNLT’s managed hook: `node ..\dist\cli\gate.js --repo . --uninstall-hook`. The installer refuses another existing hook. Git permits local bypass; required GitHub checks remain the merge control. No hook is installed automatically.

## Scope

This demo intentionally has no login, remote database, deployment, Docker or blockchain of its own. The shared checklist belongs to everyone using this computer, persists across server restarts, and is bounded to 100 tasks. To reset it, stop the server and remove only this demo’s `data/signaldesk.sqlite`, then restart. HTTPS certificates are ignored local build outputs and expire after 30 days; rerun build to regenerate. VYNLT ML remains experimental and does not decide this security gate. Hosted workflow/protection acceptance must be performed after you push your new repo; local tests cannot certify that setup.

## Local validation — 2026-10-25

Validated on private committed copies using VYNLT’s real collector and Chromium: all three insecure routes blocked, all eight current rule categories appeared, cookie values were absent from raw exports, and all three remediated routes passed. Browser checks passed desktop and 375px layouts, no horizontal overflow, zero serious/critical axe violations, no page JavaScript errors, field-guide disclosure, task add/toggle/reload, text-safe rendering and cross-origin write refusal. Reopening the SQLite file after stopping the process retained the completed task. Desktop/mobile screenshots were visually inspected. This does not certify native Edge extension permissions, screen-reader behavior, hosted Actions or branch protection for your new GitHub repository. Test servers were stopped; the actual source is left in insecure mode for the demo.
