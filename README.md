# OpenCoreGoal

OpenCoreGoal is a hackathon MVP for OpenWallet / OWS.

It turns a plain-English savings goal into:

- a policy-checked OWS request
- a dedicated goal vault flow
- a live onchain demo on Base Sepolia

## What it shows

- simple goal-based savings UX
- wallet connect for the user-facing flow
- Open Wallet Standard wallet + policy setup
- live request signing through OWS
- live onchain demo transfer into a goal vault

## Stack

- HTML / CSS / vanilla JavaScript
- Node.js server
- OWS CLI
- ethers

## Local run

```bash
npm install
npm start
```

Then open:

```bash
http://127.0.0.1:8787/
```

## Notes

- The demo uses local OWS wallets on the machine where the server runs.
- The onchain demo targets Base Sepolia.
- For a full public deployment, the host machine must also have OWS configured.
