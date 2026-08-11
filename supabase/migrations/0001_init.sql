-- ============================================================
-- 0001_init.sql — schema base do CRM
-- ============================================================

create extension if not exists "pg_trgm";      -- busca textual por similaridade
create extension if not exists "citext";       -- e-mail case-insensitive

-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------
create type member_role      as enum ('owner', 'admin', 'member', 'viewer');
create type client_status    as enum ('lead', 'active', 'inactive', 'churned');
create type client_kind      as enum ('pf', 'pj');
create type deal_status      as enum ('open', 'won', 'lost');
create type contract_status  as enum ('draft', 'sent', 'signed', 'active', 'expired', 'cancelled');
create type event_kind       as enum ('meeting', 'call', 'task', 'deadline', 'other');
create type activity_kind    as enum (
  'client_created','client_updated','deal_created','deal_moved','deal_won','deal_lost',
  'contract_uploaded','contract_status_changed','event_created','note_added'
);

-- ------------------------------------------------------------
-- ORGANIZAÇÕES E USUÁRIOS
-- ------------------------------------------------------------
create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  logo_url    text,
  timezone    text not null default 'America/Sao_Paulo',
  currency    text not null default 'BRL',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- espelha auth.users com dados de perfil
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  email       citext not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table memberships (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  role        member_role not null default 'member',
  created_at  timestamptz not null default now(),
  unique (org_id, user_id)
);
create index on memberships (user_id);
create index on memberships (org_id);

-- ------------------------------------------------------------
-- CLIENTES
-- ------------------------------------------------------------
create table clients (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,

  -- identificação
  kind          client_kind not null default 'pj',
  name          text not null,                 -- razão social ou nome
  trade_name    text,                          -- nome fantasia
  document      text,                          -- CNPJ ou CPF, só dígitos
  status        client_status not null default 'lead',

  -- contato principal
  email         citext,
  phone         text,
  whatsapp      text,
  website       text,

  -- endereço
  zip_code      text,
  street        text,
  number        text,
  complement    text,
  district      text,
  city          text,
  state         char(2),

  -- comercial
  segment       text,
  source        text,                          -- como chegou: indicação, site, evento...
  owner_id      uuid references profiles(id) on delete set null,  -- responsável
  tags          text[] not null default '{}',
  notes         text,                          -- observações livres

  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,                   -- soft delete

  constraint clients_document_digits check (document is null or document ~ '^[0-9]+$')
);

create unique index clients_org_document_uniq
  on clients (org_id, document) where document is not null and deleted_at is null;
create index clients_org_status_idx on clients (org_id, status) where deleted_at is null;
create index clients_org_created_idx on clients (org_id, created_at desc);
create index clients_name_trgm_idx on clients using gin (name gin_trgm_ops);
create index clients_tags_idx on clients using gin (tags);

