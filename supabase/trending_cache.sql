-- Run in Supabase SQL editor (optional; app uses Storage bucket app-cache by default)
create table if not exists public.trending_cache (
  id text primary key default 'bookclubs',
  books jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.trending_cache enable row level security;

create policy "trending_cache_public_read"
  on public.trending_cache for select
  using (true);
