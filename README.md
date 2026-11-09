# Property Care — House Compendium

## Accommodation spreadsheet integration — 9 November 2026

The uploaded **Accommodation compendium data for app.xlsx** has been imported into the live **Compendium** Supabase database.

- Workbook tabs: `Regular Care` and `Something wrong`; these feed the corresponding employee app sections.
- 33 property columns were mapped in order to property IDs `H01` through `H33`. The original QR identifiers for the existing 30 properties were preserved; H31–H33 received new QR codes.
- The workbook lists `37 WAMBO ST` twice. These are separate property records `H15` and `H16`, not automatically merged. Confirm which is which before printing labels.
- The 39 nonempty instruction rows were imported, with 1,287 house-to-instruction assignments. Original text and worksheet row numbers are preserved.
- The data contains identical guidance for every house, including descriptions of specific bore pumps, septic systems and donga electrical boards. **Do not assume those instructions are correct at each address.**
- Six low-risk topics were published for employees; 33 need editorial/technical review. Unreviewed topics are only visible to staff in the **Workbook content** dashboard.
- Editors can amend drafts, add photos/videos/transcripts, and leave review notes. Administrators can restrict a topic to selected houses and publish it after an explicit safety check.
- Published entries load securely through the `pc-public` Edge Function according to the scanned house QR code. The anonymous app does not have direct read access to the private source tables.
- The existing Inspection Checklist, ticket queue, email notification system, original troubleshooting guides and routine-care checklists were retained.

The uploaded spreadsheet is the authoritative reference for original wording. The public repository intentionally **does not** contain a raw copy with all property names and instructions; those records are stored in Supabase with staff-only editing permissions.

Remaining rollout work: identify H15/H16 clearly, check site-specific utility instructions, enter real emergency contacts, provide referenced guide videos, verify all 33 house QR labels, create the initial staff administrator (if not already done), and test the mobile site from employee phones. Maintenance email sending still requires the chosen recipient and a verified sender/provider secret.


A mobile-first maintenance and inspection handbook for staff housing. Employees access their house by scanning its QR code **without signing in**. Maintenance staff and administrators use a protected dashboard.

## Live links

- Employee app: https://condaminegolf.github.io/House-Compendium/
- Staff dashboard: https://condaminegolf.github.io/House-Compendium/staff.html
- QR label generator: https://condaminegolf.github.io/House-Compendium/qr-generator.html
- Supabase: https://supabase.com/dashboard/project/dvjczqxdwwfezjatfyoy
- Project name: **Compendium** (`dvjczqxdwwfezjatfyoy`)

## Employee experience

1. Scan a house QR code. No employee account or password.
2. Browse published troubleshooting and preventative maintenance guides. Approved photos and videos show the steps.
3. Open **Inspection Checklist** to complete the original 11 inspection items, including the weather-related lawn exemption and the two dishwasher-filter items as supplied. Choose Done / Needs attention / Not checked / Not supplied where applicable. Submit optional notes and up to three photos or videos to a private inspection record.
4. Open **Requests** for a maintenance issue. Submitting saves a private ticket against that house; staff see it in the dashboard. Photos/videos can be attached. Staff can update the ticket status.
5. The maintenance email is attempted by a server-side Supabase Edge Function. The ticket is **saved even if sending is not configured or fails**. Email status is tracked separately.

## Staff dashboard

- **Properties:** replace the 33 mapped records with real addresses, emergency contacts and equipment, then generate QR labels.
- **Guides:** edit and approve troubleshooting instructions; the six initial guides are drafts until approved.
- **Task library:** manage recurring routine-care tasks.
- **Jobs:** review maintenance requests and email notification status, including privately attached photos and videos.
- **Inspections:** view submitted checklists for all houses and identify items marked Needs attention.
- **Email alerts (administrators only):** enter the maintenance inbox that should receive new requests.

## Email provider setup — required before any real email is sent

1. Choose or create a Resend account and verify a sender domain. See https://supabase.com/docs/guides/functions/examples/send-emails .
2. In Compendium Supabase Dashboard > **Edge Function Secrets**, set:
   - `RESEND_API_KEY` — the provider API key (secret).
   - `PC_EMAIL_FROM` — a sender mailbox on the verified domain, e.g. `maintenance@your-domain.example`.
3. Sign in as an **administrator** at `staff.html`, open **Email alerts**, and enter the intended destination email address. It is stored in the protected `pc_notification_settings` table.
4. Submit a **non-urgent** test request through a real house QR link. Confirm the ticket reaches **Jobs**, the notification state becomes `sent`, and the inbox receives it. A provider-accepted message is not proof of inbox delivery. Pending/failed emails do not erase tickets.
5. Never put API keys, service-role tokens or personal information into this public GitHub repository.

### Staff access

Employee accounts are never required. Staff need email/password Auth users and explicit roles in `pc_staff_roles`. If there is no administrator account yet, create a staff Auth user and assign their user ID the `administrator` role via Supabase SQL Editor.

## Privacy, security and rollout status

- QR links identify a home but do not authorise staff access. Anyone who obtains a QR URL can view published house guidance; avoid placing personal details there.
- Maintenance tickets, inspection reports and uploaded evidence remain private to authorised maintenance staff.
- Inspection answers are stored in Compendium. Routine-care ticks currently remain local to the employee device.
- Before distributing QR labels: replace addresses, approve safety-reviewed guides, add emergency phone contacts, configure stronger anti-spam protection, and test with two phones.
- No ChatGPT conversational assistant, AI translation of safety instructions, or automatic email sending is possible until the relevant server credentials/services have been configured and tested.
- A maintenance ticket is **not** an emergency notification. For urgent hazards telephone maintenance; for immediate danger call 000.

## Files

- `index.html`, `resident.js`, `resident.css` — QR employee app.
- `staff.html`, `app.js`, `style.css` — protected staff app.
- `config.js` — browser-safe Supabase URL and publishable key only.
- `qr-generator.html` — QR labels.
- Supabase database migrations and the Edge Function are installed in the live Compendium project. Keep migration backups in version control.
