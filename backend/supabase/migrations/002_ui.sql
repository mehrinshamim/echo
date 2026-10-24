-- 002: align the schema with the UI flow doc (logs, chats, styles/pieces, drafts).
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe on the current database: the writing-studio tables are still empty, so they are recreated.

-- Logs (table name stays "entries") ----------------------------------------------

alter table entries
  add column duration_s int,
  add column source text not null default 'voice' check (source in ('voice', 'typed', 'mixed'));

-- Themes: embedding of "name: description", used to reuse near-duplicate themes
alter table themes add column embedding vector(768);

-- Reports: hash of the theme's log ids; a different hash means the report is stale
alter table theme_reports add column source_hash text;

-- Theme list with counts and date range, in one query
create or replace function theme_stats()
returns table (id uuid, name text, description text, log_count bigint, first_log_at timestamptz, last_log_at timestamptz)
language sql stable security invoker
as $$
  select t.id, t.name, t.description, count(e.id), min(e.created_at), max(e.created_at)
  from themes t
  left join entry_themes et on et.theme_id = t.id
  left join entries e on e.id = et.entry_id
  group by t.id
  order by max(e.created_at) desc nulls last;
$$;
grant execute on function theme_stats to authenticated;

-- Chats -------------------------------------------------------------------------

create table chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text,
  theme_ids uuid[] not null default '{}',   -- context chips chosen in the composer
  log_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  chat_id uuid not null references chats on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  text text not null,
  citations jsonb not null default '[]',    -- [{n, log_id, title, date}]
  created_at timestamptz not null default now()
);

-- Writing studio (recreated) ----------------------------------------------------

drop table if exists draft_suggestions, draft_versions, drafts, style_profiles, style_samples, author_profile cascade;

create table styles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  traits jsonb not null default '[]',       -- 3 short lines shown on the style card
  sample text,                              -- one "sounds like" line
  where_used text,                          -- e.g. "mostly LinkedIn"
  profile jsonb not null default '{}',      -- full voice profile used for drafting
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table pieces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  style_id uuid references styles on delete set null,   -- null = uploaded, not analyzed yet
  title text,
  text text not null,
  source text not null default 'pasted' check (source in ('pasted', 'file', 'link', 'published')),
  source_label text,                        -- e.g. "Pasted", "LinkedIn · published 14 Oct"
  word_count int not null default 0,
  created_at timestamptz not null default now()
);

create table drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null default 'linkedin' check (kind in ('linkedin', 'blog', 'story')),
  title text,
  text text not null default '',
  prompt text,                              -- what the user asked for
  style_id uuid references styles on delete set null,
  source_log_ids uuid[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'saved', 'published')),
  version int not null default 1,
  platform text,                            -- where it was published
  url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  saved_at timestamptz,
  published_at timestamptz
);

create table draft_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  draft_id uuid not null references drafts on delete cascade,
  n int not null,
  text text not null,
  author text not null check (author in ('ai', 'user')),
  instruction text,                         -- the revision asked for, when author = 'ai'
  created_at timestamptz not null default now(),
  unique (draft_id, n)
);

create index chat_messages_chat on chat_messages (chat_id, created_at);
create index pieces_style on pieces (style_id);
create index drafts_user_status on drafts (user_id, status, updated_at desc);

do $$
declare t text;
begin
  foreach t in array array['chats', 'chat_messages', 'styles', 'pieces', 'drafts', 'draft_versions'] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "own rows" on %I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;
