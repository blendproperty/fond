# Midpoint Hub WhatChimp FAQ bot

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
