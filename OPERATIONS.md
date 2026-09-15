# FOND operating handover

## Management

Create named manager/staff accounts in Settings using the existing administrator access. Editing a member revokes their sessions. Shared access codes remain active until removed from server configuration. Review trading days/hours, preparation estimate, fulfilment, contact and collection preferences with the restaurant. Hours enforcement is off by default to preserve existing intake. Delivery area is guidance, not geofencing. Collection choices are preferences, not reserved slots.

## Optional Yoco checkout activation

Official references reviewed 2026-09-15:
- https://developer.yoco.com/docs/checkout-api
- https://developer.yoco.com/docs/checkout-api/idempotency
- https://developer.yoco.com/guides/online-payments/webhooks/verifying-the-events

Use an isolated staging database for sandbox tests. Configure YOCO_SECRET_KEY, YOCO_WEBHOOK_SECRET and FOND_PUBLIC_URL. FOND_ALLOW_TEST_PAYMENTS=true is only for that isolated staging deployment. Register the Checkout API webhook at https://<host>/api/payments/webhook and enable the Settings switch. Test success, failure, cancellation, lost redirect, duplicate/delayed webhooks and refunds. Check exactly one ledger entry and the staff balance. Secrets remain server-side.

After merchant/domain approval and provider UAT, configure live credentials in production, keep FOND_ALLOW_TEST_PAYMENTS=false, restart and enable the Settings switch. A restaurant-authorized small live payment/refund and payout check is still required before broad release.

The webhook verifies raw-body HMAC, a three-minute timestamp window, checkout ID, amount, currency and mode. Event and payment IDs are deduplicated. Orders enter the staff queue before payment. Started or uncertain checkouts block a second manual receipt. Use Finance checkout IDs to reconcile in Yoco; request redelivery of a missing signed payment notification. Do not take a second payment while the first is uncertain. Uncertain creation older than one hour requires manual reconciliation because Yoco idempotency keys expire after 24 hours.

Cancel/failed return URLs do not prove no payment. Cancelling an order does not refund it automatically. Paid cancelled orders show as refund due. Issue Yoco refunds in Yoco and let the signed refund callback record them; do not manually record the same refund. Manual refund entry is for externally issued refunds without an automatic webhook. Bank settlement, fees and tax invoices remain in the restaurant/accounting system. Yoco Counter order injection, catalogue sync and printer routing are not implemented.

## Transactional WhatsApp

Configure FOND_WHATSAPP_TOKEN and FOND_WHATSAPP_PHONE_NUMBER_ID and approved order_accepted/order_ready templates (language en; customer name and order reference variables). Enable WhatsApp in Settings after setup. This adapter uses Meta Cloud API directly.

Opted-in status events persist in a queue processed by staff-tablet polling, so keep the tablet open. Provider acceptance is not delivery confirmation. Missing config and failures appear in Marketing & CMS. Limited retries are available; ambiguous/interrupted sends require checking the provider before retry. No marketing campaigns are sent. Order notification opt-in does not imply marketing consent.

## Backup and recovery

Deployment creates /app/data/backups/pre-deploy-<timestamp>.sqlite in the persistent volume and stops if backup fails. Monitor disk space and arrange encrypted offsite copies and retention; the app does not automatically delete backups.

For recovery, pause intake and preserve the failed database including WAL/SHM files. Restore a verified backup into a separate volume/path first, run integrity and order/ledger checks against operational records, then switch to the reviewed volume. Never replace an active database. Previous app revisions do not implement new finance/payment behavior; rollback needs reconciliation planning.

Local validation created one synthetic order using the previous image, ran VACUUM INTO, upgraded to the new image, restarted, and started another container against the backup. Order counts and SQLite integrity survived. This is not a production offsite restore drill.

## Restaurant acceptance gates

Approved menu/prices/allergens, delivery/refund policy, actual named operators, real-device installation and staff collection/delivery UAT remain for the restaurant. Credentials and real provider tests remain for enabled payment/notification options. No production test order, real payment or notification was sent during this task. Keep these gates open in PROJECT_CONTEXT.md until evidence closes them.


## Customer app promotions

In Marketing & CMS, Add promotion, select Text banner / Image with text overlay / Popup, enter text, optional button category, start/end and Active. Images are required for image cards and optional for popups. Upload JPG, PNG or WebP under 2 MB; use a photo with space for readable overlay text. Preview, then Save draft or Publish to website. Publication does not alter menu prices or send messages. The app checks schedules on load and refreshes content once per minute while open. If overlapping popups are scheduled, the first active popup wins; at most one popup displays per browser session, outside basket/track/confirmation. A restored browser session may retain the dismissal.

Uploaded images are public by link immediately, even before publishing a draft. They reside in promotion_images in SQLite and are included in database backups. Library limit is 200 images; draft removal does not purge assets, because previous publications may reference them. Any manual archival must preserve image IDs in both current draft and published/previous content. No storage/provider secrets are required.
