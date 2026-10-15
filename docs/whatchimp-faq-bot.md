# Midpoint Hub WhatChimp FAQ bot

## Current Gym signup journey — 2026-10-15

Active MENU **2169454** adds **Gym → Gym menu → Join now** alongside the retained Functions submenu/calendar. Gym also offers Membership options, Classes, Your access, Gym info, Gym events and Contact Christine, matching the website destinations. Signup collects first name, surname, email, a **Use this number / Use another number** choice and company/tenant (Not applicable allowed). Only the alternative branch asks for a typed number. A review summary precedes explicit **Send to Christine / Cancel request** consent. This is an enquiry for team follow-up; Itensity membership, payment and access remain separate.

HTTP API **10171** explicitly maps the native WhatsApp sender and isolated Gym fields **77937–77946**, then stores the response message in **MidpointGymReply (77945)**. Published n8n **B2MlZgtSc9C0waTk**, version **20314bf5-5844-4512-8dbe-847d62ebb3df**, validates and emails `christine@midpointhub.com` a branded HTML email with Contact details and Signup details tables, readable plain text and customer reply links. Existing SMTP credential reused. A success confirmation requires recipient SMTP acceptance. Identity numbers/documents are not requested in the chat or included in this email; the established secure signup page/team process remains available.

Validation: saved/reloaded provider graph has **83 nodes / 82 connections**; question field selection and HTTP request/response mappings were read back. The provider's labelled synthetic TEST returned `submitted` for session `2026101507550001`. It ran before execution retention was enabled, so no direct SMTP-node receipt/timing is retained for that test; inbox receipt/rendering is unverified because Christine's mailbox requires separate login. Live cancellation execution **13603** and invalid-email execution **13604** returned safe responses and did not execute the email node. Isolated current/alternative phone, consent/cancel, name/email/phone validation, identity exclusion, escaping, seven table rows and reply-link checks passed. Desktop 760px/mobile 375px preview geometry had no horizontal overflow. User agreed to handset TEST; outcome remains pending.

Prior MENU **2168591** is retained under `midpointpreviousfunctionsmenu`. Functions date form **42766**, continuation **2168579**, email workflow **A88qBBIfTC5QG4Kb** and TRACK/HUMAN/ALI routes are preserved. The canonical [menu source](midpoint-interactive-menu.txt) is the import source synchronized to the saved live trigger; it is not a new provider export, and import-generated postback IDs may differ. [Evidence, renderer, redacted receiver, preview and checks](evidence/2026-10-15-gym-whatsapp/). Complete handset branches, cancellation/restart/isolation, Christine inbox receipt, other-client rendering and the previously reported WhatsApp latency remain open gates. Earlier MENU IDs below are historical.

## Current Functions journey — 2026-10-15

Email design update: published version **00a4c7ca-5d76-48ef-90a5-3c81d4016a64** replaces the basic table with a branded green header, prominent date/guest/catering summary, separate Contact details and Event details tables (ten labelled rows), and email/WhatsApp customer reply links. The renderer escapes customer content and highlights labelled TEST enquiries. Browser previews passed at 760px and 375px with no horizontal overflow. Live synthetic execution **13599** succeeded at 07:17 SAST; SMTP accepted Michelle, rejected none, returned 250 queued, with 883ms email-node / 946ms workflow duration. The received TEST was opened in Hostinger Mail and the header, date summary, both tables and reply links were visually verified. This proves that test's inbox receipt/rendering, not Michelle's personal read acknowledgement or the complete revised handset journey. [Renderer, preview, inbox screenshots and verification](evidence/2026-10-15-functions-email/). The version and inbox-pending statement in the earlier restoration paragraph below are historical.

The active MENU is **2168591**, with the website-style Functions submenu and published native date form **42766**. Date submission continues into **2168579**. The customer chooses **Use this number** or **Use another number**; only the latter asks for a number. HTTP API **10157** reads the sender directly from the native Phone Number (`chat_id`) field and forwards explicitly mapped enquiry fields. Customer review precedes **Send to Michelle** or **Cancel enquiry**.