-- contatos adicionais (opcional, mas barato)
create table client_contacts (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  client_id   uuid not null references clients(id) on delete cascade,
  name        text not null,
  role        text,
  email       citext,
  phone       text,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index on client_contacts (client_id);

-- ------------------------------------------------------------
-- PIPELINE / KANBAN
-- ------------------------------------------------------------
create table pipelines (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  is_default  boolean not null default false,
  position    text not null,
  created_at  timestamptz not null default now()
);
create index on pipelines (org_id);

-- as COLUNAS do Kanban — arrastáveis (position)
create table pipeline_stages (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  pipeline_id   uuid not null references pipelines(id) on delete cascade,
  name          text not null,
  color         text not null default '#64748b',
  position      text not null,                 -- índice fracionário
  is_won        boolean not null default false,-- coluna terminal de ganho
  is_lost       boolean not null default false,-- coluna terminal de perda
  wip_limit     int,                           -- limite de cards (opcional)
  created_at    timestamptz not null default now()
);
create index pipeline_stages_pipeline_pos_idx on pipeline_stages (pipeline_id, position);

-- os CARDS do Kanban — arrastáveis dentro e entre colunas
create table deals (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  pipeline_id     uuid not null references pipelines(id) on delete cascade,
  stage_id        uuid not null references pipeline_stages(id) on delete restrict,
  client_id       uuid references clients(id) on delete set null,

  title           text not null,
  description     text,
  value_cents     bigint not null default 0,   -- dinheiro em centavos, sempre
  currency        char(3) not null default 'BRL',
  probability     int check (probability between 0 and 100),
  status          deal_status not null default 'open',

  owner_id        uuid references profiles(id) on delete set null,
  expected_close  date,
  closed_at       timestamptz,
  lost_reason     text,

  position        text not null,               -- índice fracionário dentro do stage
  tags            text[] not null default '{}',

  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index deals_stage_pos_idx on deals (stage_id, position) where deleted_at is null;
create index deals_org_status_idx on deals (org_id, status) where deleted_at is null;
create index deals_client_idx on deals (client_id);
create index deals_org_created_idx on deals (org_id, created_at desc);

-- ------------------------------------------------------------
-- CONTRATOS
-- ------------------------------------------------------------
create table contracts (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  client_id     uuid references clients(id) on delete set null,
  deal_id       uuid references deals(id) on delete set null,

  title         text not null,
  contract_no   text,                          -- numeração interna
  status        contract_status not null default 'draft',
  value_cents   bigint not null default 0,
  currency      char(3) not null default 'BRL',

  start_date    date,
  end_date      date,
  signed_at     date,
  renewal_notice_days int default 30,          -- alerta de vencimento

  notes         text,                          -- o "bloco de notas"
  tags          text[] not null default '{}',

  -- arquivo
  file_path     text,                          -- caminho no bucket 'contracts'
  file_name     text,
  file_size     bigint,
  file_mime     text,

  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,

  constraint contracts_dates_ok check (end_date is null or start_date is null or end_date >= start_date)
);
create index contracts_org_status_idx on contracts (org_id, status) where deleted_at is null;
create index contracts_client_idx on contracts (client_id);
create index contracts_end_date_idx on contracts (org_id, end_date) where deleted_at is null;
create index contracts_title_trgm_idx on contracts using gin (title gin_trgm_ops);

-- ------------------------------------------------------------
-- CALENDÁRIO / EVENTOS
-- ------------------------------------------------------------
create table events (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  client_id     uuid references clients(id) on delete set null,
  deal_id       uuid references deals(id) on delete set null,

  title         text not null,
  description   text,
  location      text,                          -- endereço ou link da call
  kind          event_kind not null default 'meeting',
  color         text,

  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  all_day       boolean not null default false,

  -- recorrência simples (RFC 5545 subset). null = evento único
  rrule         text,

  status        text not null default 'confirmed',  -- confirmed | tentative | cancelled
  owner_id      uuid references profiles(id) on delete set null,

  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,

  constraint events_range_ok check (ends_at >= starts_at)
);
create index events_org_range_idx on events (org_id, starts_at, ends_at) where deleted_at is null;
create index events_owner_idx on events (owner_id, starts_at);
create index events_client_idx on events (client_id);

-- participantes internos
create table event_attendees (
  event_id    uuid not null references events(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  response    text not null default 'pending',  -- pending | accepted | declined
  primary key (event_id, user_id)
);

-- ------------------------------------------------------------
-- TIMELINE / AUDITORIA
-- ------------------------------------------------------------
create table activities (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  actor_id      uuid references profiles(id) on delete set null,
  kind          activity_kind not null,
  entity_type   text not null,                 -- 'client' | 'deal' | 'contract' | 'event'
  entity_id     uuid not null,
  client_id     uuid references clients(id) on delete cascade,
  payload       jsonb not null default '{}',   -- { from, to, ... }
  created_at    timestamptz not null default now()
);
create index activities_org_created_idx on activities (org_id, created_at desc);
create index activities_entity_idx on activities (entity_type, entity_id, created_at desc);
create index activities_client_idx on activities (client_id, created_at desc);

-- ------------------------------------------------------------
-- TRIGGERS: updated_at automático
-- ------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'organizations','profiles','clients','deals','contracts','events'
  ] loop
    execute format(
      'create trigger %I_set_updated_at before update on %I
       for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- TRIGGER: cria profile ao criar usuário no Auth
-- ------------------------------------------------------------
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
