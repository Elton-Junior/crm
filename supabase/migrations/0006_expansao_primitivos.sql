-- ============================================================
-- 0006_expansao_primitivos.sql
-- Fase 5, item 22 (ARQUITETURA-EXPANSAO.md §3, §4, §9).
--
-- Cria os primitivos compartilhados (files/folders, comments,
-- notifications) e o schema de Tarefas e Projetos (usado só a
-- partir da Fase 6 — criado agora para não fatiar a migration).
-- Refatora contracts para apontar para files em vez de colunas
-- inline de arquivo (não há contratos reais em produção ainda).
-- ============================================================

-- ------------------------------------------------------------
-- §3.1 — files / folders / file_links
-- ------------------------------------------------------------
create table folders (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  parent_id   uuid references folders(id) on delete cascade,
  name        text not null,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (org_id, parent_id, name)
);
create index folders_org_parent_idx on folders (org_id, parent_id) where deleted_at is null;

create table files (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  folder_id     uuid references folders(id) on delete set null,
  name          text not null,
  storage_path  text not null unique,
  size          bigint not null,
  mime          text not null,
  checksum      text,
  version       int not null default 1,
  replaces_id   uuid references files(id) on delete set null,
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index files_org_folder_idx on files (org_id, folder_id) where deleted_at is null;
create index files_name_trgm_idx on files using gin (name gin_trgm_ops);

create table file_links (
  file_id     uuid not null references files(id) on delete cascade,
  entity_type text not null,
  entity_id   uuid not null,
  created_at  timestamptz not null default now(),
  primary key (file_id, entity_type, entity_id)
);
create index file_links_entity_idx on file_links (entity_type, entity_id);

-- contracts passa a apontar para files (sem dados reais a migrar ainda)
alter table contracts add column file_id uuid references files(id) on delete set null;
alter table contracts drop column file_path;
alter table contracts drop column file_name;
alter table contracts drop column file_size;
alter table contracts drop column file_mime;

-- ------------------------------------------------------------
-- §3.2 — comments
-- ------------------------------------------------------------
create table comments (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  entity_type   text not null,
  entity_id     uuid not null,
  parent_id     uuid references comments(id) on delete cascade,
  author_id     uuid not null references profiles(id) on delete cascade,
  body          text not null,
  mentions      uuid[] not null default '{}',
  edited_at     timestamptz,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index comments_entity_idx on comments (entity_type, entity_id, created_at desc)
  where deleted_at is null;
create index comments_mentions_idx on comments using gin (mentions);

-- ------------------------------------------------------------
-- §3.3 — notifications
-- ------------------------------------------------------------
create type notification_kind as enum (
  'mention','task_assigned','task_due_soon','task_completed',
  'deal_moved','deal_won','deal_lost','deal_stale',
  'contract_expiring','event_reminder','message_received','automation_failed'
);

create table notifications (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  kind          notification_kind not null,
  title         text not null,
  body          text,
  entity_type   text,
  entity_id     uuid,
  url           text,
  actor_id      uuid references profiles(id) on delete set null,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index notifications_user_unread_idx on notifications (user_id, created_at desc)
  where read_at is null;

-- ------------------------------------------------------------
-- §4 — Tarefas e Projetos (schema agora, UI só na Fase 6)
-- ------------------------------------------------------------
create type project_status  as enum ('active','on_hold','done','archived');
create type task_priority   as enum ('low','normal','high','urgent');
create type task_status     as enum ('todo','in_progress','review','done','cancelled');

create table projects (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  description text,
  color       text not null default '#3b82f6',
  status      project_status not null default 'active',
  client_id   uuid references clients(id) on delete set null,
  deal_id     uuid references deals(id) on delete set null,
  owner_id    uuid references profiles(id) on delete set null,
  starts_on   date,
  due_on      date,
  position    text not null,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index projects_org_status_idx on projects (org_id, status) where deleted_at is null;

create table project_members (
  project_id  uuid not null references projects(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  role        text not null default 'member',
  primary key (project_id, user_id)
);

create table task_columns (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  name        text not null,
  color       text not null default '#64748b',
  position    text not null,
  is_done     boolean not null default false,
  wip_limit   int,
  created_at  timestamptz not null default now()
);
create index task_columns_project_pos_idx on task_columns (project_id, position);

create table tasks (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizations(id) on delete cascade,
  project_id     uuid not null references projects(id) on delete cascade,
  column_id      uuid not null references task_columns(id) on delete restrict,
  parent_id      uuid references tasks(id) on delete cascade,

  title          text not null,
  description    text,
  status         task_status not null default 'todo',
  priority       task_priority not null default 'normal',

  assignee_id    uuid references profiles(id) on delete set null,
  client_id      uuid references clients(id) on delete set null,
  deal_id        uuid references deals(id) on delete set null,

  starts_on      date,
  due_on         date,
  completed_at   timestamptz,
  estimate_min   int,
  spent_min      int not null default 0,

  position       text not null,
  tags           text[] not null default '{}',

  created_by     uuid references profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index tasks_column_pos_idx on tasks (column_id, position) where deleted_at is null;
create index tasks_assignee_due_idx on tasks (assignee_id, due_on) where deleted_at is null;
create index tasks_project_idx on tasks (project_id) where deleted_at is null;
create index tasks_parent_idx on tasks (parent_id);

create table task_checklist_items (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references tasks(id) on delete cascade,
  title       text not null,
  done        boolean not null default false,
  position    text not null,
  created_at  timestamptz not null default now()
);
create index task_checklist_items_task_pos_idx on task_checklist_items (task_id, position);

create table task_watchers (
  task_id   uuid not null references tasks(id) on delete cascade,
  user_id   uuid not null references profiles(id) on delete cascade,
  primary key (task_id, user_id)
);

create table time_entries (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  task_id     uuid not null references tasks(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  minutes     int not null check (minutes > 0),
  note        text,
  logged_on   date not null default current_date,
  created_at  timestamptz not null default now()
);
create index time_entries_task_idx on time_entries (task_id);
create index time_entries_user_date_idx on time_entries (user_id, logged_on desc);

-- ------------------------------------------------------------
-- §9 — RLS das novas tabelas (reaproveita is_member/can_write/
-- user_role_in de 0002_rls.sql)
-- ------------------------------------------------------------
alter table folders             enable row level security;
alter table files               enable row level security;
alter table file_links          enable row level security;
alter table comments            enable row level security;
alter table notifications       enable row level security;
alter table projects            enable row level security;
alter table project_members     enable row level security;
alter table task_columns        enable row level security;
alter table tasks               enable row level security;
alter table task_checklist_items enable row level security;
alter table task_watchers       enable row level security;
alter table time_entries        enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'folders','files','comments','projects','task_columns','tasks','time_entries'
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

-- file_links: segue o arquivo (não tem org_id próprio)
create policy file_links_select on file_links
  for select using (
    exists (select 1 from files f where f.id = file_id and public.is_member(f.org_id))
  );
create policy file_links_write on file_links
  for all using (
    exists (select 1 from files f where f.id = file_id and public.can_write(f.org_id))
  ) with check (
    exists (select 1 from files f where f.id = file_id and public.can_write(f.org_id))
  );

-- project_members: segue o projeto
create policy project_members_select on project_members
  for select using (
    exists (select 1 from projects p where p.id = project_id and public.is_member(p.org_id))
  );
create policy project_members_write on project_members
  for all using (
    exists (select 1 from projects p where p.id = project_id and public.can_write(p.org_id))
  ) with check (
    exists (select 1 from projects p where p.id = project_id and public.can_write(p.org_id))
  );

-- task_checklist_items: segue a tarefa
create policy task_checklist_items_select on task_checklist_items
  for select using (
    exists (select 1 from tasks t where t.id = task_id and public.is_member(t.org_id))
  );
create policy task_checklist_items_write on task_checklist_items
  for all using (
    exists (select 1 from tasks t where t.id = task_id and public.can_write(t.org_id))
  ) with check (
    exists (select 1 from tasks t where t.id = task_id and public.can_write(t.org_id))
  );

-- task_watchers: segue a tarefa
create policy task_watchers_select on task_watchers
  for select using (
    exists (select 1 from tasks t where t.id = task_id and public.is_member(t.org_id))
  );
create policy task_watchers_write on task_watchers
  for all using (
    exists (select 1 from tasks t where t.id = task_id and public.can_write(t.org_id))
  ) with check (
    exists (select 1 from tasks t where t.id = task_id and public.can_write(t.org_id))
  );

-- notifications: cada um só vê e edita as suas
create policy notifications_select on notifications
  for select using (user_id = auth.uid());
create policy notifications_update on notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
