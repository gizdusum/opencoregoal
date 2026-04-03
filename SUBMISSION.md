# OpenCoreGoal Submission Pack

## One-line pitch

OpenCoreGoal diagnoses risky onchain behavior, assigns a Profit Protection Score, and turns that diagnosis into a policy-checked savings plan that moves a share of profits into a protected USDC goal vault.

## Short description

OpenCoreGoal is a simple goal-based auto wallet built for non-technical users. It now does two things: it analyzes a connected wallet to estimate how well the user protects gains onchain, and it turns that diagnosis into a policy-checked savings plan. Instead of asking people to manage complex trading screens, it helps them move a small piece of profits into a protected USDC goal vault while the private key stays local.

## Longer description

Most retail users do not need more wallet buttons. They need a calmer financial habit.

OpenCoreGoal reframes onchain automation around one simple behavior: protect a small part of upside. A user connects a wallet, gets a Profit Protection Score based on wallet activity, receives a treatment plan, writes or accepts a savings goal, signs plan approval, and the app creates a live OWS request backed by a policy. The savings action routes into a separate USDC goal vault instead of leaving funds mixed with the trading balance.

The product is designed to feel simple enough for someone who does not understand DeFi internals, while still demonstrating the real value of OWS:

- private key does not get handed to the agent
- wallet actions are policy-checked
- approval and execution are separated
- a real onchain demo path exists on Base Sepolia
- wallet behavior can be diagnosed before a protection plan is suggested

## Problem

Most onchain users either:

- keep all value mixed in one wallet
- need to manually remember to save profits
- or have to trust an automated system too much

That creates a bad tradeoff between convenience and safety.

They also repeat the same emotional mistake:

- leave every gain exposed
- re-enter risk too quickly
- and never convert good moments into stable savings

## Solution

OpenCoreGoal gives users a diagnosis and a treatment plan instead of another trading interface. The app analyzes wallet behavior, produces a Profit Protection Score, explains the pattern, and recommends a protection plan with a sweep percentage and monthly cap. The user can then approve that plan, and OWS handles the guarded request path in the background. Savings are routed into a separate goal vault, reinforcing better behavior without forcing a full exit from the main position.

## Why OWS matters here

OWS is the core safety layer of the product:

- the agent does not need raw private key access
- policies define what is allowed
- the vault wallet remains protected
- the app can prepare a real signed request instead of just simulating a concept
- behavior analysis can lead directly into a constrained execution plan

## Demo flow

1. Open the app.
2. Connect a wallet.
3. Analyze the wallet to generate a Profit Protection Score.
4. Review the recommended treatment plan.
5. Set or refine a goal in plain English.
6. Click `Start saving plan`.
7. Approve the plan with a wallet signature.
8. The app creates a live OWS request.
9. Optionally run the Base Sepolia onchain demo to show a real transaction path into the goal vault.

## Tech stack

- HTML / CSS / vanilla JavaScript frontend
- Node.js backend
- Moralis wallet intelligence for scoring
- OWS CLI
- OWS policy executable
- Base Sepolia demo path
- Vercel frontend + Hostinger live backend

## Public links

- App: [https://opencoregoal.vercel.app](https://opencoregoal.vercel.app)
- Repo: [https://github.com/gizdusum/opencoregoal](https://github.com/gizdusum/opencoregoal)

## Tagline options

- Set the goal. Onchain. Automatically.
- Save from upside. Keep it separate.
- Protect a piece of every win.
