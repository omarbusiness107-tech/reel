-- Ensure old JSON-backfilled manual titles and future manual titles resolve to
-- the same shared catalog row even if a client uses a different local hash.
create or replace function public.normalize_manual_title_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.provider = 'reel' then
    new.provider_id := md5(
      lower(coalesce(new.media_type,'movie')) || '|' ||
      lower(btrim(new.title)) || '|' || coalesce(new.release_year::text,'')
    );
  end if;
  return new;
end;
$$;

drop trigger if exists normalize_manual_title_identity on public.titles;
create trigger normalize_manual_title_identity
before insert or update of provider,provider_id,media_type,title,release_year
on public.titles
for each row execute function public.normalize_manual_title_identity();

revoke execute on function public.normalize_manual_title_identity() from public, anon, authenticated;
