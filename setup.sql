-- ================================================
-- Strictly Business — Supabase Setup
-- Run this in your Supabase SQL Editor
-- ================================================

create table if not exists recommendations (
  id          bigserial primary key,
  name        text not null,
  service     text not null,
  category    text,
  contact     text,
  notes       text,
  date_added  date default current_date,
  created_at  timestamptz default now()
);

-- Enable Row Level Security
alter table recommendations enable row level security;

-- Public read
create policy "Public read"
  on recommendations for select
  using (true);

-- Public insert (no login required)
create policy "Public insert"
  on recommendations for insert
  with check (true);

-- Full-text search index
create index if not exists recommendations_fts_idx
  on recommendations
  using gin(
    to_tsvector('english',
      coalesce(name,'') || ' ' ||
      coalesce(service,'') || ' ' ||
      coalesce(category,'') || ' ' ||
      coalesce(notes,'')
    )
  );

-- Category index for filtering
create index if not exists recommendations_category_idx
  on recommendations (category);

-- Date index for sorting/filtering
create index if not exists recommendations_date_idx
  on recommendations (date_added desc);
