begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users(id,email) values
  ('00000000-0000-0000-0000-00000000000a','account-a@reel.test'),
  ('00000000-0000-0000-0000-00000000000b','account-b@reel.test');

insert into public.titles(id,provider,provider_id,media_type,title,normalized_title)
values('10000000-0000-0000-0000-000000000001','wikidata','Q13417189','movie','Interstellar','interstellar');

insert into public.user_titles(id,user_id,title_id,status,rating) values
  ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-000000000001','done',9),
  ('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-00000000000b','10000000-0000-0000-0000-000000000001','want',0);

select ok((select relrowsecurity from pg_class where oid='public.user_titles'::regclass),'user_titles has RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.user_preferences'::regclass),'user_preferences has RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.titles'::regclass),'titles has RLS enabled');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',true);
select results_eq($$select count(*)::bigint from public.user_titles$$,array[1::bigint],'account A can select only account A library rows');
select results_eq(
  $$with changed as (update public.user_titles set rating=1 where id='20000000-0000-0000-0000-000000000002' returning 1) select count(*)::bigint from changed$$,
  array[0::bigint],'account A cannot patch account B library rows'
);
select results_eq(
  $$with removed as (delete from public.user_titles where id='20000000-0000-0000-0000-000000000002' returning 1) select count(*)::bigint from removed$$,
  array[0::bigint],'account A cannot delete account B library rows'
);
select throws_ok(
  $$insert into public.user_titles(user_id,title_id) values('00000000-0000-0000-0000-00000000000b','10000000-0000-0000-0000-000000000001')$$,
  '42501',null,'account A cannot insert a relationship owned by account B'
);

select is(
  public.sync_my_library(
    '[{"userId":"00000000-0000-0000-0000-00000000000b","provider":"wikidata","providerId":"Q25188","mediaType":"movie","title":"The Dark Knight","status":"done","rating":8}]'::jsonb,
    '{}'::jsonb
  ),1,'sync accepts one entry without accepting an owner id'
);
select results_eq(
  $$select user_id from public.user_titles where title_id=(select id from public.titles where provider='wikidata' and provider_id='Q25188')$$,
  array['00000000-0000-0000-0000-00000000000a'::uuid],
  'forged userId JSON is ignored and auth.uid owns the relationship'
);
select results_eq(
  $$select count(*)::bigint from public.user_titles where user_id='00000000-0000-0000-0000-00000000000b'$$,
  array[0::bigint],
  'RLS prevents account A from observing account B even in verification queries'
);

set local role postgres;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select throws_ok(
  $$select public.sync_my_library('[]'::jsonb,'{}'::jsonb)$$,
  '42501',null,'unauthenticated callers cannot mutate a personal library'
);

set local role postgres;
select set_config('request.jwt.claim.sub','',true);
select is((select count(*) from public.titles where provider='wikidata' and provider_id='Q13417189'),1::bigint,'same title exists once globally');
select is((select count(*) from public.user_titles where title_id='10000000-0000-0000-0000-000000000001'),1::bigint,'sync replacement removed only account A old relation and preserved account B relation');
select is((select status from public.user_titles where id='20000000-0000-0000-0000-000000000002'),'want','account B personal status stayed independent');

select * from finish();
rollback;
