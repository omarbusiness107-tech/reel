-- Reel account ownership model.
-- Shared provider/catalog facts live in titles. Private state lives in user_titles.

create table if not exists public.titles (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_id text not null,
  media_type text not null check (media_type in ('movie','series','anime','manga','manhwa','book')),
  title text not null check (length(btrim(title)) > 0),
  normalized_title text not null,
  release_year integer check (release_year is null or release_year between 1000 and 3000),
  poster_url text,
  backdrop_url text,
  description text,
  creator text,
  genres jsonb not null default '[]'::jsonb check (jsonb_typeof(genres) = 'array'),
  runtime_minutes integer check (runtime_minutes is null or runtime_minutes >= 0),
  page_count integer check (page_count is null or page_count >= 0),
  public_rating numeric(4,2) check (public_rating is null or public_rating between 0 and 10),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint titles_provider_identity_key unique (provider, provider_id)
);

create index if not exists titles_normalized_title_idx on public.titles (normalized_title);
create index if not exists titles_media_type_year_idx on public.titles (media_type, release_year);

create table if not exists public.user_titles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title_id uuid not null references public.titles(id) on delete restrict,
  status text not null default 'want' check (status in ('want','suggested','going','done','paused','dropped','waiting')),
  rating numeric(3,1) not null default 0 check (rating between 0 and 10),
  favorite boolean not null default false,
  current_season integer not null default 1 check (current_season >= 0),
  current_episode integer not null default 0 check (current_episode >= 0),
  current_page integer not null default 0 check (current_page >= 0),
  current_chapter integer not null default 0 check (current_chapter >= 0),
  stopped_at_sec integer not null default 0 check (stopped_at_sec >= 0),
  watched_episodes jsonb not null default '[]'::jsonb check (jsonb_typeof(watched_episodes) = 'array'),
  notes text not null default '',
  tags jsonb not null default '[]'::jsonb check (jsonb_typeof(tags) = 'array'),
  started_at timestamptz,
  completed_at timestamptz,
  last_interaction_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_titles_user_title_key unique (user_id, title_id)
);