The owner clarified that Michelle must receive **email**. Published n8n **A88qBBIfTC5QG4Kb**, version **149c5348-4785-4dd6-b823-d8a44539087a**, now emails an escaped HTML table plus plain text to `michelle@midpointhub.com` using the original SMTP credential. The WhatsApp sending node was removed from this workflow. The earlier approved WhatsApp template/workflow remains historical configuration and is not called by the enquiry. Confirmation requires SMTP acceptance; cancellation and missing consent do not send. The current server parser validates dates, guests, email, phone and budget. Guest/email/alternative-phone answers use native Text custom fields, with format validation at submission. All question mappings now use the provider's numeric field IDs; random-generator and condition IDs retain their required `custom_` prefix.

Validation: saved continuation reloaded with 37 nodes/36 rendered connections, two email-consent questions and two consent mappings. Synthetic execution **13596** accepted the email recipient, rejected none, and returned SMTP `250` in 859 ms; total workflow 1005 ms, measured HTTP request 1767 ms. Cancellation also returned `cancelled` live without email. Isolated sender/alternative, consent, date, guest-count and HTML-escaping checks passed. Michelle inbox/read confirmation and the complete revised phone-calendar-to-email journey remain UAT gates.

Latency evidence: the test MENU and recorded bot reply show **2026-10-14 15:56 SAST**, while that reply's delivery receipt shows **15:59**. Timestamps have minute precision. Message delay settings in the saved menu/continuation are zero; general bot settings showed no added response timer. This locates the observed delay between recording the reply and WhatsApp delivery, but does not identify the exact provider/Meta/network cause or demonstrate a fix. Earlier minute-level conversation records are insufficient to measure each question precisely. Latest phone readback ends at MENU, without a completed revised enquiry.

Evidence: [current provider readback](evidence/2026-10-14-functions-whatsapp/provider-current-2026-10-15.txt), [email consent](evidence/2026-10-14-functions-whatsapp/email-consent-2026-10-15.png), [verification](evidence/2026-10-14-functions-whatsapp/verification-2026-10-15.json), [current parser](evidence/2026-10-14-functions-whatsapp/prepare-email-table.js), [email node](evidence/2026-10-14-functions-whatsapp/email-table-node.json). Earlier entries below are historical and superseded where they describe typed dates, mandatory phone entry or WhatsApp staff delivery.

2026-10-14 Functions submenu: active MENU flow is now **2168493**, replacing 2164388 (retained under `midpointpreviousmenu`). Selecting **Functions & events** opens its own **Functions menu** with Plan an event, Event spaces, Food & packages, Meet Michelle and Gallery. Plan an event asks eleven questions in WhatsApp: catering style (the six website choices), preferred date, guest count, contact person, email, contact number, company, budget, budget basis, theme/occasion and explicit Send to Michelle consent. Replies are retained in the native WhatChimp input campaign; this does not create a website booking-calendar record or confirm availability. Date and budget are customer-entered enquiry details for Michelle to review.

Completed campaign forwarding targets the published n8n workflow **A88qBBIfTC5QG4Kb**, with a fixed recipient `michelle@midpointhub.com`, using the existing SMTP account and sender `Midpoint Hub Enquiries <no-reply@onpointoffices.co.za>`. The webhook endpoint is private and redacted from the repository export. Restore its configured value from WhatChimp/n8n before importing the saved graph. The receiver requires a Send to Michelle response, rejects incomplete payloads, excludes secret fields and marks TEST enquiries. Website enquiry email remains separate. Provider configuration and graph readback passed; actual completed-phone submission, exact provider payload mapping, SMTP acceptance and Michelle inbox receipt are separate validation gates until evidenced below.

Evidence: [redacted provider readback](evidence/2026-10-14-functions-whatsapp/provider-readback.txt), [submenu screenshot](evidence/2026-10-14-functions-whatsapp/functions-submenu.png), [email preparation code](evidence/2026-10-14-functions-whatsapp/prepare-consented-enquiry.js). Original draft scaffold 2168456 and incompatible import 2168492 are retained under internal preview triggers and are not MENU destinations. Existing TRACK, notification, HUMAN/ALI and human-pause flows are preserved. Old delivered menus retain their original button identifiers; customers must send a fresh MENU to use the new route.

2026-10-12 selectable-menu update: flow 2164388 now opens a short Midpoint Hub welcome and Choose an option list for HI, HELLO, HEY, START, HELP, MENU, TEST or MIDPOINT (exact match). Nine choices cover FOND, tracking, rewards, gym, padel, functions, hours/delivery, team and account. Saved provider export: [midpoint-interactive-menu.txt](midpoint-interactive-menu.txt). Original welcome flow 2159807 retained with midpointlegacywelcome trigger. Get Started automatic text greeting disabled to avoid duplicate menus; unknown messages now receive short MENU guidance. Team choice has a Speak to team human-handoff button; tracking choice guides to existing TRACK lookup. Provider persistence and graph checks passed; actual handset rendering/routing/handoff UAT remains required. Earlier Get Started and keyword-menu records below are historical.

