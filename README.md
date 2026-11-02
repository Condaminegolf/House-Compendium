# Property Care V2 — Housing and Yard Maintenance Compendium

This is a **mobile-first, single-file interactive prototype** for roughly 30 staff houses. It adds a property register, house equipment inventory, an editable troubleshooting knowledge library, preventative maintenance content, and **photo/video upload support throughout**.

> **This is not a live shared app.** The demonstration stores records locally in the current browser. Media files are saved to that browser's IndexedDB, while small text records, media links, tickets and completion logs are saved to localStorage. There is **no employee authentication, central database, cross-device sharing, AI service, emergency notification, or live maintenance ticket delivery** yet. Do not use it as the operational repair reporting channel.

## How to try it

1. Open `index.html` in a modern browser, preferably over HTTPS on a test hosting site. Files opened directly may encounter browser restrictions on media persistence; this varies by browser.
2. Select `Demo House 01` and a language. This is the employee view.
3. Press the **⚙️** icon in the top-right to enter the **unsecured Staff demo** view.
4. Open **Properties → Edit** to enter the address, site, water supply, emergency contact, equipment and property-specific notes. Upload one or more photos or videos into the **House reference** or **Equipment** sections.
5. Open **Guides → Edit guide**, then attach photos/videos to an exact troubleshooting stage (such as `start` or `neighbours` of **Power is out**). Existing sample decision trees can also have their wording edited.
6. Open **Guides → Create guide** to make a new guide, add sequential safe steps and their media. Draft guides only become visible to employees after a reviewer name is entered and the publish checkbox is selected. For custom guides, changes to a step return them to draft pending review.
7. Open **Routine tasks** to attach illustrated instructions or training clips to regular tasks, or add an extra house-specific / all-house task.
8. Use the top-right role switch to return to Employee view; choose the relevant house and browse **Home, Fix a problem, Routine care, Requests**. Media appears in the corresponding house, equipment, troubleshooting and routine sections.
9. In **Requests**, photos/videos can optionally be attached as ticket evidence. Staff demo can see tickets made in the *same browser*.
10. When adding media, expand **Edit caption & transcript** to write a useful label and text instructions or video transcript. This is recommended for accessibility, search and translation.

## Included functions

- 30 sample property IDs, `H01`–`H30`, replaceable with real addresses
- Property address CSV import and export, using stable property IDs (see `houses-template.csv`)
- House-specific equipment records with make/model, position, notes, photos and videos
- Six sample guided troubleshooting trees (power, water, leaks, air conditioning, toilet, yard) with media attachable to **each step**
- New custom guides with text, scope (`All houses` or a selected house), search keywords, reviewer name, draft/published status, sequential steps and photo/video attachments
- Routine employee and technician task checklists, with optional illustrated or video instructions and new custom task creation
- House-specific employee information and visible emergency-contact phone link, when configured
- Optional photo/video evidence on local maintenance tickets
- Language selector for English, Filipino/Tagalog, Cebuano/Bisaya, Ilocano and Hiligaynon; **translations are partial or fall back to English and require formal review before use**

## Media handling in the prototype

- Supports images and videos selected with the device's file picker, including multiple files at once.
- A 100 MB **per-file cap** applies to keep the prototype manageable. Actual browser storage quotas vary by device; large files may fail, and videos that upload may not play if their codec is unsupported.
- Media blobs are stored in IndexedDB **on the uploading browser only**; captions/transcripts are stored alongside media metadata in localStorage.
- Media **cannot be transferred with CSV export**. CSV contains only property-register fields. Clearing browser data may remove media and records.
- A live build should use authenticated **private object storage**, signed short-lived media URLs, streaming/optimized video, access controls by property, backups, quotas, a retention policy and an upload progress/retry workflow. Original video quality may need compression/transcoding, particularly for mobile data connections.

## Sample data and approval

The six built-in troubleshooting flows are example content, **not approved procedures**. Uploading a video does not make its instructions safe; the responsible property manager should validate every step, including electrical hazards, pumps, machinery, gas appliances, roof access, dangerous wildlife and chemical use. Dangerous faults should display emergency contacts and stop ordinary troubleshooting.

The prototype's **Publish** checkbox is only a UI demonstration. It **does not confer verified approval or enforce staff permissions**. In production, draft/approval roles, multilingual content reviews, version history and audit logs must be server-enforced.

## Production roadmap

1. Decide the authoritative property IDs and collect the ~30 addresses, sites, supply types, equipment, maintenance phone numbers, assigned residents and routine responsibility matrix.
2. Add protected sign-in and server-authorised roles: resident, property editor/content author, approver, maintenance technician and administrator. Selecting an address must not grant access to its private records.
3. Create production database tables (`properties`, `equipment`, `users`, `memberships`, `guides`, `guide_steps`, `guide_revisions`, `guide_property_scopes`, `media_assets`, `media_links`, `routine_tasks`, `routine_completions`, `tickets`, `ticket_evidence`, `ticket_history`) and row-level security policies.
4. Add central media storage with upload authorization, MIME/size validation, per-property visibility rules, thumbnails, video transcoding and caption/transcript fields. An AI system should use **reviewed written transcripts/steps**, not assume it can automatically understand an uploaded video.
5. Add ChatGPT through a **server endpoint** that first retrieves approved, versioned house/equipment documents; show exact source/step references, stop on safety triggers, and avoid invented repair instructions.
6. Translate and have fluent employees / qualified reviewers validate guides, especially safety-critical text, into relevant language variants. Offer an English fallback and a clear way to flag unclear translations.
7. Implement central tickets, media attachments, job assignment, in-progress updates, maintenance notifications, offline caching of approved guides and queued non-emergency requests.
8. Test with employees using different iPhone/Android models and mobile data coverage. Keep a **working phone escalation** independent of the app.

## Files

- `index.html` — full interactive V2 prototype, no external libraries or build tool
- `houses-template.csv` — CSV for the thirty placeholder property IDs
- `README.md` — this guide

Avoid hosting actual tenant details or confidential photos on a public GitHub Pages repository or an unauthenticated public app.
