-- Create table if it doesn't exist
create table if not exists public.websites (
  id text not null primary key,
  data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.websites enable row level security;

-- Policies (Drop first to avoid errors if they exist/changed)
drop policy if exists "Allow public read access" on public.websites;
create policy "Allow public read access"
  on public.websites
  for select
  to anon
  using (true);

drop policy if exists "Allow public insert/update access" on public.websites;
create policy "Allow public insert/update access" 
  on public.websites
  for all     -- insert, update, delete
  to anon
  using (true)
  with check (true);
