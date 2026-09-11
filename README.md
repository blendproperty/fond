# FOND Midpoint

Next.js / TypeScript PWA scaffold for collection ordering. Docker standalone runtime behind an existing Traefik installation on Hostinger VPS.

## Run

Node 24 LTS recommended. `npm ci`, `npm run dev`. Verification: `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e` (install Playwright Chromium first).

## Current boundary

This is an explicitly labelled preview. Menu, prices, collection windows and visual direction are illustrative, not approved FOND trading data or final brand assets. Demo basket/history live only in React memory and reset on reload. There is no authentication, database, payment collection, POS submission or printer integration. `/api/orders` always returns 503. The Yoco gateway deliberately throws until the provider supplies a supported integration contract. Do not reinterpret payment success as restaurant acceptance.

PWA manifest, PNG icons, home-screen installation prompt and a network-only navigation service worker with offline fallback are included. No offline orders or personal/payment data caching. Real-device iOS/Android installation is a separate UAT gate.

## Deployment

Copy `.env.example` to `.env` and set the approved hostname, actual shared Traefik Docker network, HTTPS entrypoint and certificate resolver. Do not guess these from a different app. Configure DNS to the confirmed VPS. `docker compose config` then `docker compose up -d --build`. Application port 3000 is internal only; TLS terminates at existing Traefik. The compose file does not create or modify Traefik. Verify `/api/health`, HTTPS, UI and offline behaviour after deployment. Retain prior image/commit for rollback.

This scaffold must stay a preview until business approval, authentication/persistence, server-side menu validation, order/payment idempotency, verified webhooks, refund/cancellation rules and Yoco acceptance/printing are implemented and tested. Do not attach live Yoco keys yet.

## Planned production flow

Customer PWA -> authenticated application backend -> supported Yoco incoming-order interface -> staff acceptance in Yoco -> kitchen printer. Provider confirmation is pending. Customer account access will require a verified identity provider and persistent order store; do not substitute client-side demo identity. First integration proof: one controlled order accepted inside the actual FOND POS and printed once.

## Design

Current visual direction uses a provisional text wordmark, cream/green palette and food illustrations. Replace with approved FOND CI and meal photography. Google Fonts are currently loaded externally; self-host approved fonts for production. The source survey is separate and remains unchanged.
