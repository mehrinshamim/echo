-- Echo database schema. Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Every table has user_id (filled from the logged-in user) and RLS so users only see their own rows.
-- Then run every file in supabase/migrations/ in order (002_ui.sql, ...).

create extension if not exists vector;

-- Journal ------------------------------------------------------------------

create table entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  transcript text not null,                 -- raw text from the phone (audio is never stored)
  title text,
  summary text,
  insights jsonb not null default '[]',
  stance text,                              -- the user's position/feeling in this entry, for evolution reports
  embedding vector(768),                    -- embedding of the summary: finds similar entries (echoes)
  created_at timestamptz not null default now()
);

create table chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  entry_id uuid not null references entries on delete cascade,
  content text not null,
  embedding vector(768) not null            -- embedding of this transcript piece: used by /ask
);

create table themes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  last_entry_at timestamptz
);
create unique index themes_user_name on themes (user_id, lower(name));

create table entry_themes (
  entry_id uuid not null references entries on delete cascade,
  theme_id uuid not null references themes on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  confidence real,
  primary key (entry_id, theme_id)
);

create table theme_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  theme_id uuid not null unique references themes on delete cascade,
  report jsonb not null,
  entry_count int not null,                 -- stale when the theme's entry count differs
  created_at timestamptz not null default now()
);

-- Writing studio -------------------------------------------------------------

create table author_profile (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  about jsonb not null default '{}',        -- role, audience, topics, point of view, off-limits
  updated_at timestamptz not null default now()
);

create table style_samples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  text text not null,
  category text not null,                   -- linkedin_post | blog | story | formal_report | caption | other:<label>
  source text not null default 'upload' check (source in ('upload', 'published')),
  stats jsonb not null default '{}',        -- computed in Python (textstats.py)
  created_at timestamptz not null default now()
);

create table style_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  category text not null,
  profile jsonb not null,
  sample_count int not null,
  stale boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, category)
);

create table drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text,
  category text not null,
  source_entry_ids uuid[] not null default '{}',
  theme_id uuid references themes on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  current_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table draft_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  draft_id uuid not null references drafts on delete cascade,
  n int not null,
  content text not null,                    -- markdown
  author text not null check (author in ('ai', 'user')),
  instruction text,                         -- what the user asked for, when author = 'ai'
  created_at timestamptz not null default now(),
  unique (draft_id, n)
);

create table draft_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  draft_id uuid not null references drafts on delete cascade,
  version_n int not null,
  quote text not null,
  replacement text not null,
  reason text,
  status text not null default 'open' check (status in ('open', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);

-- Indexes ------------------------------------------------------------------

create index entries_user_date on entries (user_id, created_at desc);
create index chunks_entry on chunks (entry_id);
create index entry_themes_theme on entry_themes (theme_id);
create index entries_embedding on entries using hnsw (embedding vector_cosine_ops);
create index chunks_embedding on chunks using hnsw (embedding vector_cosine_ops);

-- Row level security: each user reads and writes only their own rows -------

do $$
declare t text;
begin
  foreach t in array array[
    'entries', 'chunks', 'themes', 'entry_themes', 'theme_reports', 'author_profile',
    'style_samples', 'style_profiles', 'drafts', 'draft_versions', 'draft_suggestions'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "own rows" on %I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;

-- Vector search (security invoker = runs as the caller, so RLS still applies) --

create or replace function match_chunks(
  query_embedding vector(768),
  match_count int default 8,
  filter_theme_id uuid default null,
  from_date timestamptz default null,
  to_date timestamptz default null
)
returns table (chunk_id uuid, entry_id uuid, content text, title text, created_at timestamptz, similarity float)
language sql stable security invoker
as $$
  select c.id, c.entry_id, c.content, e.title, e.created_at, 1 - (c.embedding <=> query_embedding)
  from chunks c
  join entries e on e.id = c.entry_id
  where (from_date is null or e.created_at >= from_date)
    and (to_date is null or e.created_at <= to_date)
    and (filter_theme_id is null or exists (
      select 1 from entry_themes et where et.entry_id = e.id and et.theme_id = filter_theme_id))
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function match_entries(
  query_embedding vector(768),
  match_count int default 3,
  exclude_id uuid default null
)
returns table (id uuid, title text, summary text, created_at timestamptz, similarity float)
language sql stable security invoker
as $$
  select e.id, e.title, e.summary, e.created_at, 1 - (e.embedding <=> query_embedding)
  from entries e
  where e.embedding is not null
    and (exclude_id is null or e.id <> exclude_id)
  order by e.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function match_chunks, match_entries to authenticated;
