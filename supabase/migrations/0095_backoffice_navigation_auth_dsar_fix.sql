-- MMOS Backoffice Navigation/Auth Fix: DSAR compatibility

do $$
begin
  if to_regclass('public.dsar_requests') is not null then
    alter table public.dsar_requests add column if not exists type text;
    alter table public.dsar_requests add column if not exists request_type text;
    update public.dsar_requests
      set type = coalesce(type, request_type, 'export'),
          request_type = coalesce(request_type, type, 'export')
      where type is null or request_type is null;
    alter table public.dsar_requests alter column type set default 'export';
    alter table public.dsar_requests alter column request_type set default 'export';
  end if;
end $$;
