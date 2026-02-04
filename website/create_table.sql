-- Create table for storing AI-generated HTML templates per category
create table public.category_templates (
  category text not null primary key, -- "Plumber", "Dentist", etc.
  html_content text not null,         -- The raw HTML string from Gemini
  css_theme jsonb,                    -- Optional: extracted colors or theme data
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) is good practice, 
-- but for this demo ensuring public read/write or anon key access is key.
alter table public.category_templates enable row level security;

-- Policy: Allow anyone (anon) to read templates (for loading sites)
create policy "Allow public read access"
  on public.category_templates
  for select
  to anon
  using (true);

-- Policy: Allow anyone (anon) to insert templates (for the generator function)
create policy "Allow public insert access"
  on public.category_templates
  for insert
  to anon
  with check (true);
