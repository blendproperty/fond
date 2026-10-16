# Midpoint WhatsApp support menu - prepared, not published

Prepared 16 October 2026. Provider bot: Midpoint Cafe `474865`.

**Status: local draft only.** Both browser-control runtimes failed before session startup with `failed to write kernel assets: The system cannot find the path specified. (os error 3)`. No provider writes, customer messages or changes to existing live routing were made. Publishing and provider/handset verification remain outstanding.

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
| Other | Preserve existing live handoff | Verify current destination before publication |

Complaints is included as a separate eighth choice because the owner explicitly assigned its routing. Each direct branch supplies a clickable `wa.me` link with the destination and enquiry topic already filled in. The customer opens it and taps Send; this is a separate WhatsApp conversation, without automatic transcript transfer. It does not automatically send to staff or prove staff receipt.

`routing-plan.json` contains every exact destination, prefilled message, requested trigger and release gate. `provider-import-draft.json` uses the saved WhatChimp graph schema and an isolated **midpointsupportpreview20261016** trigger. It intentionally does not activate HUMAN/HELP/SUPPORT during import. `build-routing.py` reproduces and validates the draft without network access.

The existing saved export's main-menu human row assigns Alistair (member `333467`) and leads to nodes34/35. Other preserves that saved row assignment, reply and system Chat with human button exactly. This is historical configuration evidence, not proof of the current destination. No new number has been guessed for Other.

## Publication steps once browser control is restored

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
