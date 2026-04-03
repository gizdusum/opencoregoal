# OpenCoreGoal

OpenCoreGoal is a goal-based auto wallet demo built for the OpenWallet / OWS hackathon.

## Live links

- Public app: [openwallet-goal.vercel.app](https://openwallet-goal.vercel.app)
- Live backend demo: [187.124.91.33:8787](http://187.124.91.33:8787/)
- Repository: [gizdusum/opencoregoal](https://github.com/gizdusum/opencoregoal)

It helps normal users turn a simple savings intention into a protected onchain flow:

- set a savings goal in plain English
- keep the private key out of the agent flow
- approve a policy-checked OWS request
- move a small part of upside into a separate USDC goal vault

## Why this exists

Most people do not need more buttons, tabs, and trading complexity.

They need a calmer flow:

- connect a wallet
- define a goal
- save from gains
- keep savings separate from the trading balance

OpenCoreGoal uses OWS to show how an agent can help with that without taking direct access to the private key.

## Core idea

`Set the goal. Onchain. Automatically.`

Instead of asking the user to manually manage every wallet action, OpenCoreGoal lets them describe a rule like:

> "Whenever my wallet is in profit, move a small share into a USDC goal vault and keep my monthly savings under budget."

That rule becomes:

- a readable savings plan
- a policy-checked OWS request
- a live onchain demo path on Base Sepolia

## What the app shows

- a simple landing page and planner UI
- dark mode and wallet connect
- a dedicated savings wallet / goal vault story
- local OWS wallet and policy setup
- live message signing through OWS
- a real onchain demo transfer path on Base Sepolia

## Architecture

OpenCoreGoal is intentionally small:

- `index.html`
  - landing page and planner UI
- `styles.css`
  - light/dark visual system
- `app.js`
  - client-side planner logic, wallet connect, request state
- `server.js`
  - local Node server for static hosting and API endpoints
- `ows-profit-vault-policy.js`
  - policy executable
- `ows-profit-vault-policy.json`
  - OWS policy definition

## OWS flow

The demo uses two wallet roles:

- `opencoregoal-trader`
  - source wallet used for the onchain demo
- `opencoregoal-vault`
  - protected goal vault wallet

The app currently demonstrates:

1. user sets a goal
2. policy is evaluated
3. OWS signs a live request
4. the onchain demo can send a Base Sepolia transaction into the goal vault

## Local development

### Requirements

- Node.js 20+
- npm
- OWS CLI installed

### Install

```bash
npm install
```

### Start

```bash
npm start
```

Then open:

```bash
http://127.0.0.1:8787/
```

## OWS setup notes

This project expects OWS to be available on the host machine.

The live demo depends on:

- local OWS wallets
- a registered OWS policy
- a machine where the OWS vault is available

Without that setup, the UI can still render, but the live OWS request and onchain demo will not behave as intended.

## Onchain demo

The current demo path targets:

- `Base Sepolia`

The onchain action is a lightweight live transfer flow used to prove that:

- the request is real
- the policy gate is real
- the chain execution path is real

## Deploying publicly

This is not a pure static site.

Because the app depends on:

- a Node backend
- the OWS CLI
- local OWS wallet access

the best public deployment target is a Linux server or VPS where you control the runtime.

Recommended deployment shape:

1. Ubuntu server
2. Node.js installed
3. OWS CLI installed
4. OWS wallets and policy created on that server
5. `npm start` behind Nginx or Caddy
6. optional domain + HTTPS

Platforms that are only static hosting are good for the UI, but not for the full live OWS experience.

## Hackathon positioning

OpenCoreGoal is designed to show a user-facing application of OWS, not just an infrastructure demo.

It focuses on:

- usability for non-technical users
- safe agent execution
- policy-gated wallet actions
- stable savings behavior instead of speculative trading UX

## Submission helper

Ready-to-paste hackathon copy lives in:

- `SUBMISSION.md`
