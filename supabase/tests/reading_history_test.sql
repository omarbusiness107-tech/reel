begin;
select set_config('reel.test_owner',gen_random_uuid()::text,true);
select set_config('reel.test_other',gen_random_uuid()::text,true);
select set_config('reel.test_title',gen_random_uuid()::text,true);
select set_config('reel.test_entry',gen_random_uuid()::text,true);
select set_config('reel.test_request',gen_random_uuid()::text,true);
insert into auth.users(id) values(current_setting('reel.test_owner')::uuid),(current_setting('reel.test_other')::uuid);
insert into public.titles(id,provider,provider_id,media_type,title,normalized_title,metadata)
values(current_setting('reel.test_title')::uuid,'reel-test',current_setting('reel.test_title'),'manga','Reading test','reading test','{"chapters":4}');
insert into public.user_titles(id,user_id,title_id,current_chapter)
values(current_setting('reel.test_entry')::uuid,current_setting('reel.test_owner')::uuid,current_setting('reel.test_title')::uuid,2);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('reel.test_owner'),true);
do $$
declare result jsonb; entry uuid := current_setting('reel.test_entry')::uuid;
begin
  result:=public.record_chapter_progress(entry,3,current_setting('reel.test_request')::uuid,'2026-10-05T10:00:00Z');
  if result->>'chapter'<>'3' or result->'event'->>'chapter_number'<>'3' then raise exception 'Chapter event was not saved'; end if;
  perform public.record_chapter_progress(entry,3,current_setting('reel.test_request')::uuid,'2026-10-05T10:00:00Z');
  if (select count(*) from public.watch_events where user_title_id=entry)<>1 then raise exception 'Retry duplicated an event'; end if;
  result:=public.record_chapter_progress(entry,200,gen_random_uuid());
  if result->>'chapter'<>'4' then raise exception 'Known chapter limit was exceeded'; end if;
  perform public.record_chapter_progress(entry,4,gen_random_uuid(),now(),true);
  if (select status from public.user_titles where id=entry)<>'done' then raise exception 'Finished status not saved'; end if;
  if (select count(*) from public.watch_events where user_title_id=entry)<>2 then raise exception 'Earlier or duplicate chapters were invented'; end if;
  if exists(select 1 from public.watch_events where user_title_id=entry and runtime_minutes is not null) then raise exception 'Reading must not add watch time'; end if;
  perform public.record_chapter_progress(entry,0,gen_random_uuid());
  if exists(select 1 from public.watch_events where user_title_id=entry) then raise exception 'Reset retained unread positions'; end if;
  perform public.record_chapter_progress(entry,4,gen_random_uuid());
  perform public.record_chapter_progress(entry,3,gen_random_uuid());
  if (select max(chapter_number) from public.watch_events where user_title_id=entry)<>3 then raise exception 'Correction retained old endpoint'; end if;
  if (select min(reading_start) from public.watch_events where user_title_id=entry)<>1 then raise exception 'Correction lost original range start'; end if;
  if (select count(*) from public.watch_events where user_title_id=entry)<>1 then raise exception 'Correction added a false reading session'; end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('reel.test_other'),true);
do $$
begin
  if exists(select 1 from public.watch_events where user_title_id=current_setting('reel.test_entry')::uuid) then raise exception 'Reading history leaked between accounts'; end if;
  begin
    perform public.record_chapter_progress(current_setting('reel.test_entry')::uuid,3,gen_random_uuid());
    raise exception 'Cross-account action was allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
select 'PASS: chapter save, date, retry, limit, finish, no invented earlier events, account isolation; all test data rolled back' as result;
