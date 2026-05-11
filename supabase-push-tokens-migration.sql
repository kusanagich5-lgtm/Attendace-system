-- ─────────────────────────────────────────────────────────────────────────────
-- Run this SQL in your Supabase Dashboard → SQL Editor
-- Creates the push_tokens table to store FCM device tokens per person
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists push_tokens (
  person_id   integer primary key references people(id) on delete cascade,
  token       text not null,
  role        text,
  updated_at  timestamptz default now()
);

-- Allow the app (anon key) to insert/update/delete its own token
alter table push_tokens enable row level security;

create policy "Anyone can upsert push tokens"
  on push_tokens for all
  using (true)
  with check (true);
