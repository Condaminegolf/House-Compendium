-- Compendium workbook knowledge library (schema only).
-- This structure is already installed in Supabase project dvjczqxdwwfezjatfyoy.
-- The uploaded xlsx rows and house mapping were imported separately using staff-supervised data migration.
CREATE TABLE IF NOT EXISTS public.pc_compendium_entries(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 section text NOT NULL CHECK(section IN ('regular_care','troubleshooting')),
 category text NOT NULL DEFAULT '',
 title text NOT NULL,
 body text NOT NULL,
 source_sheet text NOT NULL,
 source_row integer NOT NULL CHECK(source_row>=1),
 sort_order integer NOT NULL,
 review_status text NOT NULL DEFAULT 'draft' CHECK(review_status IN ('draft','published')),
 review_note text NOT NULL DEFAULT '',
 source_kind text NOT NULL DEFAULT 'accommodation_compendium_2026_11',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 approved_at timestamptz,
 approved_by uuid REFERENCES auth.users(id),
 original_body text,
 UNIQUE(source_kind,source_sheet,source_row)
);
CREATE INDEX IF NOT EXISTS pc_compendium_section_status
ON public.pc_compendium_entries(section,review_status,sort_order);
CREATE TABLE IF NOT EXISTS public.pc_compendium_assignments(
 entry_id uuid NOT NULL REFERENCES public.pc_compendium_entries(id) ON DELETE CASCADE,
 property_id text NOT NULL REFERENCES public.pc_properties(id) ON DELETE CASCADE,
 source_column integer NOT NULL CHECK(source_column BETWEEN 2 AND 1024),
 PRIMARY KEY(entry_id,property_id)
);
CREATE INDEX IF NOT EXISTS pc_compendium_assignments_property
ON public.pc_compendium_assignments(property_id);
CREATE TABLE IF NOT EXISTS public.pc_compendium_property_sources(
 property_id text PRIMARY KEY REFERENCES public.pc_properties(id) ON DELETE CASCADE,
 source_column integer NOT NULL UNIQUE CHECK(source_column BETWEEN 2 AND 1024),
 source_label text NOT NULL,
 needs_disambiguation boolean NOT NULL DEFAULT false,
 imported_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pc_compendium_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pc_compendium_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pc_compendium_property_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pc_compendium_entries,public.pc_compendium_assignments,public.pc_compendium_property_sources FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.pc_compendium_entries,public.pc_compendium_assignments,public.pc_compendium_property_sources TO authenticated;
DROP POLICY IF EXISTS pc_compendium_entries_staff_read ON public.pc_compendium_entries;
CREATE POLICY pc_compendium_entries_staff_read ON public.pc_compendium_entries FOR SELECT TO authenticated USING(public.pc_is_staff());
DROP POLICY IF EXISTS pc_compendium_entries_staff_insert ON public.pc_compendium_entries;
CREATE POLICY pc_compendium_entries_staff_insert ON public.pc_compendium_entries FOR INSERT TO authenticated
 WITH CHECK(public.pc_is_staff(ARRAY['administrator','editor']) AND (review_status='draft' OR public.pc_is_staff(ARRAY['administrator'])));
DROP POLICY IF EXISTS pc_compendium_entries_staff_update ON public.pc_compendium_entries;
CREATE POLICY pc_compendium_entries_staff_update ON public.pc_compendium_entries FOR UPDATE TO authenticated
 USING(public.pc_is_staff(ARRAY['administrator']) OR (public.pc_is_staff(ARRAY['editor']) AND review_status='draft'))
 WITH CHECK(public.pc_is_staff(ARRAY['administrator']) OR (public.pc_is_staff(ARRAY['editor']) AND review_status='draft'));
DROP POLICY IF EXISTS pc_compendium_assignments_staff_read ON public.pc_compendium_assignments;
CREATE POLICY pc_compendium_assignments_staff_read ON public.pc_compendium_assignments FOR SELECT TO authenticated USING(public.pc_is_staff());
DROP POLICY IF EXISTS pc_compendium_assignments_admin_insert ON public.pc_compendium_assignments;
CREATE POLICY pc_compendium_assignments_admin_insert ON public.pc_compendium_assignments FOR INSERT TO authenticated WITH CHECK(public.pc_is_staff(ARRAY['administrator']));
DROP POLICY IF EXISTS pc_compendium_assignments_admin_delete ON public.pc_compendium_assignments;
CREATE POLICY pc_compendium_assignments_admin_delete ON public.pc_compendium_assignments FOR DELETE TO authenticated USING(public.pc_is_staff(ARRAY['administrator']));
DROP POLICY IF EXISTS pc_compendium_property_sources_read ON public.pc_compendium_property_sources;
CREATE POLICY pc_compendium_property_sources_read ON public.pc_compendium_property_sources FOR SELECT TO authenticated USING(public.pc_is_staff());
DROP POLICY IF EXISTS pc_compendium_property_sources_admin_insert ON public.pc_compendium_property_sources;
CREATE POLICY pc_compendium_property_sources_admin_insert ON public.pc_compendium_property_sources FOR INSERT TO authenticated WITH CHECK(public.pc_is_staff(ARRAY['administrator']));
DROP POLICY IF EXISTS pc_compendium_property_sources_admin_update ON public.pc_compendium_property_sources;
CREATE POLICY pc_compendium_property_sources_admin_update ON public.pc_compendium_property_sources FOR UPDATE TO authenticated
 USING(public.pc_is_staff(ARRAY['administrator'])) WITH CHECK(public.pc_is_staff(ARRAY['administrator']));
ALTER TABLE public.pc_media DROP CONSTRAINT IF EXISTS pc_media_kind_check;
ALTER TABLE public.pc_media ADD CONSTRAINT pc_media_kind_check
 CHECK(kind=ANY(ARRAY['property','equipment','guide','routine','ticket','inspection','knowledge']));
DROP POLICY IF EXISTS pc_media_knowledge_insert ON public.pc_media;
CREATE POLICY pc_media_knowledge_insert ON public.pc_media FOR INSERT TO authenticated
 WITH CHECK(kind='knowledge' AND created_by=(SELECT auth.uid()) AND public.pc_is_staff(ARRAY['administrator','editor'])
 AND EXISTS(SELECT 1 FROM public.pc_compendium_entries e WHERE e.id::text=entity_id
  AND (e.review_status='draft' OR public.pc_is_staff(ARRAY['administrator']))));
