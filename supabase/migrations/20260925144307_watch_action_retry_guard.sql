-- Keep the original transactional implementation private and wrap it with an
-- owner-scoped request ledger. Retrying the same request must never undo an
-- earlier rewatch or create another explicit rewatch event.
create schema if not exists reel_private;
grant usage on schema reel_private to authenticated;

alter function public.apply_watch_action(uuid,jsonb,text,uuid,timestamptz,jsonb) set schema reel_private;
alter function reel_private.apply_watch_action(uuid,jsonb,text,uuid,timestamptz,jsonb) rename to apply_watch_action_inner;
revoke execute on function reel_private.apply_watch_action_inner(uuid,jsonb,text,uuid,timestamptz,jsonb) from public, anon;
grant execute on function reel_private.apply_watch_action_inner(uuid,jsonb,text,uuid,timestamptz,jsonb) to authenticated;

create table reel_private.watch_action_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  result_count integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, request_id)
);
create index watch_action_requests_created_idx on reel_private.watch_action_requests (created_at);
alter table reel_private.watch_action_requests enable row level security;
revoke all on table reel_private.watch_action_requests from anon, authenticated;
grant select, insert, update on table reel_private.watch_action_requests to authenticated;
create policy "Users read own watch requests" on reel_private.watch_action_requests for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users insert own watch requests" on reel_private.watch_action_requests for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users update own watch requests" on reel_private.watch_action_requests for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create function public.apply_watch_action(
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
  v_count integer;
begin
  if v_owner is null or p_request_id is null then
    raise exception 'Authentication and request ID required' using errcode='42501';
  end if;
  insert into reel_private.watch_action_requests(user_id,request_id)
    values(v_owner,p_request_id) on conflict do nothing;
  if not found then
    select result_count into v_count from reel_private.watch_action_requests
      where user_id=v_owner and request_id=p_request_id;
    return coalesce(v_count,0);
  end if;
  v_count := reel_private.apply_watch_action_inner(
    p_user_title_id,p_entries,p_action,p_request_id,p_watched_at,p_baseline
  );
  update reel_private.watch_action_requests set result_count=v_count
    where user_id=v_owner and request_id=p_request_id;
  return v_count;
end;
$$;
revoke execute on function public.apply_watch_action(uuid,jsonb,text,uuid,timestamptz,jsonb) from public, anon;
grant execute on function public.apply_watch_action(uuid,jsonb,text,uuid,timestamptz,jsonb) to authenticated;
