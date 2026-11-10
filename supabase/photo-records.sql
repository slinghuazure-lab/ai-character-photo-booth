-- Install once in the P0-5 Supabase project via SQL Editor.
begin;
create schema if not exists booth_reporting;
revoke all on schema booth_reporting from public, anon, authenticated;

create table if not exists booth_reporting.photo_records (
  photo_id uuid primary key,
  booth_id uuid not null,
  captured_at timestamptz not null,
  participants smallint not null check (participants >= 0),
  share_status text not null check (share_status in ('local','shared','failed')),
  revision integer not null check (revision > 0)
);
-- Update existing installations that used the old 1–5 consent limit.
alter table booth_reporting.photo_records drop constraint if exists photo_records_participants_check;
alter table booth_reporting.photo_records add constraint photo_records_participants_check check (participants >= 0);
alter table booth_reporting.photo_records enable row level security;
revoke all on booth_reporting.photo_records from public, anon, authenticated;

create or replace function public.record_booth_photo(
  p_id uuid,p_taken timestamptz,p_people integer,p_status text,p_revision integer
) returns void language plpgsql security definer set search_path='' as $$
declare
  booth uuid := auth.uid();
begin
  if booth is null then raise exception 'Authentication required' using errcode='42501'; end if;
  insert into booth_reporting.photo_records as r (photo_id,booth_id,captured_at,participants,share_status,revision)
    values (p_id,booth,p_taken,p_people,p_status,p_revision)
    on conflict (photo_id) do update set share_status=excluded.share_status,revision=excluded.revision
    where r.booth_id=excluded.booth_id and r.revision<excluded.revision;
  if not found and not exists (
    select 1 from booth_reporting.photo_records where photo_id=p_id and booth_id=booth
  ) then raise exception 'Record owner mismatch' using errcode='42501'; end if;
end;
$$;
revoke all on function public.record_booth_photo(uuid,timestamptz,integer,text,integer) from public,anon;
grant execute on function public.record_booth_photo(uuid,timestamptz,integer,text,integer) to authenticated;

create or replace view booth_reporting.daily_summary as
select (captured_at at time zone 'Asia/Taipei')::date as local_date,
       booth_id, count(*) as photos,sum(participants) as participant_visits,
       count(*) filter (where share_status='shared') as shared_photos,
       count(*) filter (where share_status='failed') as share_failed
from booth_reporting.photo_records
group by 1,2;
revoke all on booth_reporting.daily_summary from public, anon, authenticated;
commit;