2026-10-12 Ray contact update: Team contact flow 2159819 now lists FOND orders — call Ray: +27 66 220 5519, alongside ray@midpointhub.com. Added ray,call ray,phone ray,order help keywords. Both reply branches of live order-status flow 2163381 also supply his number. Saved content and trigger readback passed; actual new-message delivery/telephone reachability remain unverified.

2026-10-12 update: tracking now uses the separately deployed live order-status flow 2163381 and HTTP API 10087, documented in [whatsapp-order-status.md](whatsapp-order-status.md). Flow 2159813 was renamed to Notification opt-in, with keywords notification,whatsapp notification,whatsapp opt in,whatsapp checkbox,greyed out; its reply now explains opt-in and directs TRACK to the live lookup. The original 9 October content/readback below remains historical evidence. Provider configuration/API checks passed; handset conversation UAT remains pending.

Configured and provider-readback verified on 2026-10-09 for Midpoint Cafe, bot 474865. This is a keyword FAQ bot with a useful unmatched-question fallback, not a generative AI agent or live order lookup.

Sources reviewed live: https://midpointhub.com/, /fond, /fond/menu, /fond/hours, /fond/fulfilment, /fond/track, /profile, /profile/rewards, /profile/help, /gym, /padel, /functions, /car-wash and /suites. Public /api/store confirms online payments disabled, delivery/collection and WhatsApp enabled. The fulfilment information page still mentions online payment; replies use current basket/payment behaviour instead.

Provider validation: all 13 keyword flows reopened after saving; full reply text and one connected start-to-text edge verified. Existing Get-started and No Match action flows each retain two connections and their branded reply texts. No Match enabled with Every Time frequency; Get-started enabled Once a day. Settings publish returned success and re-navigation confirms persistence. No outbound test message or customer-data lookup performed. Handset conversation routing and multi-topic priority are UAT pending.

Maintenance: these replies are static. Update hours and payment replies when live trading/payment settings change. Price/availability/booking queries link to the live website rather than quoting fixed prices. Human contact replies provide published addresses and allow leaving a question in the shared inbox; no agent assignment, response-time guarantee, automatic staff email or external escalation was added. Existing order templates/API credentials unchanged.

## Handset UAT

Send HELP, then ask one topic per message: What are your opening hours?; How do I book padel?; Tell me about gym membership; How do coffee rewards work?; How do I pay?; Where is my order?; Do you offer a car wash?; I have an allergy; TEAM; an unrelated question. Confirm topic reply, correct links and unmatched-question fallback. Existing accepted/ready order notifications were reported working by the owner earlier in this conversation; that is owner-reported acceptance, not a new independent delivery test.

## Saved keyword flows

### Midpoint Hub - Food and ordering

Provider editor: https://app.whatchimp.com/flowbuilder/whatsapp/edit/2159808/474865

Keywords: food,breakfast,lunch,dinner,burger,pizza,sandwich,order food,food menu,fond menu

Matching: String match

Reply:

FOND serves quality coffee, fresh food and all-day favourites at Midpoint Hub.


View the current menu, prices and availability, and place your order here:
https://midpointhub.com/fond/menu


Choose delivery or collection in the basket. Orders must be placed through the website; this chat cannot place or change an order.


Reply HOURS, DELIVERY, PAYMENT, TRACK or REWARDS for more help. Reply TEAM for a person, or HELP for all topics.

### Midpoint Hub - Allergies and dietary questions

Provider editor: https://app.whatchimp.com/flowbuilder/whatsapp/edit/2159822/474865

Keywords: allergy,allergies,allergen,gluten,nut free,nut-free,dietary,vegan,vegetarian,halal

Matching: String match

Reply:

FOND’s website states that food is prepared in an environment that handles gluten and nuts. Please contact FOND about allergies before ordering.


For ingredients, dietary requirements or suitability, ask Ray: ray@midpointhub.com, or leave your question here for the team. The bot cannot confirm an item is allergen-free or suitable for a specific dietary requirement.


