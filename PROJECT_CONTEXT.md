# FOND ordering PWA

## Canonical repository and scope

Repository: https://github.com/blendproperty/fond. Initial remote was empty on 2026-09-11; fresh checkout created in `fond-app` under the Menu Comparison workspace. This file is canonical for the ordering application. The existing menu-voting Sites project is separate and unchanged. No `.openai/hosting.json` exists here; the user explicitly requested Next.js, Docker, Traefik and Hostinger VPS.

## 2026-09-11 — initial scaffold

Implementation: Next.js 16.3.4, React 19.3.0, TypeScript, responsive provisional FOND visual direction. Nine proposed meals across Breakfast/Lunch/Smoothies, integer-cent basket calculations, quantity controls, illustrative collection preferences, demo confirmation and session-only reorder history. PWA manifest, 192/512 PNG icons, install prompt and network-first navigation/offline fallback. No offline order queue. No personal data persisted. API health route; live order POST always returns 503. Separate typed Yoco gateway throws until a supported provider interface is available. Non-root Node 24 Alpine Docker standalone image, configurable existing-network Traefik Compose, and GitHub Actions verification workflow.

Testing: TypeScript check, 3 unit tests and local Next production build passed. Four browser scenarios (desktop/mobile order flow and API/PWA assets) passed after correcting the mobile basket accessible name. Desktop 1440px and mobile 390px screenshots visually inspected. Docker image build passed; local container health endpoint returned preview mode/liveOrdering=false, UID 1001 verified. Compose validated with explicit test-only hostname/network/resolver values, not real VPS configuration. Offline browser coverage and final Docker rebuild are being checked before commit.

Commit/push: pending initial commit and remote verification at this checkpoint. Merge: not applicable, empty repository bootstrap. Deployment/configuration: no Hostinger or DNS changes. Actual VPS, hostname, Traefik network and certificate resolver requested from user and pending. Local container is not production deployment. Live production verification: none.

Open gates: Yoco human confirmation and one real incoming POS order accepted and printed once; production authentication/identity provider, durable order store, server-side pricing and availability, idempotency and payment reconciliation/webhook verification, cancellations/refunds, ordering capacity/hours, approved FOND menu/prices/allergens/CI/photography, real-device installation and staff UAT. No live payments or kitchen orders enabled. Customer login is not implemented; demo history is explicitly session-only. No Asana scope. Graphify found no pre-existing corpus to map in the empty repository; no graph completeness claim.

## Provider evidence

On 2026-09-11 Yoco AI Support stated that external orders into Counter and prep-station printing are not a standard public API integration. User-approved human escalation email and existing-merchant integration Google Form were submitted and verified earlier in the parent project. Await human technical reply. Checkout payments/catalogue access do not establish incoming order acceptance or printing support.

Validation update: all 6 desktop/mobile browser tests passed, including real service-worker offline navigation. Final application production rebuild passed after accessibility fix. Initial commit will bootstrap main; remote is still empty immediately before commit. GitHub CI result remains pending until the push triggers it.
