# FOND Midpoint ordering

Next.js / TypeScript PWA with a SQLite order store, facility staff tablet and menu administration. Runs in Docker behind Traefik on Hostinger VPS.

## Current operating model

Customer PWA -> FOND staff tablet -> accept -> ready -> completed. Staff may capture orders into their existing restaurant POS manually. Payment happens in person. Yoco integration was dropped by business decision on 14 September 2026.

The menu is database-backed and editable at `/admin`; `/staff` handles the active queue and manual orders. These areas currently use separate shared access codes, not named staff accounts or a complete CRM. Customer ordering is guest-based. PWA offline fallback never queues orders.

## Development and verification

Use Node 24. Run `npm ci`, then `npm run dev`. Run `npm run typecheck`, `npm test`, and `npm run build`. For `npm run test:e2e`, install Playwright Chromium and set test-only `FOND_STAFF_CODE`, `FOND_ADMIN_CODE`, and `FOND_DB_PATH=:memory:`. Never run these order-creation tests against production.

## Order reliability

Order POST endpoints require a UUID `Idempotency-Key`. An unchanged retry returns the existing order; reusing a key with different data returns 409. The browser retains retry keys in session storage until success. Purchased item names and prices are snapshotted for new orders. Status updates and their audit events commit atomically. Staff history is available at `/api/staff/orders/:id/history`; actor identity is the shared tablet, not a named person. Legacy orders retain their original references and lack reconstructed snapshots/history.

## Deployment

Use `.env.example` and the confirmed VPS hostname/Traefik settings. Mount the SQLite data directory persistently and back it up before promotion. The proposed deployment workflow waits for successful Verify FOND CI on main and deploys that exact revision only if it is still main's head. Feature branches do not deploy. `/api/health` checks database access; it is not an end-to-end order or notification test.

## Remaining gates

Individual staff roles, rate limiting/abuse controls, ordering hours/capacity, durable notification retries, backup/restore verification, approved delivery/payment operating rules and staff/real-device UAT remain. WhatsApp is optional and currently best-effort; provider delivery is not verified. See `PROJECT_CONTEXT.md` for dated implementation and promotion evidence.
