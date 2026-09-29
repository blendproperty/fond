# Midpoint Hub migration and handover — 2026-09-29

Approved: midpointhub.com home, /fond, /gym and /padel. Current FOND is
fond.mid-point.co.za, not .com. Reuse /opt/fond and its database volume.

## DNS and cutover

Verified Hostinger DNS: @ A 2.57.91.91 (TTL 50); www CNAME midpointhub.com
(TTL 300). Current FOND VPS is 93.127.186.194. Nameservers are
atlas.dns-parking.com and hyperion.dns-parking.com. Keep all MX, SPF, DMARC,
hostingermail DKIM, autodiscover and autoconfig records unchanged.

1. Verify the exact code revision, release to existing isolated staging, inspect
   /hub, /gym, /padel, /fond and /hub/manage, then promote through the established
   staging-success gate. Production deployment already backs up its database.
2. Run Manage Midpoint Hub Domain with that production SHA, mode inspect.
   Only routing settings are printed. Then run prepare to add apex/www TLS
   aliases to the existing service while preserving the old FOND homepage.
3. In Hostinger edit only @ A to 93.127.186.194. Keep www CNAME. Verify DNS and
   HTTPS on both new domains and recheck the unchanged mail records.
4. Run cutover. It first checks apex/www resolve only to the VPS and both have
   working HTTPS health endpoints. It enables the Hub root and staff email alerts,
   sets FOND_HOST/public URL to the new domain, and preserves the old alias.
5. Verify new Hub/FOND/account/rewards/staff/admin, departmental workspace, old
   navigation redirects and unchanged payment/reward configuration. Do not create
   production orders, signups, payments or identity records as test evidence.

Only GET/HEAD page navigation redirects (307). Old root becomes /fond; query
strings and other paths survive. API callbacks remain on their original routes.
New payment returns go to /fond; old root return links are still handled.
FOND_CALLBACK_URL preserves the old Twilio callback/signature URL. Existing Yoco
and Meta registrations remain reachable; no provider secret is rotated. Retire
legacy callbacks only after provider changes and controlled verification.

Rollback mode restores old FOND host/public URL and disables Hub-home and email
switches, retaining both domains, data and unrelated configuration. DNS can stay
on the VPS. Private .env.before-hub-* server backups contain secrets: never copy
them into Git or a container image. No nameserver, mailbox or database transfer.

## Staff setup

| Area | Contact | Access |
| --- | --- | --- |
| Gym / sales | christine@midpointhub.com | Gym role at /hub/manage |
| Padel / accounts | ali@midpointhub.com | Padel role at /hub/manage |
| FOND | ray@midpointhub.com | Existing FOND workflows |
| Functions | michelle@midpointhub.com | Function enquiry email |

Owner/super admin creates named Gym/Padel accounts in Admin Settings → Team.
No real accounts/passwords are automatically created. Staff can enroll an
authenticator in /hub/manage. Each department sees only its own requests/events;
neither role grants FOND order/admin access. Owner/super admin oversees both.

Staff enter actual dates, locations and descriptions in South African time and
choose when to publish. Padel staff configure the real Playtomic venue link.
Until configured, court enquiries go to Ali. Calendars start empty.

ID/passport collection was explicitly requested. All submitted personal details
are AES-256-GCM encrypted using the existing vault key and a per-row binding.
Protect that key in backups. Email alerts contain no applicant names, contact
details or identity numbers, only a protected workspace link. Requests remain
saved if email fails; staff can inspect delivery state and retry. The existing
verified Resend sender is retained. Hostinger receives/forwards the new mailbox
addresses. A new transactional sender domain needs separate Resend verification.

Open gates: real team accounts/2FA and credential handover; staff UAT/training;
actual schedules and venue link; privacy/retention ownership; real inbox/forwarding
delivery verification; Itensity/Playtomic handoff acceptance. Signup does not take
payment, activate membership/access or reserve a place. Preserve all existing
FOND sandbox, rewards, provider, finance and backup/restore gates.
