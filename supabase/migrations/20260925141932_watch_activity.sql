-- Personal watch history is separate from title status. Existing progress is
-- retained as an undated baseline; the migration does not invent watch dates.
alter table public.user_titles alter column watched_episodes drop not null;
alter table public.user_titles alter column watched_episodes drop default;
update public.user_titles set watched_episodes = null where watched_episodes = '[]'::jsonb;

create table if not exists public.watch_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_title_id uuid not null references public.user_titles(id) on delete cascade,
  title_id uuid not null references public.titles(id) on delete cascade,
  season_number integer,
  episode_number integer,
  media_type text not null check (media_type in ('movie','series','anime')),
  event_type text not null check (event_type in ('movie_watched','episode_watched','rewatch')),
  watched_at timestamptz not null default now(),
  runtime_minutes integer check (runtime_minutes is null or runtime_minutes >= 0),
  source text not null default 'reel' check (length(source) between 1 and 80),
  request_id uuid not null,
  request_index integer not null default 0 check (request_index >= 0),
  created_at timestamptz not null default now(),
  constraint watch_events_episode_pair check (
    (media_type = 'movie' and season_number is null and episode_number is null) or
    (media_type in ('series','anime') and season_number > 0 and episode_number > 0)
  ),
  constraint watch_events_request_key unique (user_id, request_id, request_index)
);

create index if not exists watch_events_owner_date_idx on public.watch_events (user_id, watched_at desc);
create index if not exists watch_events_owner_title_idx on public.watch_events (user_id, user_title_id, season_number, episode_number);
alter table public.watch_events enable row level security;
revoke all on table public.watch_events from anon, authenticated;
grant select, insert, update, delete on table public.watch_events to authenticated;

create policy "Users read own watch events" on public.watch_events for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users insert own watch events" on public.watch_events for insert to authenticated
  with check ((select auth.uid()) = user_id and exists (
    select 1 from public.user_titles ut where ut.id = user_title_id and ut.user_id = (select auth.uid()) and ut.title_id = watch_events.title_id
  ));
create policy "Users edit own watch events" on public.watch_events for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and exists (
    select 1 from public.user_titles ut where ut.id = user_title_id and ut.user_id = (select auth.uid()) and ut.title_id = watch_events.title_id
  ));
create policy "Users delete own watch events" on public.watch_events for delete to authenticated
  using ((select auth.uid()) = user_id);

-- A single RPC keeps event writes and episode progress in one transaction.
-- Request IDs deduplicate network retries; explicit rewatch actions may add
-- another viewing with a fresh request ID.
create or replace function public.apply_watch_action(
  p_user_title_id uuid,
  p_entries jsonb,
  p_action text,
  p_request_id uuid,
  p_watched_at timestamptz default now(),
  p_baseline jsonb default '[]'::jsonb
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner uuid := (select auth.uid());
  v_title public.user_titles%rowtype;
  v_media_type text;
  v_entry jsonb;
  v_index integer := 0;
  v_season integer;
  v_episode integer;
  v_runtime integer;
  v_key text;
  v_keys jsonb;
  v_removed uuid;
  v_count integer := 0;
begin
  if v_owner is null or p_request_id is null then raise exception 'Authentication and request ID required' using errcode='42501'; end if;
  if p_action not in ('watch','unwatch','rewatch') or jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) not between 1 and 500 then
    raise exception 'Invalid watch action' using errcode='22023';
  end if;
  select * into v_title from public.user_titles where id=p_user_title_id and user_id=v_owner for update;
  if not found then raise exception 'Title not in your library' using errcode='42501'; end if;
  select media_type into v_media_type from public.titles where id=v_title.title_id;
  if v_media_type not in ('movie','series','anime') then raise exception 'Only watched media can create watch events' using errcode='22023'; end if;
  v_keys := coalesce(v_title.watched_episodes,case when jsonb_typeof(p_baseline)='array' then p_baseline else '[]'::jsonb end);

  for v_entry in select value from jsonb_array_elements(p_entries) loop
    v_season := nullif(v_entry->>'season','')::integer;
    v_episode := nullif(v_entry->>'number','')::integer;
    v_runtime := nullif(v_entry->>'runtime','')::integer;
    if (v_media_type='movie' and (v_season is not null or v_episode is not null)) or
       (v_media_type<>'movie' and (coalesce(v_season,0)<1 or coalesce(v_episode,0)<1)) or
       coalesce(v_runtime,0)<0 then raise exception 'Invalid episode or runtime' using errcode='22023'; end if;
    v_key := v_season::text || ':' || v_episode::text;
    if p_action='unwatch' then
      select id into v_removed from public.watch_events
       where user_id=v_owner and user_title_id=p_user_title_id
         and season_number is not distinct from v_season and episode_number is not distinct from v_episode
       order by watched_at desc, created_at desc limit 1;
      if v_removed is not null then
        delete from public.watch_events where id=v_removed and user_id=v_owner;
        v_count := v_count+1;
      end if;
      if v_media_type<>'movie' and not exists (
        select 1 from public.watch_events where user_id=v_owner and user_title_id=p_user_title_id
          and season_number=v_season and episode_number=v_episode
      ) then
        v_keys := v_keys - v_key;
      end if;
      v_removed := null;
    else
      if p_action='rewatch' or not exists (
        select 1 from public.watch_events where user_id=v_owner and user_title_id=p_user_title_id
          and season_number is not distinct from v_season and episode_number is not distinct from v_episode
      ) then
        insert into public.watch_events(user_id,user_title_id,title_id,season_number,episode_number,media_type,event_type,watched_at,runtime_minutes,request_id,request_index)
        values(v_owner,p_user_title_id,v_title.title_id,v_season,v_episode,v_media_type,
          case when p_action='rewatch' then 'rewatch' when v_media_type='movie' then 'movie_watched' else 'episode_watched' end,
          coalesce(p_watched_at,now()),v_runtime,p_request_id,v_index)
        on conflict(user_id,request_id,request_index) do nothing;
        v_count := v_count+1;
      end if;
      if v_media_type<>'movie' and not v_keys ? v_key then v_keys:=v_keys || to_jsonb(v_key); end if;
    end if;
    v_index := v_index+1;
  end loop;

  update public.user_titles set watched_episodes=v_keys,
    status=case when v_media_type='movie' then
      case when exists(select 1 from public.watch_events where user_id=v_owner and user_title_id=p_user_title_id) then 'done' else 'want' end
      when p_action='unwatch' and status='done' then 'going'
      when p_action<>'unwatch' and status in ('want','suggested','paused','waiting') then 'going'
      else status end,
    last_interaction_at=now(),updated_at=now()
   where id=p_user_title_id and user_id=v_owner;
  return v_count;
end;
$$;
revoke execute on function public.apply_watch_action(uuid,jsonb,text,uuid,timestamptz,jsonb) from public, anon;
grant execute on function public.apply_watch_action(uuid,jsonb,text,uuid,timestamptz,jsonb) to authenticated;
