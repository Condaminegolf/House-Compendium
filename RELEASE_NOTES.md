# Compendium Streamlined Release — 9 November 2026

**No GitHub writes were performed.** This package is for manual root-folder upload.

## Employee changes
- Primary actions: **Something Wrong** and **Inspection Checklist**.
- House-level pending maintenance requests directly below the primary actions.
- Secondary shortcuts: Regular Care and Maintenance Requests.
- House equipment and utility details collapsed into an expandable panel.
- **Change house** preserved, returning to the 33-house search.
- Instruction translation via a cached Supabase Edge Function for Filipino, Cebuano, Ilocano and Hiligaynon. The English source remains available and automated translation requires an API credential.
- Explicit maintenance request input-language choice. Staff records are saved in English where translation has succeeded. Untranslated foreign-language submissions are blocked if their language is correctly selected.

## Staff changes
- Four primary navigation tabs, with management modules grouped under **Manage**.
- Maintenance filters for Open / Waiting on parts / Completed / All.
- Completion action prompts for a short resolution note, records completion time, and logs status changes.
- Inspection reports with items needing attention can create a linked maintenance job (one linked job per inspection).
- A **Send test email** action is available in Manage → Email.

## Live backend changes already applied
- `pc_tickets.resolved_at`, `resolved_by_label`, `source_inspection_id`, `translated_to_english`.
- `pc_ticket_status_history` with access restricted to the private backend.
- `pc_translation_cache` and `pc_translation_usage` with row-level security.
- `pc-public` version 11: English-normalised submissions, translation of displayed guidance, quota/cache controls.
- `pc-staff` version 7: completion history, inspection follow-ups, email test.

## Remaining prerequisites
- **`OPENAI_API_KEY`** in Compendium's Supabase Edge Function Secrets for full translated instructions and non-English free-text submissions.
- **`RESEND_API_KEY`** and **`PC_EMAIL_FROM`** for maintenance emails to `accommodation@arubial.au`.
- Review translations of safety-critical procedures before relying on them for machinery, electrical, hot-water, or septic issues.
- Final live phone verification after upload.

**Never commit secrets or private staff access URLs to a public repository.**
