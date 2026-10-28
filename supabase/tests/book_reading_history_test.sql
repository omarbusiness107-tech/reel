begin;
select set_config('reel.test_owner',gen_random_uuid()::text,true);
select set_config('reel.test_other',gen_random_uuid()::text,true);
select set_config('reel.test_title',gen_random_uuid()::text,true);
select set_config('reel.test_entry',gen_random_uuid()::text,true);
select set_config('reel.test_request',gen_random_uuid()::text,true);
insert into auth.users(id) values(current_setting('reel.test_owner')::uuid),(current_setting('reel.test_other')::uuid);
insert into public.titles(id,provider,provider_id,media_type,title,normalized_title,page_count)
values(current_setting('reel.test_title')::uuid,'reel-test',current_setting('reel.test_title'),'book','Reading test','reading test',4);
insert into public.user_titles(id,user_id,title_id,current_page)
values(current_setting('reel.test_entry')::uuid,current_setting('reel.test_owner')::uuid,current_setting('reel.test_title')::uuid,2);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('reel.test_owner'),true);
do $$
declare result jsonb; entry uuid := current_setting('reel.test_entry')::uuid;
begin
  result:=public.record_page_progress(entry,3,current_setting('reel.test_request')::uuid,'2026-10-05T10:00:00Z');
  if result->'event'->>'reading_start'<>'3' then raise exception 'Incorrect reading range start'; end if;
  if result->>'page'<>'3' or result->'event'->>'page_number'<>'3' then raise exception 'Page event was not saved'; end if;
  perform public.record_page_progress(entry,3,current_setting('reel.test_request')::uuid,'2026-10-05T10:00:00Z');
  if (select count(*) from public.watch_events where user_title_id=entry)<>1 then raise exception 'Retry duplicated an event'; end if;
  result:=public.record_page_progress(entry,200,gen_random_uuid());
  if result->>'page'<>'4' then raise exception 'Known page limit was exceeded'; end if;
  perform public.record_page_progress(entry,4,gen_random_uuid(),now(),true);
  if (select status from public.user_titles where id=entry)<>'done' then raise exception 'Finished status not saved'; end if;
  if (select count(*) from public.watch_events where user_title_id=entry)<>2 then raise exception 'Earlier or duplicate pages were invented'; end if;
  if exists(select 1 from public.watch_events where user_title_id=entry and runtime_minutes is not null) then raise exception 'Reading must not add watch time'; end if;
  perform public.record_page_progress(entry,0,gen_random_uuid());
  if exists(select 1 from public.watch_events where user_title_id=entry) then raise exception 'Reset retained unread positions'; end if;
  perform public.record_page_progress(entry,4,gen_random_uuid());
  perform public.record_page_progress(entry,3,gen_random_uuid());
  if (select max(page_number) from public.watch_events where user_title_id=entry)<>3 then raise exception 'Correction retained old endpoint'; end if;
  if (select min(reading_start) from public.watch_events where user_title_id=entry)<>1 then raise exception 'Correction lost original range start'; end if;
  if (select count(*) from public.watch_events where user_title_id=entry)<>1 then raise exception 'Correction added a false reading session'; end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('reel.test_other'),true);
do $$
begin
  if exists(select 1 from public.watch_events where user_title_id=current_setting('reel.test_entry')::uuid) then raise exception 'Reading history leaked between accounts'; end if;
  begin
    perform public.record_page_progress(current_setting('reel.test_entry')::uuid,3,gen_random_uuid());
    raise exception 'Cross-account action was allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
select 'PASS: page save, date, retry, limit, finish, no invented earlier events, account isolation; all test data rolled back' as result;
