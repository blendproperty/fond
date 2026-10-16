# Midpoint WhatsApp support routing - published configuration

**16 October 2026: published and reopened in WhatChimp bot474865.** Support keyword flow2171423 and main menu2171424 are saved. HUMAN/HELP/SUPPORT and related phrases open the eight-choice support list. MENU/HI/HELLO/HEY/START/TEST/MIDPOINT open the new main menu; its Talk to a human row opens the same routing choices without early assignment or pause. The old team2159819 and main2169689 remain recoverable under internal exact legacy triggers. HELP no longer overlaps the main-menu exact triggers.

Provider persistence and the seven exact direct links in support2171423 are verified. The main menu uses the same validated branch payload; six links were expanded and matched independently, while the Complaints node preview matches its imported payload and support equivalent. Native Gym/Functions forms and TRACK branches are retained. Other keeps Alistair's existing inbox assignment and Chat with human button; it does not introduce a guessed external telephone number.

**Handset UAT remains outstanding.** No test message or customer/staff conversation was sent. Saved configuration is not evidence of delivery, opening the destination on a physical phone, staff receipt/reply, same-chat pause/resume or old-menu compatibility. Send a fresh MENU to obtain current menu choices; already-delivered legacy buttons retain their original identities.

Browser control was restored after the prior kernel-path failure. File upload initially required the ChatGPT Edge extension's Allow access to file URLs setting; the owner enabled it, after which both imports succeeded. Provider Export flow data showed Success but did not expose a captured file/download; retained original flows and visible before snapshots are the rollback record, not a claimed fresh full JSON export. The new main was built from the saved current2169689 export after live visual/field comparison. Unrelated base nodes were compared byte-for-byte in local JSON, except start1, support row15 and Other reply input34.

Evidence is under `evidence/`: live main/support snapshots after reload, all seven expanded support messages, six expanded main links, retained previous triggers, before snapshots, keyword settings screenshot and FOND direct-link screenshot. `activated-support-source.txt` and `activated-main-source.txt` are the prepared payloads with the provider-verified active start settings; they are not newly exported provider files. `routing-plan.json` records the current provider IDs, contact map and pending gates. `provider-import-draft.json`, `support-preview.txt`, `main-preview.txt` and `local-validation.json` are historical local preview artifacts. `build-routing.py` emits a separate draft-routing-plan.json so it cannot overwrite the published status record.

Customer copy:

> **How can we help?**
>
> Choose what your enquiry is about, and we will connect you with the right person.

List button: **Choose enquiry**. Section: **Choose your enquiry**.

| Choice | Direct contact | WhatsApp number |
| --- | --- | --- |
| Padel | Alistair | +27 82 746 5401 |
| Accounts | Alistair | +27 82 746 5401 |
| FOND | Ray | +27 66 220 5519 |
| Functions | Michelle | +27 70 417 9160 |
| Gym | Christine | +27 71 689 6343 |
| Sales | Christine | +27 71 689 6343 |
| Complaints | Alistair | +27 82 746 5401 |
| Other | Existing Midpoint inbox handoff to Alistair | +27 69 042 0108 (Midpoint inbox) |

Complaints is included as a separate eighth choice because the owner explicitly assigned its routing. Each direct branch supplies a clickable `wa.me` link with the destination and enquiry topic already filled in. The customer opens it and taps Send; this is a separate WhatsApp conversation, without automatic transcript transfer. It does not automatically send to staff or prove staff receipt.

`routing-plan.json` contains every exact destination, prefilled message, requested trigger and release gate. `provider-import-draft.json` uses the saved WhatChimp graph schema and an isolated **midpointsupportpreview20261016** trigger. It intentionally does not activate HUMAN/HELP/SUPPORT during import. `build-routing.py` reproduces and validates the draft without network access.

The existing saved export's main-menu human row assigns Alistair (member `333467`) and leads to nodes34/35. Other preserves that saved row assignment, reply and system Chat with human button exactly. The current Other assignment was confirmed in the live main/team editor on16October and preserved. No new external number has been guessed for Other.

## Historical publication checklist and remaining handset checks

1. Open the signed-in Midpoint bot and export the latest main menu, team keyword flow2159819 and system human action2158936. Verify the current Other destination. Preserve each complete live export as rollback evidence.
2. Import the draft under its isolated preview trigger. Reopen it and verify provider acceptance of all eight rows and seven direct links. If using native CTA buttons instead of text links, confirm the provider's actual CTA schema in the UI; the draft does not invent that schema.
3. Modify the current main-menu Talk to a human row to open this submenu, clearing its early member assignment. Retain every unrelated branch, postback ID, native Gym/Functions form and TRACK path. Use a fresh export; never overwrite today's whole menu with the older saved base.
4. Move HELP off the main-menu exact trigger and route it here. Replace the current team-contact keyword handler in place or remove overlapping keyword registrations after backup. Route HUMAN, HELP, SUPPORT and the phrases listed in routing-plan.json to the chooser. Keep MENU as the main-menu command. Do not activate two competing handlers.
5. The support chooser and direct-contact rows must not pause the Midpoint chat or assign every enquiry to Alistair. Other alone retains the existing in-inbox handoff and pause behavior. Keep already-delivered legacy human buttons safe; do not promise an external handover for those old buttons without testing their provider behavior.
6. Save and reopen all changed flows. Export/read back triggers, menu targets, all numbers and Other. Compare unrelated routes to their backups.
7. Test HUMAN, HELP, SUPPORT and a natural request from a consenting handset. Select all eight choices, check the destination and prefilled topic, return via MENU, test old-menu buttons and verify no duplicate replies. Obtain staff receipt/reply proof separately. No outbound test is currently authorized to an unspecified test customer.
8. Update canonical PROJECT_CONTEXT.md with provider IDs and real evidence, commit/push, and confirm its presence on remote main. Provider-only changes do not require an application/container deployment.

## Local validation

Run `python docs/whatsapp-support-routing/build-routing.py` from the repository root. The saved local result records 21 nodes, eight rows, seven validated direct links, reciprocal graph edges, complete reachability, unique destinations by topic, row/section/button limits and preservation of Other's saved nodes. These checks do not prove provider import acceptance, live trigger behavior, handset rendering, receipt or staff response.
