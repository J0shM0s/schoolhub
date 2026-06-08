alter table public.user_settings
  add column if not exists language text not null default 'de',
  add column if not exists google_selected_calendar_ids jsonb,
  add column if not exists google_selected_tasklist_ids jsonb,
  add column if not exists google_imported_source_map jsonb not null default '{}'::jsonb;

alter table public.user_settings
  drop constraint if exists user_settings_language_check;

alter table public.user_settings
  add constraint user_settings_language_check
  check (language in ('de', 'en'));
