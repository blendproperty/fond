# FOND Midpoint ordering

Next.js / TypeScript PWA with SQLite, Docker and Traefik on Hostinger VPS.

## Operating model

Customer PWA -> FOND staff tablet -> accept -> ready -> completed. Restaurant POS capture remains manual. Guest ordering remains available. Offline mode never queues orders.

Payment at FOND remains the default. Optional hosted Yoco checkout was requested on 15 September 2026 and is implemented behind server configuration plus the Settings switch. Browser redirects never mark orders paid: verified matching webhooks update the ledger. This does not inject orders into Yoco Counter or trigger a printer.

## Administration

All seven navigation sections have working screens:

- Menu & specials: catalogue, availability, pricing, modifiers, filtering and views.
- Orders: search/filter, purchased line details and status history.
- Customers: profiles, phone matching, order import, notes, archive and explicit marketing consent evidence; consented-contact CSV. Search/export is limited to 500 matching profiles; linked history to 200 orders. Profiles are not verified customer identities.
- Marketing & CMS: draft/preview/publish, previous-publication restore, announcement and scheduled promotions; notification log/retry. Item discounts live in Menu. External marketing distribution uses the consented export with an approved provider.
- Reports: BI-style dashboard with date/fulfilment filters, prior-period KPIs, daily order-value trends, fulfilment mix, category drilldown, hourly demand, status breakdown, item rankings and CSV. Completed order value is not proof of payment; no Yoco sales feed is implied. Zero-sales items are not ranked as slow movers.
- Finance: receipts, externally issued refund records, duplicate/overpayment guards, balances, checkout references and CSV. This is an operational ledger, not bank settlement, tax invoicing or automatic refund initiation.
- Settings: ordering/fulfilment, Johannesburg hours, capacity, preparation estimate, contact, collection preferences, providers and named team accounts. Managers have admin access; staff use the tablet. Named sessions expire after 12 hours and are revoked on account edits/logout. Shared codes remain during transition.

## Verification

Node 24. Run npm ci, npm run typecheck, npm test and npm run build. Install Playwright Chromium; set test-only FOND_STAFF_CODE, FOND_ADMIN_CODE and FOND_DB_PATH=:memory: before npm run test:e2e. Never point order-creating tests at production. Yoco fixture tests are not real provider sandbox certification.

## Deployment and reliability

Order idempotency, retry keys, purchased snapshots and audited status transitions remain intact. Deployment waits for successful main CI, checks the exact SHA, builds, backs up SQLite in the persistent volume, then replaces the container. Concurrent deployments are serialized. On-volume backups do not replace offsite disaster recovery.

See OPERATIONS.md for provider setup and operating limits, and PROJECT_CONTEXT.md for dated test/promotion evidence.
