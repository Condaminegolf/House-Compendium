# Property Care V4 — Scan a QR code; no employee sign-in

**Status:** Finished QR-first front-end prototype and backend migration/functions package; **NOT DEPLOYED**. The dedicated Supabase project still must be created/configured. The previous Ascension and Condamine Golf databases were NOT modified. The QR landing screen works in demo mode without a database.

## The employee experience

1. A unique QR label is fixed inside each of the 30 houses (fridge, entry information folder, etc.).
2. Employee scans it with a phone camera. The link looks like `https://YOUR-SITE/index.html?house=RANDOM_QR_CODE`.
3. The page opens the correct house straight away — **no registration, login, password or address selection**.
4. Employee sees house details, published photo/video guides, step-by-step troubleshooting, regular-care checklists, and a maintenance request form.
5. A ticket sent in production goes to the existing staff-only maintenance queue. The request status is remembered on the sending browser with an opaque receipt token. QR codes do not grant access to someone else's tickets.
6. Maintenance staff, content editors and administrators use `staff.html` with email/password. **Only staff sign in** because they can access sensitive details, incoming photos and work orders.

If the user opens the app without a `house` parameter, it asks them to scan the QR code; there is a sample-house button for testing. `?house=DEMO-H01` to `?house=DEMO-H30` are harmless local demos. These demo QR identifiers must **NOT** be printed in occupied houses.

## File guide

- `index.html`, `resident.css`, `resident.js`, `demo-guides.js`: new QR-first employee app, with working safe demonstration mode.
- `staff.html`, `style.css`, `app.js`: original V3 staff editor / technician queue, now labelled staff-only.
- `qr-generator.html`: printable 30-label sheet. Once staff are signed into the configured staff portal, it loads the live random `qr_code` for every house directly from the staff-permitted database. It can also generate labelled **demo-only** codes for layout testing.
- `config.js`: project URL and *publishable* key only. Never place a service-role key or OpenAI API key here.
- `supabase/schema.sql`: V3 base tables and staff permissions. **Install first on a new Property Care project only.**
- `supabase/qr-no-login-migration.sql`: V4 changes: unguessable per-house QR codes, guest ticket/attachment support, and removal of legacy resident direct-access policies.
- `supabase/functions/pc-public/index.ts`: restricted unauthenticated public endpoint; permits only (1) published house guides and relevant tasks, (2) new anonymous tickets, (3) attachment upload-token issue, and (4) status read with a secret ticket receipt. Uses a service-role key **only server-side**.
- `supabase/optional-sample-drafts.sql`: six unapproved draft guides, for staff review, from V3.
- `houses-template.csv`: placeholder property-address records.

## Setup on a NEW dedicated Supabase project

1. Create the project in a suitable region. Do **not** reuse the fitness or golf databases.
2. In Supabase SQL Editor, execute `supabase/schema.sql`, then `supabase/qr-no-login-migration.sql` in that order. Review the security policies with your administrator.
3. Create only staff accounts in Auth (administrator/editor/technician), disable employee/public sign-up, and add staff roles in `pc_staff_roles`. Example:
   ```sql
   insert into public.pc_staff_roles(user_id,role)
   select id,'administrator' from auth.users where email='admin@example.com'
   on conflict(user_id) do update set role='administrator';
   ```
4. Deploy the Edge Function at `supabase/functions/pc-public/` named `pc-public`, using `verify_jwt=false` because it supports QR users **without login**. The function uses managed project env secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` and must never expose them to the website. Configure `PC_APP_ORIGIN` to the precise deployed origin (e.g. `https://example.github.io`).
5. IMPORTANT BEFORE PRODUCTION: configure managed CAPTCHA/Turnstile verification, rate limits and spam/abuse monitoring. V4 includes a simple per-house 25/day cap, input length limits, a honeypot and attachment caps, but these are not adequate by themselves for an internet-exposed anonymous submission service. Test service-role access, storage policies, CORS and abuse controls before publishing stickers.
6. Set `supabaseUrl` and `publishableKey` in `config.js`. Host `index.html`, `resident.css`, `resident.js`, `demo-guides.js`, `config.js`, `staff.html`, `style.css`, `app.js`, and `qr-generator.html` over HTTPS, ideally under one directory. No live tenant data belongs in a public repository.
7. Log into `staff.html` as administrator. Update all 30 property addresses, water supplies, emergency maintenance numbers, and equipment. Approve safe guides. Photos/videos attached to **published guides** become viewable to anyone scanning the applicable QR link. Administrators can also mark **routine, property and equipment photos/videos** as explicitly public with a checkbox; unpublished reference media remains private. Published files use short-lived signed URLs. The administrator can set distinct **PUBLIC QR notes** separate from internal house notes.
8. Open `qr-generator.html`, enter the final live application URL, choose **Load live house QR labels**, verify each address, then choose **Print labels**. QR links contain random `qr_code` values generated by the database. Do not use sample `DEMO-Hxx` codes in live housing.
9. On two phones, test one QR per house, guided troubleshooting, a new ticket with and without a photo/video, ticket status, and the ticket's appearance in `staff.html` for technicians. Test all content permissions with staff and nonstaff and check poor-connectivity behavior.

## Privacy and important limitations

- QR links are **convenience identifiers, not secure login credentials**. Anyone who photographs or receives a QR link can see that house's **published** content. Never show residents' personal details, private photos, internal passwords, security codes, or sensitive installation documentation there.
- Employees are **not** asked for a login. Their name and contact number on maintenance requests are optional. They do not get a personalised cross-device ticket history; only requests previously made on that browser are visible there using an unguessable receipt. We do NOT share the technician queue with anonymous visitors.
- Photos/videos in tickets are private and accessible only to appropriately authorised staff. The app limits ticket attachments to 3 each of max 25 MB. Video formats need on-device testing.
- No ChatGPT engine has been connected yet. Guides are currently searched by title/keywords and follow editorial-approved steps. The QR flow is compatible with a later server-side AI assistant that uses only approved per-house knowledge.
- English remains the operative language for **technical/safety instructions**. The UI has selectable language labels for English, Filipino and Cebuano; Ilocano/Hiligaynon preference is saved but their UI/safety content has **not** been translated. Review all translations with fluent employees before live rollout.
- Routine checklist ticks are saved on the individual device (not auditable, not synced across residents). With no login, shared resident check-offs would require a separate agreed anonymity/privacy model.
- For emergencies, **phone maintenance or 000**. A ticket is not an emergency alert. Guides need qualified safety review.
- The live Edge Function, real QR printing, database migration and cloud uploads have **not** been executed/tested against a production project. Browser-level sample experience and static checks can be tested independently.

## Prototype tryout

Open `index.html?house=DEMO-H01` after hosting. Without hosting, some browser `file://` environments may restrict scripts. The demo is standalone and does not submit real tickets. Test the navigation, guided branches, checklist and request form. For mobile scanning, host a copy over HTTPS and use `qr-generator.html` to generate sample QR labels with the hosted URL.
