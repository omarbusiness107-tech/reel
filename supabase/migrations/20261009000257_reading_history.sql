-- Reading progress shares the personal activity timeline; earlier chapters stay undated.
-- Migration version matches the migration applied to the linked Supabase project.
alter table public.watch_events add column if not exists chapter_number integer;
alter table public.watch_events drop constraint watch_events_media_type_check;
alter table public.watch_events add constraint watch_events_media_type_check
  check (media_type in ('movie','series','anime','manga','manhwa'));
alter table public.watch_events drop constraint watch_events_event_type_check;
alter table public.watch_events add constraint watch_events_event_type_check
  check (event_type in ('movie_watched','episode_watched','rewatch','chapter_read'));
alter table public.watch_events drop constraint watch_events_episode_pair;
alter table public.watch_events add constraint watch_events_episode_pair check (
  (media_type='movie' and season_number is null and episode_number is null and chapter_number is null) or
  (media_type in ('series','anime') and season_number is not null and season_number>0 and episode_number is not null and episode_number>0 and chapter_number is null) or
  (media_type in ('manga','manhwa') and season_number is null and episode_number is null and chapter_number is not null and chapter_number>0 and event_type='chapter_read' and runtime_minutes is null)
);

create or replace function public.record_chapter_progress(
  p_user_title_id uuid, p_chapter integer, p_request_id uuid,
  p_read_at timestamptz default now(), p_complete boolean default false
)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_owner uuid := (select auth.uid());
  v_title public.user_titles%rowtype;
  v_media text;
  v_total integer;
  v_chapter integer;
  v_status text;
  v_event public.watch_events%rowtype;
begin
  if v_owner is null or p_request_id is null then raise exception 'Authentication and request ID required' using errcode='42501'; end if;
  if p_chapter is null or p_chapter<0 or p_chapter>1000000 then raise exception 'Invalid chapter' using errcode='22023'; end if;
  select * into v_title from public.user_titles where id=p_user_title_id and user_id=v_owner for update;
  if not found then raise exception 'Title not in your library' using errcode='42501'; end if;
  select media_type, case when metadata->>'chapters' ~ '^[0-9]{1,7}$' then (metadata->>'chapters')::integer end
    into v_media,v_total from public.titles where id=v_title.title_id;
  if v_media not in ('manga','manhwa') then raise exception 'Only chapter-based titles supported' using errcode='22023'; end if;
  select * into v_event from public.watch_events where user_id=v_owner and request_id=p_request_id and user_title_id=p_user_title_id limit 1;
  if found then return jsonb_build_object('chapter',v_title.current_chapter,'status',v_title.status,'event',to_jsonb(v_event)); end if;
  v_chapter := case when coalesce(v_total,0)>0 then least(p_chapter,v_total) else p_chapter end;
  v_status := case when p_complete then 'done' when v_chapter>coalesce(v_title.current_chapter,0) and v_title.status in ('want','suggested','paused','waiting') then 'going' else v_title.status end;
  if v_chapter>coalesce(v_title.current_chapter,0) then
    insert into public.watch_events(user_id,user_title_id,title_id,media_type,event_type,chapter_number,watched_at,request_id)
      values(v_owner,p_user_title_id,v_title.title_id,v_media,'chapter_read',v_chapter,coalesce(p_read_at,now()),p_request_id)
      returning * into v_event;
  end if;
  update public.user_titles set current_chapter=v_chapter,status=v_status,
    completed_at=case when p_complete then coalesce(p_read_at,now()) else completed_at end,
    last_interaction_at=now(),updated_at=now() where id=p_user_title_id and user_id=v_owner;
  return jsonb_build_object('chapter',v_chapter,'status',v_status,'event',case when v_event.id is not null then to_jsonb(v_event) else null end);
end;
$$;
revoke execute on function public.record_chapter_progress(uuid,integer,uuid,timestamptz,boolean) from public,anon;
grant execute on function public.record_chapter_progress(uuid,integer,uuid,timestamptz,boolean) to authenticated;
