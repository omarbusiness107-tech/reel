-- Additive mobile insertion. Never replaces or deletes a library snapshot.
begin;
create or replace function public.add_my_title(p_entry jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := (select auth.uid());
  v_title uuid;
  v_membership uuid;
  v_provider text := lower(btrim(p_entry->>'provider'));
  v_provider_id text := btrim(p_entry->>'providerId');
begin
  if v_owner is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if jsonb_typeof(p_entry) is distinct from 'object' or octet_length(p_entry::text)>64000 or
     coalesce(length(btrim(p_entry->>'title')),0) not between 1 and 300 or
     coalesce(length(v_provider),0) not between 1 and 40 or
     coalesce(length(v_provider_id),0) not between 1 and 300 or
     coalesce(p_entry->>'mediaType','') not in ('movie','series','anime','book','manga','manhwa') then
    raise exception 'Invalid title' using errcode='22023';
  end if;
  insert into public.titles(provider,provider_id,media_type,title,normalized_title,release_year,
    poster_url,backdrop_url,description,creator,genres,runtime_minutes,public_rating,metadata)
  values(v_provider,v_provider_id,p_entry->>'mediaType',btrim(p_entry->>'title'),
    lower(regexp_replace(btrim(p_entry->>'title'),'[^[:alnum:]]+',' ','g')),
    case when (p_entry->>'year') ~ '^[12][0-9]{3}$' then (p_entry->>'year')::integer else null end,
    case when p_entry->>'posterUrl' like 'https://%' then p_entry->>'posterUrl' else null end,
    case when p_entry->>'backdropUrl' like 'https://%' then p_entry->>'backdropUrl' else null end,
    left(p_entry->>'description',10000),left(p_entry->>'creator',500),
    case when jsonb_typeof(p_entry->'genres')='array' then p_entry->'genres' else '[]'::jsonb end,
    case when (p_entry->>'runtimeMinutes') ~ '^[0-9]{1,5}$' then (p_entry->>'runtimeMinutes')::integer else null end,
    case when (p_entry->>'publicRating') ~ '^[0-9]+(\.[0-9]+)?$' then least(10,greatest(0,(p_entry->>'publicRating')::numeric)) else null end,
    jsonb_strip_nulls(jsonb_build_object(
      'catalogId',p_entry->'metadata'->'catalogId','tvmaze',p_entry->'metadata'->'tvmaze',
      'kitsu',p_entry->'metadata'->'kitsu','wd',p_entry->'metadata'->'wd',
      'imdb',p_entry->'metadata'->'imdb','country',p_entry->'metadata'->'country',
      'cast',p_entry->'metadata'->'cast','sourceUrl',p_entry->'metadata'->'sourceUrl')))
  on conflict(provider,provider_id) do nothing
  returning id into v_title;
  if v_title is null then
    select id into v_title from public.titles where provider=v_provider and provider_id=v_provider_id;
  end if;
  insert into public.user_titles(user_id,title_id,status)
    values(v_owner,v_title,case when p_entry->>'status'='suggested' then 'suggested' else 'want' end)
    on conflict(user_id,title_id) do nothing returning id into v_membership;
  if v_membership is null then
    select id into v_membership from public.user_titles where user_id=v_owner and title_id=v_title;
  end if;
  return v_membership;
end;
$$;
revoke all on function public.add_my_title(jsonb) from public, anon;
grant execute on function public.add_my_title(jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
