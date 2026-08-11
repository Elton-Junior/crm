-- ============================================================
-- 0002_rls.sql — Row Level Security
-- ============================================================

-- Helper: organizações do usuário logado.
-- STABLE + security definer para não recursar nas policies de memberships.
create or replace function public.user_org_ids()
returns setof uuid
language sql stable security definer set search_path = public as $$
  select org_id from memberships where user_id = auth.uid();
$$;

create or replace function public.user_role_in(p_org uuid)
returns member_role
language sql stable security definer set search_path = public as $$
  select role from memberships where user_id = auth.uid() and org_id = p_org limit 1;
$$;

create or replace function public.is_member(p_org uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where user_id = auth.uid() and org_id = p_org);
$$;

create or replace function public.can_write(p_org uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.user_role_in(p_org) in ('owner','admin','member');
$$;

-- Habilita RLS em tudo (nega por padrão)
alter table organizations   enable row level security;
alter table profiles        enable row level security;
alter table memberships     enable row level security;
alter table clients         enable row level security;
alter table client_contacts enable row level security;
alter table pipelines       enable row level security;
alter table pipeline_stages enable row level security;
alter table deals           enable row level security;
alter table contracts       enable row level security;
alter table events          enable row level security;
alter table event_attendees enable row level security;
alter table activities      enable row level security;

-- organizations
create policy org_select on organizations
  for select using (id in (select public.user_org_ids()));
create policy org_update on organizations
  for update using (public.user_role_in(id) in ('owner','admin'));

-- profiles: vê a si mesmo e a quem compartilha org
create policy profile_select on profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1 from memberships m1
      join memberships m2 on m1.org_id = m2.org_id
      where m1.user_id = auth.uid() and m2.user_id = profiles.id
    )
  );
create policy profile_update_self on profiles
  for update using (id = auth.uid());

-- memberships
create policy membership_select on memberships
  for select using (org_id in (select public.user_org_ids()));
create policy membership_write on memberships
  for all using (public.user_role_in(org_id) in ('owner','admin'))
       with check (public.user_role_in(org_id) in ('owner','admin'));

-- Policies genéricas por org: leitura para membros, escrita para can_write
do $$
declare t text;
begin
  foreach t in array array[
    'clients','client_contacts','pipelines','pipeline_stages',
    'deals','contracts','events','activities'
  ] loop
    execute format(
      'create policy %1$I_select on %1$I for select using (public.is_member(org_id))', t);
    execute format(
      'create policy %1$I_insert on %1$I for insert with check (public.can_write(org_id))', t);
    execute format(
      'create policy %1$I_update on %1$I for update using (public.can_write(org_id))
         with check (public.can_write(org_id))', t);
    execute format(
      'create policy %1$I_delete on %1$I for delete
         using (public.user_role_in(org_id) in (''owner'',''admin''))', t);
  end loop;
end $$;

-- event_attendees: segue o evento
create policy attendee_select on event_attendees
  for select using (
    exists (select 1 from events e where e.id = event_id and public.is_member(e.org_id))
  );
create policy attendee_write on event_attendees
  for all using (
    exists (select 1 from events e where e.id = event_id and public.can_write(e.org_id))
  ) with check (
    exists (select 1 from events e where e.id = event_id and public.can_write(e.org_id))
  );
