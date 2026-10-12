# WhatsApp live order status

2026-10-12: application endpoint deployed, production API checks passed, and WhatChimp credential grant and flow activation explicitly approved and completed. Handset UAT remains pending.

Customer journey: send TRACK or ORDER STATUS, enter the full FOND-XXXX-XXXX confirmation number, receive the current status if the WhatsApp sender matches the contact number stored on that order. Querying is read-only and does not require opting into automatic accepted/ready notifications. A customer who used another phone should use website tracking or ask the team.

Human order help: call Ray on **+27 66 220 5519** (owner-supplied 2026-10-12). Both live status and fallback bot replies include this direct call instruction. TEAM or RAY also returns his number and ray@midpointhub.com. This is a telephone contact, not an automatic conversation transfer or confirmed WhatsApp account. Actual telephone reachability is unverified. The bot sender remains +27 69 042 0108.

## API contract

POST https://midpointhub.com/api/whatsapp/order-status

Authorization: Bearer <dedicated lookup key>. Never reuse the outbound messaging API token. The dedicated key is stored under whatchimp-order-status-token in the app's encrypted credential vault. Do not put it in URLs, documentation, logs or screenshots.

JSON or application/x-www-form-urlencoded request fields:

- phone: WhatChimp's built-in Phone Number / chat_id field. Never collect or overwrite this from a customer's answer.
- reference: MidpointOrderReference custom field populated by the input question.

Response: one message string only. Authorized business failures (unknown reference, wrong phone, invalid reference, throttling) also return a non-disclosing message. Unauthorized requests return 401; oversized streamed requests return 413. Status reads are no-store and throttled per phone and globally using persisted hashed counters. No amounts, names, items, notes, addresses or payment details are returned.

## Saved WhatChimp flow

Live flow: https://app.whatchimp.com/flowbuilder/whatsapp/edit/2163381/474865. Verified active HTTP API: 10087. Notification-only FAQ: 2159813.

1. Start: exact tracking keywords; save the incoming command into MidpointOrderStatusReply to reset any previous reply.
2. User Input Flow: Midpoint order status reference.
3. Question: ask for full order number; save Text answer to MidpointOrderReference (custom field 77731); leave system phone mapping empty.
4. HTTP API: Midpoint Hub - My order status; POST form transport; phone from built-in Phone Number, reference from MidpointOrderReference; static Authorization header.
5. Map the response message into MidpointOrderStatusReply (custom field 77732).
6. Condition: MidpointOrderStatusReply contains Checked:.
7. True: send the provider-generated #MidpointOrderStatusReply# tag. False: send generic verification/unavailable guidance and website/team links.

The saved flow has seven nodes and six connections (question-to-API uses Thankyou Message); all were verified after reopening its provider editor. The previous tracking FAQ now retains only notification/opt-in questions, so the tracking keywords have one owner. Existing welcome/help lists already include TRACK. Exact commands include track, status, order status, track my order, where is my order, where is my order?, what is my order status and order update. Send the reference as the answer to the following question; an inline reference after TRACK is not parsed by this flow.

The exact command match plus reset/condition guard prevents a failed API call from reusing an earlier status. The flow must be tested on a handset to confirm provider execution semantics, completed-input routing, and failure handling. It is not a general-purpose order mutation or account-access integration.

## Evidence and remaining UAT

Local: Next 16.3.8 build/typecheck and 210 unit tests passed (six new lookup tests). CI 38211547136 successful; staging 38211982566 and production promotion 38212531849 successful at a71c632a6fdd51b603461839e4c0493c6b6ede54. SSH confirms exact revision and healthy containers. Read-only production HTTPS checks pass matching phone, wrong phone, unknown reference, unauthorized key and no-store response; DB integrity passes. No production orders or WhatsApp test sends created.

Provider verification: harmless sample API request returned Success, message mapped to field 77732, API saved and visible with the Active filter. Reopened editor confirms the dedicated credential persisted (boolean-only equality check), endpoint/method and system phone/custom reference/response mappings. Flow and revised FAQ save confirmations and readback passed. No real handset test or outbound test message was performed.

Pending: customer handset checks for matched and wrong-owner references, latest status after staff changes, repeat lookups, invalid input, completed-question routing, previous-result reset and unavailable-provider fallback. Preserve all existing business/provider/UAT gates. These readback/API checks establish deployed/configured capability, not end-to-end handset acceptance.
