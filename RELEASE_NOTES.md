# Compendium — Welcome & Local Info release

Implemented on 9 November 2026 using **Welcome info.docx**, a two-page staff accommodation information sheet.

## What's new

- A first-visit welcome banner for each house, dismissible and remembered on that device.
- A permanent **Welcome & Local Info** action on every house dashboard.
- Six easy-to-browse categories: welcome, shopping, medical, fuel, eating out, and rubbish.
- Phone calling, email, map directions, and relevant official-information links.
- Editable welcome entries under **Staff → Manage → Welcome & Local Info**: create, edit, hide or publish entries, adjust category/order and scope guidance to specific houses.
- Automatic translation support for visible welcome instructions through the app's existing server translation layer when configured.

## Content and verification

- **31** entries imported to Supabase. **30** published; the Chinchilla dentist listing is awaiting verification.
- **21** entries are marked for local rechecking, including potentially changed businesses and unverified historical contact details.
- Source originally says Condamine dump 7 am–4 pm. Current Council information says **8 am–4 pm Tue/Thu/Sat/Sun**. The corrected hours are displayed, and the source discrepancy is recorded in the staff editor.
- Medical numbers verified against current health service or clinic sites, not assumed current solely from the old letter.
- Published listings not yet verified display **Details may change**.

## Not changed

The existing 33 houses, QR codes, no-login resident experience, protected private staff link, maintenance requests, inspections, troubleshooting and Supabase data remain unchanged.

## Deployment boundaries

Supabase table and Edge Functions are already deployed. The website files have **not** been committed to GitHub. Follow `UPLOAD_INSTRUCTIONS.txt` to upload manually.
