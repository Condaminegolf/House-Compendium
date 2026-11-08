-- Property Care: the Inspection Checklist and maintenance email outbox.
-- Run ONLY after the base pc_* schema has been installed.
-- Already applied to the live Compendium project in November 2026.
create table if not exists public.pc_inspection_items (
 code text primary key check (code ~ '^I[0-9]{2}$'),
 position integer not null unique, title text not null,
 hint text not null default '', if_supplied boolean not null default false,
 active boolean not null default true
);
create table if not exists public.pc_inspections (
 id uuid primary key default gen_random_uuid(),
 property_id text not null references public.pc_properties(id) on delete restrict,
 answers jsonb not null default '[]'::jsonb
   check (jsonb_typeof(answers)='array' and jsonb_array_length(answers)<=30),
 notes text not null default '' check(length(notes)<=2000),
 inspector_name text not null default '' check(length(inspector_name)<=100),
 submitted_language text not null default 'en',
 anonymous_receipt_hash text not null,
 created_at timestamptz not null default now()
);
create index if not exists pc_inspections_property_created_idx on public.pc_inspections(property_id,created_at desc);
alter table public.pc_inspection_items enable row level security;
alter table public.pc_inspections enable row level security;
revoke all on public.pc_inspection_items, public.pc_inspections from anon;
grant select,insert,update on public.pc_inspection_items to authenticated;
grant select on public.pc_inspections to authenticated;
drop policy if exists pc_inspection_items_staff_read on public.pc_inspection_items;
create policy pc_inspection_items_staff_read on public.pc_inspection_items for select to authenticated using(public.pc_is_staff());
drop policy if exists pc_inspection_items_staff_create on public.pc_inspection_items;
create policy pc_inspection_items_staff_create on public.pc_inspection_items for insert to authenticated with check(public.pc_is_staff(array['administrator']));
drop policy if exists pc_inspection_items_staff_edit on public.pc_inspection_items;
create policy pc_inspection_items_staff_edit on public.pc_inspection_items for update to authenticated using(public.pc_is_staff(array['administrator'])) with check(public.pc_is_staff(array['administrator']));
drop policy if exists pc_inspections_staff_read on public.pc_inspections;
create policy pc_inspections_staff_read on public.pc_inspections for select to authenticated using(public.pc_is_staff(array['administrator','technician']));
insert into public.pc_inspection_items (code,position,title,hint,if_supplied) values
('I01',1,'Air conditioner filters cleaned','Follow the approved cleaning instructions.',false),
('I02',2,'Oven, microwave and cooktop cleaned','Clean appliances once switched off and cool.',false),
('I03',3,'Dishwasher filter cleaned','Follow the manufacturer instructions.',false),
('I04',4,'Washing machine and filters cleaned','Follow the manufacturer instructions.',false),
('I05',5,'Dryer filter cleaned','If supplied.',true),
('I06',6,'Dishwasher filter cleaned (if supplied)','Repeated on the original inspection list.',true),
('I07',7,'Surfaces cleaned and cupboards wiped','',false),
('I08',8,'Bathrooms free of mould, screens cleaned and toilet clean','Report significant mould or leaks.',false),
('I09',9,'Floors clean and mopped','',false),
('I10',10,'Lawn mowed','Exception during severe wet weather when mowing is unsafe.',false),
('I11',11,'Property generally tidy','',false)
on conflict (code) do nothing;
alter table public.pc_media drop constraint if exists pc_media_kind_check;
alter table public.pc_media add constraint pc_media_kind_check check(kind=any(array['property','equipment','guide','routine','ticket','inspection']));
alter table public.pc_media drop constraint if exists pc_media_inspection_not_public;
alter table public.pc_media add constraint pc_media_inspection_not_public check(kind <> 'inspection' or is_public=false);
create table if not exists public.pc_ticket_notifications (
 ticket_id uuid primary key references public.pc_tickets(id) on delete cascade,
 state text not null default 'pending' check(state in ('pending','sent','failed')),
 attempts integer not null default 0 check(attempts>=0),
 last_error text not null default '',
 provider_message_id text,
 sent_at timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.pc_ticket_notifications enable row level security;
revoke all on public.pc_ticket_notifications from anon;
grant select on public.pc_ticket_notifications to authenticated;
drop policy if exists pc_notification_staff_read on public.pc_ticket_notifications;
create policy pc_notification_staff_read on public.pc_ticket_notifications for select to authenticated using(public.pc_is_staff(array['administrator','technician']));
create schema if not exists pc_private;
revoke all on schema pc_private from public;
create or replace function pc_private.pc_enqueue_ticket_notification()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 insert into public.pc_ticket_notifications(ticket_id,state)
 values (new.id,'pending') on conflict(ticket_id) do nothing;
 return new;
end;
$$;
revoke all on function pc_private.pc_enqueue_ticket_notification() from public;
drop trigger if exists pc_enqueue_ticket_notification on public.pc_tickets;
create trigger pc_enqueue_ticket_notification after insert on public.pc_tickets
for each row execute function pc_private.pc_enqueue_ticket_notification();
insert into public.pc_ticket_notifications(ticket_id,state)
select id,'pending' from public.pc_tickets on conflict do nothing;
create table if not exists public.pc_notification_settings(
 id smallint primary key check(id=1),
 recipient_email text not null default '' check(length(recipient_email)<=254),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id)
);
insert into public.pc_notification_settings(id,recipient_email) values(1,'') on conflict do nothing;
alter table public.pc_notification_settings enable row level security;
revoke all on public.pc_notification_settings from anon;
grant select,update on public.pc_notification_settings to authenticated;
drop policy if exists pc_email_settings_admin_read on public.pc_notification_settings;
create policy pc_email_settings_admin_read on public.pc_notification_settings for select to authenticated using(public.pc_is_staff(array['administrator']));
drop policy if exists pc_email_settings_admin_update on public.pc_notification_settings;
create policy pc_email_settings_admin_update on public.pc_notification_settings for update to authenticated using(public.pc_is_staff(array['administrator'])) with check(public.pc_is_staff(array['administrator']));
