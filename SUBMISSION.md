# OpenCoreGoal Submission Pack

## One-line pitch

OpenCoreGoal turns a plain-English savings rule into a policy-checked onchain action, so users can move a small share of profits into a protected USDC goal vault without giving an agent direct access to their private key.

## Short description

OpenCoreGoal is a simple goal-based auto wallet built for non-technical users. Instead of asking people to manage complex trading screens, it lets them define a savings rule like "when I am in profit, move a small piece into stable savings." The app then uses OWS to gate that action through policy, keep key control local, and prepare a live onchain flow into a separate goal vault.

## Longer description

Most retail users do not need more wallet buttons. They need a calmer financial habit.

OpenCoreGoal reframes onchain automation around one simple behavior: protect a small part of upside. A user connects a wallet, writes a plain-English goal, signs plan approval, and the app creates a live OWS request backed by a policy. The savings action routes into a separate USDC goal vault instead of leaving funds mixed with the trading balance.

The product is designed to feel simple enough for someone who does not understand DeFi internals, while still demonstrating the real value of OWS:

- private key does not get handed to the agent
- wallet actions are policy-checked
- approval and execution are separated
- a real onchain demo path exists on Base Sepolia

## Problem

Most onchain users either:

- keep all value mixed in one wallet
- need to manually remember to save profits
- or have to trust an automated system too much

That creates a bad tradeoff between convenience and safety.

## Solution

OpenCoreGoal gives users a savings rule instead of a trading interface. The user says what they want in plain English, approves the plan with their wallet, and OWS handles the guarded request path in the background. Savings are routed into a separate goal vault, reinforcing better behavior without forcing a full exit from their main position.

## Why OWS matters here

OWS is the core safety layer of the product:

- the agent does not need raw private key access
- policies define what is allowed
- the vault wallet remains protected
- the app can prepare a real signed request instead of just simulating a concept

## Demo flow

1. Open the app.
2. Connect a wallet.
3. Set a goal in plain English.
4. Click `Start saving plan`.
5. Approve the plan with a wallet signature.
6. The app creates a live OWS request.
7. Optionally run the Base Sepolia onchain demo to show a real transaction path into the goal vault.

## Tech stack

- HTML / CSS / vanilla JavaScript frontend
- Node.js backend
- OWS CLI
- OWS policy executable
- Base Sepolia demo path
- Vercel frontend + Hostinger live backend

## Public links

- App: [https://openwallet-goal.vercel.app](https://openwallet-goal.vercel.app)
- Repo: [https://github.com/gizdusum/opencoregoal](https://github.com/gizdusum/opencoregoal)

## Tagline options

- Set the goal. Onchain. Automatically.
- Save from upside. Keep it separate.
- Protect a piece of every win.