Current menu: https://midpointhub.com/fond/menu
Reply TEAM for contacts or HELP for all topics.

### Midpoint Hub - Coming soon

Provider editor: https://app.whatchimp.com/flowbuilder/whatsapp/edit/2159820/474865

Keywords: car wash,carwash,suite,suites,accommodation,stay overnight

Matching: String match

Reply:

Car Wash and The Suites corporate accommodation are currently marked “coming soon” on Midpoint Hub. Booking and service details will appear on the website when available.


Car Wash: https://midpointhub.com/car-wash
The Suites: https://midpointhub.com/suites


No launch date, price or booking is confirmed by this bot. Reply HELP for the services available now.

### Midpoint Hub - Team contact

Provider editor: https://app.whatchimp.com/flowbuilder/whatsapp/edit/2159819/474865

Keywords: team,human,person,agent,contact,speak to someone,complaint,cancel my order,change my order

Matching: String match

Reply:

For help from the Midpoint team:
FOND — Ray: ray@midpointhub.com
Gym — Christine: christine@midpointhub.com
Padel — Ali: ali@midpointhub.com
Functions — Michelle: michelle@midpointhub.com


Contact page: https://midpointhub.com/profile/help
You can also leave your question in this chat for the team to review. Replies may not be immediate. For an order issue, include your FOND order reference and describe what you need.


The bot cannot cancel/change an order or confirm a refund or booking. Reply HELP to return to the topic menu.

### Midpoint Hub - Functions and events

Provider editor: https://app.whatchimp.com/flowbuilder/whatsapp/edit/2159818/474865

Keywords: function,functions,event,party,celebration,catering,conference,venue,team breakfast

Matching: String match

Reply:

Planning a team breakfast, gathering or celebration at Midpoint Hub?


Send your enquiry: https://midpointhub.com/functions/enquire
Event spaces: https://midpointhub.com/functions/spaces
Food and packages: https://midpointhub.com/functions/packages


Michelle can help shape the occasion: michelle@midpointhub.com
Please include your preferred date, approximate guest count and what you have in mind. Your enquiry is not a confirmed booking; the team will confirm availability and arrangements. Reply HELP for all topics.

### Midpoint Hub - Padel

Provider editor: https://app.whatchimp.com/flowbuilder/whatsapp/edit/2159817/474865

Keywords: padel,playtomic,court,racket,racquet

Matching: String match

Reply:

Enjoy rooftop padel at Midpoint!


Book a court through Playtomic:
https://playtomic.com/clubs/midpoint-padel
Current court prices: https://midpointhub.com/padel/prices
Events and leagues: https://midpointhub.com/padel/events
How it works: https://midpointhub.com/padel/info


For help, contact Ali: ali@midpointhub.com
Court availability and confirmed bookings are handled by the booking service; this bot cannot reserve a court. Reply HELP for all topics.

### Midpoint Hub - Gym

Provider editor: https://app.whatchimp.com/flowbuilder/whatsapp/edit/2159815/474865

Keywords: gym,fitness,workout,training,trainer,membership,classes

Matching: String match

Reply:

Midpoint Gym offers a fully equipped gym, trainers and classes designed for busy days.


Classes: https://midpointhub.com/gym/classes
Membership options: https://midpointhub.com/gym/membership
Join: https://midpointhub.com/gym/signup
Gym information: https://midpointhub.com/gym/info


Please use these pages for current availability and membership details. For help, contact Christine: christine@midpointhub.com
The bot cannot confirm access or a booking. Reply HELP for all topics.

### Midpoint Hub - Coffee rewards

Provider editor: https://app.whatchimp.com/flowbuilder/whatsapp/edit/2159814/474865

Keywords: rewards,reward,loyalty,free coffee,coffee card,coffee punches

Matching: String match

Reply:

Ten coffees. One on us.
Earn a punch for each paid Coffee item ordered through your verified FOND account, once collected or delivered. Collect 10 punches and enjoy your next Coffee item free. Extras are charged separately.


Sign in to view your coffee card and redemption code:
https://midpointhub.com/profile/rewards


Redeem in the app or show your code to staff. I cannot view or adjust your rewards balance here. Reply TEAM for an account issue, or HELP for all topics.

### Midpoint Hub - Tracking and notifications

Provider editor: https://app.whatchimp.com/flowbuilder/whatsapp/edit/2159813/474865

Keywords: track,status,where is my order,order update,order accepted,order ready,notification,whatsapp notification