create index if not exists user_titles_user_updated_idx on public.user_titles (user_id, updated_at desc);
create index if not exists user_titles_user_status_idx on public.user_titles (user_id, status);
create index if not exists user_titles_title_idx on public.user_titles (title_id);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  recommendation_feedback jsonb not null default '{}'::jsonb check (jsonb_typeof(recommendation_feedback) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.titles enable row level security;
alter table public.user_titles enable row level security;
alter table public.user_preferences enable row level security;

revoke all on table public.titles from anon, authenticated;
revoke all on table public.user_titles from anon, authenticated;
revoke all on table public.user_preferences from anon, authenticated;
grant select on table public.titles to anon, authenticated;
grant select, insert, update, delete on table public.user_titles to authenticated;
grant select, insert, update, delete on table public.user_preferences to authenticated;

drop policy if exists "Public catalog is readable" on public.titles;
create policy "Public catalog is readable"
  on public.titles for select
  to anon, authenticated
  using (true);

drop policy if exists "Users select own library" on public.user_titles;
create policy "Users select own library"
  on public.user_titles for select
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users insert own library" on public.user_titles;
create policy "Users insert own library"
  on public.user_titles for insert
  to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users update own library" on public.user_titles;
create policy "Users update own library"
  on public.user_titles for update
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users delete own library" on public.user_titles;
create policy "Users delete own library"
  on public.user_titles for delete
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users select own preferences" on public.user_preferences;
create policy "Users select own preferences"
  on public.user_preferences for select
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users insert own preferences" on public.user_preferences;
create policy "Users insert own preferences"
  on public.user_preferences for insert
  to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users update own preferences" on public.user_preferences;
create policy "Users update own preferences"
  on public.user_preferences for update
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users delete own preferences" on public.user_preferences;
create policy "Users delete own preferences"
  on public.user_preferences for delete
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

-- The client sends title facts plus personal state, never a user id. This function
-- needs definer rights only to upsert the shared catalog; every private write is
-- explicitly pinned to auth.uid(). Existing catalog facts win over client values.
create or replace function public.sync_my_library(
  p_entries jsonb,
  p_preferences jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_entry jsonb;
  v_title_id uuid;
  v_user_title_id uuid;
  v_seen uuid[] := '{}'::uuid[];
  v_provider text;
  v_provider_id text;
  v_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(p_entries, '[]'::jsonb)) <> 'array' then
    raise exception 'p_entries must be an array' using errcode = '22023';
  end if;
  if jsonb_array_length(coalesce(p_entries, '[]'::jsonb)) > 5000 then
    raise exception 'Library limit exceeded' using errcode = '22023';
  end if;

  for v_entry in select value from jsonb_array_elements(coalesce(p_entries, '[]'::jsonb))
  loop
    if length(btrim(coalesce(v_entry->>'title',''))) = 0 then
      continue;
    end if;
    v_provider := lower(coalesce(nullif(v_entry->>'provider',''), 'reel'));
    v_provider_id := coalesce(nullif(v_entry->>'providerId',''), md5(
      lower(coalesce(v_entry->>'mediaType','movie')) || '|' ||
      lower(btrim(v_entry->>'title')) || '|' || coalesce(v_entry->>'year','')
    ));

    insert into public.titles (
      provider, provider_id, media_type, title, normalized_title, release_year,
      poster_url, backdrop_url, description, creator, genres, runtime_minutes,
      page_count, public_rating, metadata, updated_at
    ) values (
      v_provider, v_provider_id,
      case when v_entry->>'mediaType' in ('movie','series','anime','manga','manhwa','book') then v_entry->>'mediaType' else 'movie' end,
      btrim(v_entry->>'title'), lower(regexp_replace(btrim(v_entry->>'title'), '[^[:alnum:]]+', ' ', 'g')),
      case when (v_entry->>'year') ~ '^[0-9]{4}$' then (v_entry->>'year')::integer else null end,
      nullif(v_entry->>'posterUrl',''), nullif(v_entry->>'backdropUrl',''), nullif(v_entry->>'description',''), nullif(v_entry->>'creator',''),
      case when jsonb_typeof(v_entry->'genres')='array' then v_entry->'genres' else '[]'::jsonb end,
      case when (v_entry->>'runtimeMinutes') ~ '^[0-9]+$' then (v_entry->>'runtimeMinutes')::integer else null end,
      case when (v_entry->>'pageCount') ~ '^[0-9]+$' then (v_entry->>'pageCount')::integer else null end,
      case when (v_entry->>'publicRating') ~ '^[0-9]+(\.[0-9]+)?$' then least(10,(v_entry->>'publicRating')::numeric) else null end,
      case when jsonb_typeof(v_entry->'metadata')='object' then v_entry->'metadata' else '{}'::jsonb end,
      now()
    )
    on conflict (provider, provider_id) do update set
      poster_url = coalesce(public.titles.poster_url, excluded.poster_url),
      backdrop_url = coalesce(public.titles.backdrop_url, excluded.backdrop_url),
      description = coalesce(public.titles.description, excluded.description),
      creator = coalesce(public.titles.creator, excluded.creator),
      genres = case when public.titles.genres = '[]'::jsonb then excluded.genres else public.titles.genres end,
      runtime_minutes = coalesce(public.titles.runtime_minutes, excluded.runtime_minutes),
      page_count = coalesce(public.titles.page_count, excluded.page_count),
      public_rating = coalesce(excluded.public_rating, public.titles.public_rating),
      metadata = excluded.metadata || public.titles.metadata,
      updated_at = now()
    returning id into v_title_id;

    insert into public.user_titles (
      user_id, title_id, status, rating, favorite, current_season, current_episode,
      current_page, current_chapter, stopped_at_sec, notes, tags, started_at,
      completed_at, last_interaction_at, created_at, updated_at
    ) values (
      v_user_id, v_title_id,
      case when v_entry->>'status' in ('want','suggested','going','done','paused','dropped','waiting') then v_entry->>'status' else 'want' end,
      least(10, greatest(0, coalesce(nullif(v_entry->>'rating','')::numeric,0))),
      coalesce((v_entry->>'favorite')::boolean,false),
      greatest(0,coalesce(nullif(v_entry->>'currentSeason','')::integer,1)),
      greatest(0,coalesce(nullif(v_entry->>'currentEpisode','')::integer,0)),
      greatest(0,coalesce(nullif(v_entry->>'currentPage','')::integer,0)),
      greatest(0,coalesce(nullif(v_entry->>'currentChapter','')::integer,0)),
      greatest(0,coalesce(nullif(v_entry->>'stoppedAtSec','')::integer,0)),
      coalesce(v_entry->>'notes',''),
      case when jsonb_typeof(v_entry->'tags')='array' then v_entry->'tags' else '[]'::jsonb end,
      nullif(v_entry->>'startedAt','')::timestamptz,
      nullif(v_entry->>'completedAt','')::timestamptz,
      coalesce(nullif(v_entry->>'lastInteractionAt','')::timestamptz,now()),
      coalesce(nullif(v_entry->>'createdAt','')::timestamptz,now()), now()
    )
    on conflict (user_id, title_id) do update set
      status=excluded.status, rating=excluded.rating, favorite=excluded.favorite,
      current_season=excluded.current_season, current_episode=excluded.current_episode,
      current_page=excluded.current_page, current_chapter=excluded.current_chapter,
      stopped_at_sec=excluded.stopped_at_sec, notes=excluded.notes, tags=excluded.tags,
      started_at=excluded.started_at, completed_at=excluded.completed_at,
      last_interaction_at=excluded.last_interaction_at, updated_at=now()
    returning id into v_user_title_id;

    v_seen := array_append(v_seen, v_user_title_id);
    v_count := v_count + 1;
  end loop;

  delete from public.user_titles
   where user_id = v_user_id
     and (coalesce(array_length(v_seen,1),0)=0 or not (id = any(v_seen)));

  insert into public.user_preferences(user_id, settings, updated_at)
  values (v_user_id, case when jsonb_typeof(coalesce(p_preferences,'{}'::jsonb))='object' then coalesce(p_preferences,'{}'::jsonb) else '{}'::jsonb end, now())
  on conflict (user_id) do update set settings=excluded.settings, updated_at=now();

  return v_count;
end;
$$;

revoke execute on function public.sync_my_library(jsonb,jsonb) from public, anon;
grant execute on function public.sync_my_library(jsonb,jsonb) to authenticated;

-- Backfill the legacy one-row-per-user JSON blobs. Each source row is migrated
-- only to that row's existing user_id. The legacy table remains intact as a
-- rollback archive and is then locked to the same owner-only policy.
do $$
declare
  v_library record;
  v_entry jsonb;
  v_title_id uuid;
  v_catalog_id text;
  v_provider text;
  v_provider_id text;
begin
  if to_regclass('public.user_libraries') is null then return; end if;

  for v_library in execute 'select user_id, state from public.user_libraries where user_id is not null'
  loop
    if jsonb_typeof(v_library.state::jsonb->'items') <> 'array' then continue; end if;
    for v_entry in select value from jsonb_array_elements(v_library.state::jsonb->'items')
    loop
      if length(btrim(coalesce(v_entry->>'title',''))) = 0 then continue; end if;
      v_catalog_id := coalesce(v_entry->>'catalogId','');
      if v_catalog_id ~* '^https?://' then
        v_provider := 'url'; v_provider_id := md5(lower(v_catalog_id));
      elsif v_catalog_id ~ '^[A-Za-z0-9_-]+:.+' then
        v_provider := lower(split_part(v_catalog_id,':',1));
        v_provider_id := substring(v_catalog_id from position(':' in v_catalog_id)+1);
      else
        v_provider := 'reel';
        v_provider_id := md5(lower(coalesce(v_entry->>'type','movie')) || '|' || lower(btrim(v_entry->>'title')) || '|' || coalesce(v_entry->>'year',''));
      end if;

      insert into public.titles(provider,provider_id,media_type,title,normalized_title,release_year,poster_url,backdrop_url,description,creator,genres,runtime_minutes,page_count,public_rating,metadata)
      values(v_provider,v_provider_id,
        case when v_entry->>'type' in ('movie','series','anime','manga','manhwa','book') then v_entry->>'type' else 'movie' end,
        btrim(v_entry->>'title'),lower(regexp_replace(btrim(v_entry->>'title'),'[^[:alnum:]]+',' ','g')),
        case when (v_entry->>'year') ~ '^[0-9]{4}$' then (v_entry->>'year')::integer else null end,
        nullif(v_entry->>'cover',''),nullif(v_entry->>'banner',''),nullif(v_entry->>'synopsis',''),nullif(v_entry->>'creator',''),
        case when jsonb_typeof(v_entry->'genres')='array' then v_entry->'genres' else '[]'::jsonb end,
        case when (v_entry->>'runtime') ~ '^[0-9]+$' then (v_entry->>'runtime')::integer else null end,
        case when (v_entry->>'pages') ~ '^[0-9]+$' then (v_entry->>'pages')::integer else null end,
        case when (v_entry->>'score') ~ '^[0-9]+(\.[0-9]+)?$' then least(10,(v_entry->>'score')::numeric) else null end,
        v_entry - array['id','status','rating','fav','season','episode','page','chapter','stoppedAtSec','notes','tags','added','updated','finished']::text[])
      on conflict(provider,provider_id) do update set metadata=excluded.metadata || public.titles.metadata
      returning id into v_title_id;

      insert into public.user_titles(user_id,title_id,status,rating,favorite,current_season,current_episode,current_page,current_chapter,stopped_at_sec,notes,tags,completed_at,last_interaction_at,created_at)
      values(v_library.user_id,v_title_id,
        case when v_entry->>'status' in ('want','suggested','going','done','paused','dropped','waiting') then v_entry->>'status' else 'want' end,
        least(10,greatest(0,coalesce(nullif(v_entry->>'rating','')::numeric,0))),coalesce((v_entry->>'fav')::boolean,false),
        greatest(0,coalesce(nullif(v_entry->>'season','')::integer,1)),greatest(0,coalesce(nullif(v_entry->>'episode','')::integer,0)),
        greatest(0,coalesce(nullif(v_entry->>'page','')::integer,0)),greatest(0,coalesce(nullif(v_entry->>'chapter','')::integer,0)),
        greatest(0,coalesce(nullif(v_entry->>'stoppedAtSec','')::integer,0)),coalesce(v_entry->>'notes',''),
        case when jsonb_typeof(v_entry->'tags')='array' then v_entry->'tags' else '[]'::jsonb end,
        case when (v_entry->>'finished') ~ '^[0-9]+$' then to_timestamp((v_entry->>'finished')::double precision/1000) else null end,
        case when (v_entry->>'updated') ~ '^[0-9]+$' then to_timestamp((v_entry->>'updated')::double precision/1000) else now() end,
        case when (v_entry->>'added') ~ '^[0-9]+$' then to_timestamp((v_entry->>'added')::double precision/1000) else now() end)
      on conflict(user_id,title_id) do nothing;
    end loop;

    insert into public.user_preferences(user_id,settings)
    values(v_library.user_id,case when jsonb_typeof(v_library.state::jsonb->'ui')='object' then v_library.state::jsonb->'ui' else '{}'::jsonb end)
    on conflict(user_id) do nothing;
  end loop;

  execute 'alter table public.user_libraries enable row level security';
  for v_library in select policyname from pg_policies where schemaname='public' and tablename='user_libraries'
  loop
    execute format('drop policy %I on public.user_libraries',v_library.policyname);
  end loop;
  execute 'revoke all on table public.user_libraries from anon, authenticated';
  execute 'grant select, insert, update, delete on table public.user_libraries to authenticated';
  execute 'create policy "Legacy libraries select own" on public.user_libraries for select to authenticated using ((select auth.uid()) is not null and (select auth.uid()) = user_id)';
  execute 'create policy "Legacy libraries insert own" on public.user_libraries for insert to authenticated with check ((select auth.uid()) is not null and (select auth.uid()) = user_id)';
  execute 'create policy "Legacy libraries update own" on public.user_libraries for update to authenticated using ((select auth.uid()) is not null and (select auth.uid()) = user_id) with check ((select auth.uid()) is not null and (select auth.uid()) = user_id)';
  execute 'create policy "Legacy libraries delete own" on public.user_libraries for delete to authenticated using ((select auth.uid()) is not null and (select auth.uid()) = user_id)';
end;
$$;
