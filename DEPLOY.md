# Deploy OpenCoreGoal

OpenCoreGoal now has two valid public shapes:

- `Frontend only on Vercel`
- `Live backend on a VPS`

The current production-like setup is:

- Vercel for the public UI
- Hostinger VPS for the live OWS backend

This is the recommended setup if you want a shareable `vercel.app` link without moving OWS wallets off your own server.

## Current public architecture

1. `Vercel`
   - serves `index.html`, `styles.css`, `app.js`
   - exposes `/api/ows/*` proxy routes
2. `Hostinger / VPS`
   - runs `server.js`
   - holds OWS CLI, wallets, and registered policy
   - performs the live OWS request and onchain demo

## Why this split exists

This project needs more than static hosting for the full experience.

It requires:

- Node.js
- OWS CLI
- local OWS wallets on the host
- a server runtime for the live demo

## Recommended target

- Ubuntu 24.04 VPS
- 1 vCPU / 2 GB RAM is enough for the demo
- optional domain or subdomain

## 1. Install system packages

```bash
sudo apt update
sudo apt install -y curl git caddy
```

## 2. Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
```

## 3. Install OWS

```bash
npm install -g @open-wallet-standard/core
```

## 4. Clone the repo

```bash
git clone https://github.com/gizdusum/opencoregoal.git
cd opencoregoal
npm install
```

## 5. Create OWS wallets on the server

```bash
ows wallet create --name opencoregoal-trader
ows wallet create --name opencoregoal-vault
```

Then note the EVM addresses and update `.env`.

## 6. Register the policy

```bash
ows policy create ows-profit-vault-policy.json
```

## 7. Create the environment file

```bash
cp .env.example .env
```

Edit `.env` with your real wallet names and addresses.

## 8. Run locally first

```bash
set -a
source .env
set +a
npm start
```

Open:

```bash
http://127.0.0.1:8787/
```

## 9. Install as a systemd service

Copy `deploy/opencoregoal.service` to:

```bash
/etc/systemd/system/opencoregoal.service
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable opencoregoal
sudo systemctl start opencoregoal
sudo systemctl status opencoregoal
```

## 10. Put Caddy in front

Copy `deploy/Caddyfile.example` into your live Caddy config and replace the domain.

Then reload:

```bash
sudo systemctl reload caddy
```

## 11. Important note

The OWS vault is local to the server.

That means:

- the server is the machine that must hold the OWS wallets
- static hosting alone is only enough for the UI
- back up the OWS wallet material securely

## 12. Vercel frontend

The repo includes Vercel proxy handlers in:

- `api/ows/status.js`
- `api/ows/request.js`
- `api/ows/onchain-demo.js`

These forward requests to the live backend.

Default upstream:

```txt
http://187.124.91.33:8787
```

If you move the backend later, set this env var in Vercel:

```txt
OPENCOREGOAL_UPSTREAM_URL
```

Then redeploy.