Matching: String match

Reply:

Track your FOND order here using the order number on your confirmation:
https://midpointhub.com/fond/track


For WhatsApp accepted/ready updates, enter your WhatsApp contact number in checkout and tick “WhatsApp me when my order is accepted and ready” before placing the order. The checkbox is disabled until a contact number is entered. SMS consent is separate.


I cannot look up your live order in this chat. If you need help, reply TEAM and include your order reference. Reply HELP for all topics.

### Midpoint Hub - Payment help

Provider editor: https://app.whatchimp.com/flowbuilder/whatsapp/edit/2159812/474865

Keywords: payment,pay online,pay by card,how do i pay,yoco,refund

Matching: String match

Reply:

For FOND orders, online Yoco checkout is currently unavailable. Pay at FOND when collecting, or by card when your delivery arrives. The basket shows the current payment options:
https://midpointhub.com/fond/menu


For a payment problem or refund query, reply TEAM and describe the issue with your order reference. A team member must review it; the bot cannot approve refunds or change payments. Please do not send card details, PINs or banking passwords.


Reply HELP for all topics.

### Midpoint Hub - Delivery and collection

Provider editor: https://app.whatchimp.com/flowbuilder/whatsapp/edit/2159811/474865

Keywords: delivery,deliver,collection,collect,pickup,pick up

Matching: String match

Reply:

Choose collection or delivery when ordering:
https://midpointhub.com/fond/menu


Collection: collect from FOND at Midpoint Hub and choose an available collection time in the basket.
Delivery: available for eligible businesses/buildings at Midpoint Hub. Enter your business, building and contact number; add your floor or desk to the order note. A confirmed location pin is optional.


The basket shows currently available options, estimated timing and payment arrangements. Reply PAYMENT, TRACK or HELP for more information.

### Midpoint Hub - Opening hours

Provider editor: https://app.whatchimp.com/flowbuilder/whatsapp/edit/2159810/474865

Keywords: hours,opening,closing,open time,close time,when are you open,what time do you open,what time do you close

Matching: String match

Reply:

FOND Café & Eatery: Mon–Fri 07:00–18:30; Saturday 07:00–12:00; Sunday closed.
Food Truck: Mon–Fri 07:00–15:30; Saturday and Sunday closed.
All times are South African time.


Check the latest hours and trading availability before ordering:
https://midpointhub.com/fond/hours


For gym and padel information, reply GYM or PADEL. Reply HELP for all topics.

### Midpoint Hub - Welcome and help

Provider editor: https://app.whatchimp.com/flowbuilder/whatsapp/edit/2159807/474865

Keywords: hi,hello,hey,start,help,menu,test

Matching: Exact keyword match

Reply:

Hi! Welcome to Midpoint Hub
I’m the automated Hub helper. Reply with a topic:


FOOD — FOND menu and ordering
HOURS — café and food truck hours
DELIVERY — collection or delivery
PAYMENT — how to pay
TRACK — order updates
REWARDS — coffee rewards
GYM — classes and membership
PADEL — court bookings
FUNCTIONS — events and functions
TEAM — help from a person


Explore everything: https://midpointhub.com/
Send HELP to see these options again.

## System action replies

### Get started

Provider editor: https://app.whatchimp.com/flowbuilder/whatsapp/edit/2158942/474865

Welcome to Midpoint Hub
I’m the automated Hub helper. Ask about FOND food, opening hours, delivery, payment, order tracking, coffee rewards, gym, padel or functions.


You can also reply with a topic: FOOD, HOURS, DELIVERY, PAYMENT, TRACK, REWARDS, GYM, PADEL, FUNCTIONS or TEAM.


Explore: https://midpointhub.com/
Reply HELP for the topic menu.

### No match

Provider editor: https://app.whatchimp.com/flowbuilder/whatsapp/edit/2158943/474865

I’m the automated Midpoint Hub helper. I couldn’t match that question to an FAQ.


Try one topic: FOOD, HOURS, DELIVERY, PAYMENT, TRACK, REWARDS, GYM, PADEL or FUNCTIONS.
For allergies or ingredients, reply ALLERGIES. For car wash or accommodation, reply CAR WASH or SUITES.


For a person, reply TEAM or visit https://midpointhub.com/profile/help. You can leave your question here for the team; replies may not be immediate.


Explore the Hub: https://midpointhub.com/
Reply HELP for the topic menu.
