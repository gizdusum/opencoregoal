# Deploy OpenCoreGoal

This project needs more than static hosting.

It requires:

- Node.js
- OWS CLI
- local OWS wallets on the host
- a reverse proxy for public access

## Recommended target

- Ubuntu 24.04 VPS
- 1 vCPU / 2 GB RAM is enough for the demo
- a domain or subdomain

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
- the full live demo does not work on static hosting alone
- back up the OWS wallet material securely
