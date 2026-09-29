# Midpoint Hub - customer screen review, 29 September 2026

Design prototype only. No customer-app implementation or staff-app changes are included.

Open `index.html` for the clickable mobile walkthrough, or `overview.html` for the ten-screen board. Serve this folder locally for best results. The current review server is http://127.0.0.1:3188/index.html (this computer only). Screens use Figtree from Google Fonts with a local system fallback. Assets are bundled; nothing entered in forms is saved, logged or submitted. Use dummy details.

## Screen set

1. Midpoint Hub: orange FOND / green Gym / blue Padel destinations.
2. Gym landing: supplied photography and circular Gym action icons.
3. Gym signup: first name, surname, email, mobile, ID/passport, tenant status and company; contact/registration consent.
4. Gym next steps: attend reception, staff register on Itensity, finalise payment and entrance access.
5. Gym classes: month/date selection, schedule, class details and simulated interest action.
6. Gym events: separate calendar and event details.
7. Padel landing: tenant signup, external Playtomic booking link and event calendar.
8. Padel tenant signup: identity/contact, tenant company/building and existing Playtomic account choice.
9. Padel next steps: staff verification, Playtomic assistance and details sent to the customer.
10. Padel events: calendar, details and simulated interest action.

FOND links directly to https://fond.mid-point.co.za/ in a new tab. No intermediate FOND landing page replaces the existing ordering app. Padel's booking action opens https://playtomic.com/ in a new tab; a verified Midpoint club-specific URL is needed before implementation. Staff retains Midpoint Cafe branding.

## Design references

- User-supplied midpoint-hub-mobile-icons-updated.html: extracted Hub logo and destination structure; the supplied FOND link is replaced with the user-requested ordering URL.
- https://www.mid-point.co.za/spaces: observed in browser on 29 September 2026; Figtree typography, dark evergreen, turquoise accents and amenity tone.
- Supplied Gym and Padel images: reused locally without raster editing.
- Supplied Gym icon reference: circular green badges, white line pictograms, branded captions; Padel uses a corresponding blue treatment.
- https://itensityonline.com/: reference only. The proposed operational flow is staff-assisted and completed at the gym, as requested.
- https://playtomic.com/: reference/booking destination only; no integration or account creation is implied.

## Validation and boundaries

See evidence/validation.txt and individual screen PNGs. All ten screens checked at 320, 390 and 768px, with both signup previews, calendar month/day changes, detail dialogs and simulated interest. Screenshot review includes the Hub/Gym/Padel overview, forms and calendar. Initial browser global-name collision was corrected before the passing checks.

Not implemented: storage, account linking, staff signup inbox, emails/SMS, calendar administration, capacity or confirmed bookings, Itensity or Playtomic integration, payments or entrance access. No production configuration or deployment occurred.

Before implementation: design acceptance; Hub domain/entry route and return navigation; approved membership/tenant wording and ID-data handling/retention; staff ownership and notification channel; real timetable, event content and participation rules; approved Midpoint Playtomic club link and actual tenant registration process. Existing payment, rewards, provider and operational readiness gates remain separate.
