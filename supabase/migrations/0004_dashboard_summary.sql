-- ============================================================
-- 0004_dashboard_summary.sql — RPC do Dashboard (ARQUITETURA.md §7.4)
-- ============================================================

create or replace function dashboard_summary(p_org uuid, p_from timestamptz, p_to timestamptz)
returns jsonb
language sql stable security invoker as $$
  with
  won as (
    select coalesce(sum(value_cents),0) v, count(*) c from deals
    where org_id = p_org and status = 'won' and deleted_at is null
      and closed_at between p_from and p_to
  ),
  lost as (
    select count(*) c from deals
    where org_id = p_org and status = 'lost' and deleted_at is null
      and closed_at between p_from and p_to
  ),
  open_deals as (
    select coalesce(sum(value_cents),0) v, count(*) c from deals
    where org_id = p_org and status = 'open' and deleted_at is null
  ),
  new_clients as (
    select count(*) c from clients
    where org_id = p_org and deleted_at is null
      and created_at between p_from and p_to
  ),
  by_stage as (
    select jsonb_agg(jsonb_build_object(
             'stage_id', s.id, 'name', s.name, 'color', s.color,
             'count', coalesce(d.c,0), 'value_cents', coalesce(d.v,0))
             order by s.position) j
    from pipeline_stages s
    left join lateral (
      select count(*) c, coalesce(sum(value_cents),0) v
      from deals where stage_id = s.id and status = 'open' and deleted_at is null
    ) d on true
    where s.org_id = p_org
  )
  select jsonb_build_object(
    'won_value',      (select v from won),
    'won_count',      (select c from won),
    'lost_count',     (select c from lost),
    'open_value',     (select v from open_deals),
    'open_count',     (select c from open_deals),
    'new_clients',    (select c from new_clients),
    'conversion_rate',
      case when (select c from won) + (select c from lost) = 0 then 0
      else round(100.0 * (select c from won) / ((select c from won) + (select c from lost)), 1) end,
    'funnel',         (select j from by_stage)
  );
$$;
