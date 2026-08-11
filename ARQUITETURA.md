# ARQUITETURA — CRM Interno (SaaS)

> Documento de arquitetura completo, pronto para ser executado com Claude Code.
> Versão 1.0 — 10/08/2026
> Autor: Vetor (arquitetura) / Elton (produto)

---

## 0. Como usar este documento

Este arquivo é a **fonte da verdade** do projeto. Ele foi escrito para ser lido por um agente de IA (Claude Code) que vai construir o sistema incrementalmente.

Ordem de leitura recomendada:

1. Seção 1–3 (premissas, stack, decisões) → contexto obrigatório
2. Seção 4 (modelo de dados) → rode o SQL antes de escrever qualquer código
3. Seção 5–6 (estrutura, convenções) → como o código deve ser organizado
4. Seção 7 (módulos) → especificação funcional detalhada
5. Seção 11 (roadmap de prompts) → a sequência de execução

**Regra de ouro para o agente:** nunca invente tabela, coluna ou rota que não esteja neste documento. Se faltar algo, pare e pergunte.

---

## 1. Premissas

Estas premissas foram assumidas com base no briefing. **Se alguma estiver errada, corrija antes de começar** — algumas mudam o modelo de dados.

| # | Premissa | Impacto se mudar |
|---|---|---|
| P1 | Uso **interno** da empresa. Não há venda para clientes externos agora. | Baixo — o schema já nasce com `org_id`, então virar multi-tenant depois é barato. |
| P2 | Volume pequeno: até ~20 usuários, ~5.000 clientes, ~10.000 propostas nos primeiros 2 anos. | Alto — acima disso, revisar índices e paginação (ver §12). |
| P3 | Não há billing/assinatura. Ninguém paga pelo sistema. | Alto — Stripe fica fora do MVP. |
| P4 | Contratos são **arquivos** (PDF/DOCX) com metadados + campo de anotações livre. | Médio — se for editor de texto puro, troca Storage por Tiptap/JSONB. |
| P5 | Login por **magic link** (e-mail), sem senha. Domínio de e-mail da empresa restrito. | Baixo — Supabase Auth suporta trocar o provider sem mexer no schema. |
| P6 | Calendário é **interno** (sem sync bidirecional com Google Calendar) no MVP. | Médio — sync fica na Fase 4. |
| P7 | Uma única moeda (BRL) e um único fuso (America/Sao_Paulo). | Baixo. |
| P8 | O sistema será construído com **Claude Code**, por 1 pessoa. | Alto — molda a estrutura de pastas e a granularidade das features. |

---

## 2. Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Framework | **Next.js 15** (App Router) + React 19 + TypeScript strict | Server Components reduzem JS no cliente; Server Actions eliminam a camada de API REST no MVP. |
| Hospedagem | **Vercel** | Deploy por push, preview por PR, edge network. Free/Pro cobre esse volume folgado. |
| Banco + Auth + Storage | **Supabase** | Postgres real (não abstração), RLS nativa, Auth e Storage no mesmo produto. Menos peças para manter. |
| UI | **Tailwind CSS v4 + shadcn/ui** | shadcn gera componentes no seu repo (não é dependência opaca) → IA consegue editar. Radix por baixo = acessibilidade de graça. |
| Estado servidor | **TanStack Query v5** | Cache + optimistic updates. Essencial para o Kanban parecer instantâneo. |
| Formulários | **react-hook-form + Zod** | Mesmo schema Zod valida no cliente e na Server Action. Uma fonte de verdade. |
| Drag & drop | **@dnd-kit/core + @dnd-kit/sortable** | Ativamente mantido, acessível (teclado), suporta arrastar card **e** coluna. `react-beautiful-dnd` está descontinuado. |
| Calendário | **FullCalendar** (`@fullcalendar/react`) | Vista mês/semana/dia, clique no dia, drag de evento — tudo pronto. Alternativa: `react-big-calendar` (mais leve, menos recursos). |
| Gráficos | **Recharts** | Simples, declarativo, suficiente para o dashboard. |
| Datas | **date-fns** + `date-fns-tz` | Tree-shakeable. Timezone explícito. |
| Tabelas | **TanStack Table v8** | Headless — sorting, filtro e paginação sem impor UI. |
| Ícones | **lucide-react** | — |
| Notificações UI | **sonner** | — |
| Testes | **Vitest** (unit) + **Playwright** (e2e nos 3 fluxos críticos) | — |

### Dependências (package.json)

```bash
npx create-next-app@latest crm --typescript --tailwind --app --src-dir --import-alias "@/*"

npm i @supabase/supabase-js @supabase/ssr
npm i @tanstack/react-query @tanstack/react-table
npm i @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm i react-hook-form @hookform/resolvers zod
npm i date-fns date-fns-tz
npm i recharts lucide-react sonner
npm i fractional-indexing
npm i @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction

npx shadcn@latest init
npx shadcn@latest add button input label textarea select dialog sheet dropdown-menu \
  table card badge avatar tabs separator tooltip popover calendar form skeleton alert-dialog
```

---

## 3. Decisões arquiteturais (ADRs)

Formato curto: contexto → decisão → consequência → quando deixa de valer.

### ADR-001 — Multi-tenancy por linha (`org_id`) desde o dia 1

**Contexto:** hoje é uso interno de uma empresa só, mas o produto pode virar SaaS vendável.
**Decisão:** toda tabela de negócio carrega `org_id uuid not null`. Uma única organização é criada no seed. RLS filtra por `org_id`.
**Consequência:** +1 coluna e +1 join em tudo. Custo marginal ~zero. Se um dia virar produto, não há migração de dados dolorosa.
**Quando deixa de valer:** se um cliente exigir isolamento físico (compliance pesado, healthcare) → aí sim database-per-tenant. Improvável aqui.

### ADR-002 — Server Actions em vez de API REST no MVP

**Contexto:** app single-page, um consumidor só (o próprio front).
**Decisão:** mutations via Server Actions do Next.js. Leituras via Server Components (RSC) quando estático, via TanStack Query quando precisa ser reativo (Kanban, calendário).
**Consequência:** menos código, tipagem end-to-end de graça, sem versionar API.
**Quando deixa de valer:** quando houver app mobile, integração de terceiro ou webhook → expor `/api/v1/*` em Route Handlers reutilizando a mesma camada de serviço em `src/server/`. Por isso a lógica **não** mora dentro da action: mora em `src/server/`, e a action só orquestra.

### ADR-003 — RLS como camada de segurança primária

**Contexto:** com Supabase, é tentador confiar só na checagem em código.
**Decisão:** RLS **habilitada e negando por padrão** em todas as tabelas. A lógica de aplicação é a segunda camada, não a única. `service_role` key nunca é exposta ao cliente e só é usada em jobs/admin.
**Consequência:** um bug de esquecer o `where org_id = ...` não vaza dados.
**Quando deixa de valer:** nunca. Isso é inegociável.

### ADR-004 — Ordenação por índice fracionário (não por inteiro sequencial)

**Contexto:** no Kanban, arrastar um card entre 500 outros não pode disparar 500 UPDATEs.
**Decisão:** coluna `position text` usando a lib `fractional-indexing` (ordenação lexicográfica). Mover = calcular a chave entre o vizinho anterior e o próximo → **1 UPDATE, 1 linha**.
**Consequência:** ordenação O(1) por movimento. As strings crescem lentamente; irrelevante nessa escala.
**Alternativa descartada:** `position numeric` com ponto médio — sofre de perda de precisão de float após ~50 inserções no mesmo ponto e exige rebalanceamento periódico.

### ADR-005 — Contratos como arquivos em Supabase Storage (bucket privado)

**Contexto:** contrato é documento assinado, não texto editável.
**Decisão:** bucket `contracts` **privado**. Acesso via **signed URL** com validade curta (60s), gerada no servidor após checagem de permissão. Metadados (título, cliente, vigência, valor, status) no Postgres. Campo `notes` (texto livre) para o "bloco de notas".
**Consequência:** nenhum arquivo é público. Preview de PDF via `<iframe>` ou `react-pdf` com a signed URL.
**Quando deixa de valer:** se precisar de assinatura eletrônica → integrar Clicksign/DocuSign na Fase 4.

### ADR-006 — Monolito modular, não microsserviços

**Contexto:** 1 dev, produto interno.
**Decisão:** um repo, um deploy. Modularização por **feature folder** (`src/features/clients`, `src/features/deals`…), não por camada técnica.
**Consequência:** o agente de IA consegue carregar todo o contexto de uma feature abrindo uma pasta só. Isso é o que mais impacta a qualidade do código gerado.
**Quando deixa de valer:** acima de ~8 devs no mesmo repo, ou quando uma feature tiver requisito de escala próprio. Muito longe daqui.

### ADR-007 — Sem cache distribuído, sem fila, sem Redis no MVP

**Decisão:** Postgres aguenta tudo nessa escala. `revalidatePath`/`revalidateTag` do Next cobre invalidação.
**Quando deixa de valer:** quando aparecer envio de e-mail em massa, geração de relatório pesado ou job agendado → Vercel Cron + tabela `jobs` no Postgres. Só migre para fila real (Upstash QStash/Inngest) se o volume justificar.

---

## 4. Modelo de dados

### 4.1 Diagrama de relacionamento

```
organizations
 └── memberships ──── profiles ──── auth.users (Supabase)
 └── clients
      ├── client_contacts        (N contatos por cliente)
      ├── deals                  (propostas)
      ├── contracts
      ├── events                 (reuniões)
      └── activities             (timeline / log)
 └── pipelines
      └── pipeline_stages        (colunas do Kanban)
           └── deals             (cards do Kanban)
```

### 4.2 Migrations (SQL)

Salve como `supabase/migrations/0001_init.sql` e rode com `supabase db push`.

```sql
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
```

### 4.3 Row Level Security

Salve como `supabase/migrations/0002_rls.sql`.

```sql
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
```

### 4.4 Storage

```sql
-- ============================================================
-- 0003_storage.sql
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contracts', 'contracts', false, 26214400,  -- 25 MB
  array['application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/png','image/jpeg']
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

-- Convenção de caminho: contracts/{org_id}/{contract_id}/{filename}
create policy "contracts read by org member" on storage.objects
  for select using (
    bucket_id = 'contracts'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
  );

create policy "contracts write by org member" on storage.objects
  for insert with check (
    bucket_id = 'contracts'
    and public.can_write((storage.foldername(name))[1]::uuid)
  );

create policy "contracts delete by org admin" on storage.objects
  for delete using (
    bucket_id = 'contracts'
    and public.user_role_in((storage.foldername(name))[1]::uuid) in ('owner','admin')
  );
```

### 4.5 Seed

`supabase/seed.sql` — roda depois de criar o primeiro usuário no Auth.

```sql
-- Substitua o e-mail pelo seu
do $$
declare
  v_user uuid;
  v_org  uuid;
  v_pipe uuid;
begin
  select id into v_user from auth.users where email = 'ensjuninho@gmail.com' limit 1;
  if v_user is null then raise exception 'Crie o usuário no Auth antes de rodar o seed'; end if;

  insert into organizations (name, slug) values ('Minha Empresa', 'minha-empresa')
  returning id into v_org;

  insert into memberships (org_id, user_id, role) values (v_org, v_user, 'owner');

  insert into pipelines (org_id, name, is_default, position)
  values (v_org, 'Pipeline de Vendas', true, 'a0') returning id into v_pipe;

  insert into pipeline_stages (org_id, pipeline_id, name, color, position, is_won, is_lost) values
    (v_org, v_pipe, 'Cliente entrou em contato', '#3b82f6', 'a0', false, false),
    (v_org, v_pipe, 'Reunião agendada',          '#8b5cf6', 'a1', false, false),
    (v_org, v_pipe, 'Preparando proposta',       '#f59e0b', 'a2', false, false),
    (v_org, v_pipe, 'Negociação',                '#06b6d4', 'a3', false, false),
    (v_org, v_pipe, 'Fechado — Ganho',           '#22c55e', 'a4', true,  false),
    (v_org, v_pipe, 'Fechado — Perdido',         '#ef4444', 'a5', false, true);
end $$;
```

---

## 5. Estrutura de pastas

Organizada **por feature**, não por camada. Isso é o que mais melhora a saída de um agente de IA: tudo que ele precisa para mexer em "clientes" está em uma pasta.

```
crm/
├── CLAUDE.md                        # contexto permanente para o agente
├── ARQUITETURA.md                   # este arquivo
├── .env.local.example
├── supabase/
│   ├── migrations/
│   │   ├── 0001_init.sql
│   │   ├── 0002_rls.sql
│   │   └── 0003_storage.sql
│   └── seed.sql
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # LANDING PAGE (pública)
│   │   ├── globals.css
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   └── auth/
│   │   │       ├── callback/route.ts
│   │   │       └── sign-out/route.ts
│   │   └── (app)/                   # tudo aqui exige sessão
│   │       ├── layout.tsx           # shell: sidebar + topbar
│   │       ├── dashboard/page.tsx
│   │       ├── clientes/
│   │       │   ├── page.tsx         # lista + filtros
│   │       │   ├── novo/page.tsx
│   │       │   └── [id]/page.tsx    # detalhe + timeline
│   │       ├── propostas/
│   │       │   ├── page.tsx         # KANBAN
│   │       │   └── [id]/page.tsx    # detalhe da proposta
│   │       ├── contratos/
│   │       │   ├── page.tsx
│   │       │   ├── novo/page.tsx
│   │       │   └── [id]/page.tsx    # viewer + notas
│   │       ├── agenda/page.tsx      # CALENDÁRIO
│   │       └── configuracoes/
│   │           ├── page.tsx
│   │           ├── equipe/page.tsx
│   │           └── pipeline/page.tsx
│   │
│   ├── features/                    # ★ o coração do projeto
│   │   ├── clients/
│   │   │   ├── components/          # ClientTable, ClientForm, ClientCard...
│   │   │   ├── actions.ts           # Server Actions ('use server')
│   │   │   ├── queries.ts           # leituras (server-side)
│   │   │   ├── hooks.ts             # useClients, useClient (TanStack Query)
│   │   │   └── schema.ts            # Zod + tipos
│   │   ├── deals/
│   │   │   ├── components/
│   │   │   │   ├── KanbanBoard.tsx
│   │   │   │   ├── KanbanColumn.tsx
│   │   │   │   ├── DealCard.tsx
│   │   │   │   └── DealDialog.tsx
│   │   │   ├── actions.ts
│   │   │   ├── queries.ts
│   │   │   ├── hooks.ts
│   │   │   ├── ordering.ts          # lógica de índice fracionário
│   │   │   └── schema.ts
│   │   ├── contracts/
│   │   ├── events/
│   │   ├── dashboard/
│   │   └── auth/
│   │
│   ├── components/
│   │   ├── ui/                      # shadcn (não editar à mão sem motivo)
│   │   └── layout/                  # Sidebar, Topbar, PageHeader, EmptyState
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts            # browser client
│   │   │   ├── server.ts            # server client (cookies)
│   │   │   ├── admin.ts             # service_role — SÓ em server, nunca importar no cliente
│   │   │   └── middleware.ts        # refresh de sessão
│   │   ├── auth.ts                  # requireUser(), requireOrg(), requireRole()
│   │   ├── format.ts                # moeda, data, CNPJ, telefone
│   │   ├── validators.ts            # validarCNPJ, validarCPF
│   │   └── utils.ts                 # cn()
│   │
│   ├── server/                      # lógica de negócio pura (sem React)
│   │   ├── clients.ts
│   │   ├── deals.ts
│   │   ├── contracts.ts
│   │   ├── events.ts
│   │   ├── dashboard.ts
│   │   └── activities.ts            # log()
│   │
│   ├── types/
│   │   └── database.ts              # GERADO: supabase gen types typescript
│   │
│   └── middleware.ts                # proteção de rota
└── tests/
    ├── unit/
    └── e2e/
```

---

## 6. Convenções (obrigatórias)

Estas regras existem para que o código gerado em sessões diferentes fique consistente.

### 6.1 Nomenclatura

- **Arquivos de componente:** `PascalCase.tsx`. Demais: `kebab-case.ts`.
- **Rotas em português** (`/clientes`, `/propostas`), **código em inglês** (`clients`, `deals`). Sem misturar dentro do mesmo arquivo.
- **Tabelas/colunas:** `snake_case`, plural para tabela, singular para coluna.
- **Server Actions:** verbo + entidade → `createClient`, `updateDeal`, `moveDeal`, `deleteContract`.
- **Hooks:** `useClients` (lista), `useClient(id)` (um), `useCreateClient` (mutation).

### 6.2 Dinheiro

Sempre `bigint` em **centavos** no banco (`value_cents`). Nunca `float`. Formatação só na borda de UI, via `formatCurrency()` em `lib/format.ts`.

### 6.3 Datas

- Banco: `timestamptz` sempre.
- Aplicação: converter para `America/Sao_Paulo` só na renderização, com `date-fns-tz`.
- Campos que são só data (vigência de contrato): `date`, sem timezone.

### 6.4 Toda Server Action segue este esqueleto

```ts
// src/features/clients/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { requireOrg } from '@/lib/auth';
import { clientSchema } from './schema';
import * as clientsService from '@/server/clients';

export async function createClient(input: unknown) {
  // 1. autenticação + org
  const { supabase, user, orgId } = await requireOrg();

  // 2. validação (mesmo schema do formulário)
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  // 3. regra de negócio fica no service, não aqui
  const result = await clientsService.create(supabase, {
    ...parsed.data,
    orgId,
    createdBy: user.id,
  });

  if (!result.ok) return result;

  // 4. invalidação de cache
  revalidatePath('/clientes');
  return { ok: true as const, data: result.data };
}
```

**Nunca** retorne exception para o cliente. Sempre `{ ok: true, data }` ou `{ ok: false, errors }`.

### 6.5 Soft delete

`deleted_at` em `clients`, `deals`, `contracts`, `events`. Todas as queries de leitura filtram `.is('deleted_at', null)`. Delete físico só por admin, em tela de configurações.

### 6.6 Multi-tenancy no código

Toda query passa por `requireOrg()`. Nunca escreva `supabase.from('clients').select()` sem `.eq('org_id', orgId)` — mesmo com RLS ativa. Cinto **e** suspensório.

---

## 7. Especificação dos módulos

### 7.1 Landing page — `/`

Pública, estática, um arquivo. Não é página de marketing elaborada — é a porta de entrada.

**Seções:**

1. **Hero** — nome do sistema, subtítulo de uma linha, botão "Entrar" → `/login`.
2. **O que o sistema faz** — 4 cards: Clientes, Pipeline, Contratos, Agenda. Ícone + título + 1 frase.
3. **Screenshot/mockup** do dashboard (pode ser um `<div>` estilizado no MVP).
4. **Footer** — nome da empresa, ano.

**Técnico:** Server Component puro, zero JS de estado. Se o usuário já tiver sessão, o botão vira "Ir para o dashboard".

---

### 7.2 Autenticação — `/login`

**Fluxo (magic link):**

```
/login → digita e-mail → Supabase envia link → clica no e-mail
      → /auth/callback (troca code por sessão) → /dashboard
```

**Regras:**

- Restringir domínio: se `email.split('@')[1] !== 'suaempresa.com.br'`, recusar antes de chamar o Supabase. (Ajuste ou remova conforme o caso.)
- Usuário sem `membership` cai em `/sem-acesso` com mensagem para pedir convite ao admin.
- Rate limit: máximo 3 magic links por e-mail a cada 15 min (o Supabase já limita; adicione feedback na UI).

**Middleware** (`src/middleware.ts`):

```ts
import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC = ['/', '/login', '/auth'];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(p + '/'));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }
  if (user && path === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp)$).*)'],
};
```

---

### 7.3 Shell do app — `(app)/layout.tsx`

**Sidebar fixa (colapsável em <1024px):**

| Ícone | Label | Rota |
|---|---|---|
| `LayoutDashboard` | Dashboard | `/dashboard` |
| `Users` | Clientes | `/clientes` |
| `KanbanSquare` | Propostas | `/propostas` |
| `FileText` | Contratos | `/contratos` |
| `CalendarDays` | Agenda | `/agenda` |
| `Settings` | Configurações | `/configuracoes` |

**Topbar:** breadcrumb + busca global (`⌘K`, `cmdk`) + avatar com dropdown (perfil, sair).

---

### 7.4 Dashboard — `/dashboard`

Você pediu para eu definir as métricas. Estas são as que respondem às perguntas que um gestor comercial realmente faz.

#### Linha 1 — KPIs (4 cards, com comparação vs. período anterior)

| KPI | Cálculo | Pergunta que responde |
|---|---|---|
| **Receita ganha no período** | `sum(value_cents)` de deals com `status='won'` e `closed_at` no período | Quanto entrou? |
| **Pipeline aberto** | `sum(value_cents)` de deals `status='open'` | Quanto está em jogo? |
| **Taxa de conversão** | `won / (won + lost)` no período | Estamos fechando? |
| **Novos clientes** | `count(clients)` com `created_at` no período | A base está crescendo? |

Cada card mostra valor, delta % vs. período anterior e seta de tendência.

#### Linha 2 — Gráficos

- **Funil por etapa** (barras horizontais): contagem **e** valor total de deals abertos por `pipeline_stage`. Mostra onde as propostas empacam.
- **Receita ganha por mês** (linha, últimos 12 meses): tendência.

#### Linha 3 — Listas acionáveis (o que mais importa no dia a dia)

- **Próximas reuniões** (7 dias) — de `events`, com link para o cliente.
- **Propostas paradas** — deals `open` com `updated_at` > 14 dias. **Este é o widget mais valioso do dashboard.**
- **Contratos vencendo** — `end_date` nos próximos 60 dias, status `active`.
- **Atividade recente** — últimos 15 registros de `activities`.

#### Filtros globais

Seletor de período no topo: Hoje / 7d / 30d / Trimestre / Ano / Customizado. Padrão: **30 dias**. Persistir em query string (`?from=…&to=…`) para o link ser compartilhável.

#### Técnico

Criar **uma RPC no Postgres** que devolve todos os KPIs em uma chamada — evita 8 round-trips.

```sql
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
```

---

### 7.5 Clientes — `/clientes`

#### Lista

- **Tabela** (TanStack Table) com colunas: Nome / Documento / Contato / Status / Responsável / Criado em / Ações.
- **Busca** por nome, documento ou e-mail — usa `pg_trgm`, debounce 300ms.
- **Filtros:** status, responsável, tags, período de criação.
- **Ordenação** por qualquer coluna, **paginação** server-side de 25 em 25.
- **Ações em linha:** ver, editar, nova proposta, excluir (soft).
- **Empty state** com CTA "Cadastrar primeiro cliente".
- Exportar CSV (client-side, MVP).

#### Formulário (`/clientes/novo` e edição em Sheet lateral)

Campos organizados em 4 seções:

**Identificação**
- Tipo: PJ / PF (radio) → alterna a máscara do documento
- Nome / Razão social * (obrigatório)
- Nome fantasia
- CNPJ / CPF — máscara + **validação de dígito verificador** (`lib/validators.ts`)
- Status: Lead / Ativo / Inativo / Churned

**Contato**
- E-mail (validado)
- Telefone (máscara `(00) 0000-0000` / `(00) 00000-0000`)
- WhatsApp
- Site

**Endereço**
- CEP → **autopreenche** rua/bairro/cidade/UF via BrasilAPI (`https://brasilapi.com.br/api/cep/v2/{cep}`), chamada no servidor
- Rua, Número, Complemento, Bairro, Cidade, UF

**Comercial**
- Segmento
- Origem (select: Indicação, Site, Evento, Prospecção ativa, Redes sociais, Outro)
- Responsável (select de membros da org)
- Tags (input multi)
- **Observações** (textarea grande)

**Validações críticas:**
- Documento único por org (constraint no banco + mensagem amigável no catch do erro `23505`)
- Ao digitar um CNPJ já cadastrado, avisar **antes** de salvar (check assíncrono)

#### Detalhe — `/clientes/[id]`

Layout de 2 colunas:

- **Esquerda (2/3):** abas
  - *Visão geral* — dados cadastrais, edição inline
  - *Propostas* — deals do cliente com stage atual e valor
  - *Contratos* — lista de contratos vinculados
  - *Agenda* — eventos futuros e passados
  - *Timeline* — `activities` do cliente, cronológico reverso
- **Direita (1/3):** card fixo com resumo (valor total ganho, nº de propostas abertas, próxima reunião, responsável) + botões de ação rápida (Nova proposta, Agendar reunião, Novo contrato).

---

### 7.6 Propostas / Kanban — `/propostas`

O módulo mais complexo. Leia esta seção inteira antes de codar.

#### Comportamento

- Colunas = `pipeline_stages`, ordenadas por `position`.
- Cards = `deals` daquele stage, ordenados por `position`.
- **Arrastar card:** dentro da mesma coluna (reordenar) e entre colunas (mudar `stage_id`).
- **Arrastar coluna:** reordenar horizontalmente. Ambos com `@dnd-kit`.
- Header da coluna: nome, contagem, **soma dos valores**, cor, menu (renomear, cor, WIP limit, excluir).
- Card mostra: título, nome do cliente, valor formatado, avatar do responsável, data prevista de fechamento (vermelha se atrasada), tags.
- Botão `+` no topo de cada coluna → cria deal já naquele stage.
- Clicar no card → **Dialog** de detalhe (não muda de página, não perde o scroll do board).
- Soltar em coluna com `is_won` → seta `status='won'`, `closed_at=now()`. Em `is_lost` → abre modal pedindo `lost_reason`.
- Filtros no topo: responsável, cliente, tag, faixa de valor, "só atrasados".
- Board rola horizontalmente; cada coluna rola verticalmente de forma independente.

#### Ordenação — índice fracionário

`src/features/deals/ordering.ts`:

```ts
import { generateKeyBetween } from 'fractional-indexing';

/**
 * Calcula a nova position de um item movido para o índice `toIndex`
 * de uma lista `items` (já ordenada) da coluna de destino.
 * O próprio item movido deve ser removido da lista antes de chamar.
 */
export function positionForIndex(
  items: Array<{ id: string; position: string }>,
  toIndex: number,
): string {
  const prev = items[toIndex - 1]?.position ?? null;
  const next = items[toIndex]?.position ?? null;
  return generateKeyBetween(prev, next);
}
```

Mover um card = **um** UPDATE:

```ts
await supabase
  .from('deals')
  .update({ stage_id: toStageId, position: newPosition })
  .eq('id', dealId)
  .eq('org_id', orgId);
```

Mesma função serve para reordenar colunas (`pipeline_stages.position`).

#### Estrutura de componentes

```tsx
// KanbanBoard.tsx (client component) — esqueleto
'use client';

import { DndContext, DragOverlay, PointerSensor, KeyboardSensor,
         useSensor, useSensors, closestCorners, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy,
         verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';

export function KanbanBoard({ pipelineId }: { pipelineId: string }) {
  const { data: board } = useBoard(pipelineId);          // TanStack Query
  const moveDeal = useMoveDeal();                        // mutation otimista
  const moveStage = useMoveStage();
  const [activeItem, setActiveItem] = useState<Active | null>(null);

  const sensors = useSensors(
    // distância de 8px evita que um clique simples vire drag
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),                           // acessibilidade
  );

  function handleDragEnd(e: DragEndEvent) {
    const type = e.active.data.current?.type;            // 'deal' | 'stage'
    if (type === 'stage') { /* reordena colunas */ }
    else                  { /* move card: calcula stage destino + position */ }
    setActiveItem(null);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners}
                onDragStart={/* … */} onDragEnd={handleDragEnd}>
      {/* colunas arrastáveis na horizontal */}
      <SortableContext items={board.stages.map(s => s.id)}
                       strategy={horizontalListSortingStrategy}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {board.stages.map(stage => (
            <KanbanColumn key={stage.id} stage={stage} deals={board.dealsByStage[stage.id]} />
          ))}
        </div>
      </SortableContext>

      {/* preview flutuante enquanto arrasta */}
      <DragOverlay>{activeItem && <DragPreview item={activeItem} />}</DragOverlay>
    </DndContext>
  );
}
```

Dentro de `KanbanColumn`, os cards ficam em um `SortableContext` com `verticalListSortingStrategy`.

#### Regras não-óbvias do drag & drop (onde a maioria das implementações erra)

1. **`activationConstraint: { distance: 8 }`** — sem isso, clicar no card para abrir o detalhe dispara um drag fantasma.
2. **`data.current.type`** — cada draggable declara se é `'deal'` ou `'stage'`. Sem isso, o `handleDragEnd` não sabe o que fazer.
3. **`closestCorners`**, não `closestCenter` — em listas verticais de altura variável, `closestCenter` erra o alvo.
4. **Update otimista obrigatório.** O card move na hora; se a mutation falhar, faz rollback e mostra toast. Esperar o round-trip torna o board inutilizável.
5. **Soltar em coluna vazia** — a coluna precisa de uma dropzone com altura mínima (`min-h-[120px]`), senão não há alvo de colisão.
6. **Recalcular `position` no cliente, não no servidor.** O servidor só persiste o valor. Isso torna a UI instantânea.
7. **`DragOverlay`** em vez de mover o elemento original — evita reflow e mantém o cursor colado no card.
8. **Acessibilidade:** `KeyboardSensor` + `announcements` do dnd-kit. É de graça, faça.

#### Mutation otimista (padrão TanStack Query)

```ts
export function useMoveDeal(pipelineId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: moveDealAction,
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ['board', pipelineId] });
      const prev = qc.getQueryData(['board', pipelineId]);
      qc.setQueryData(['board', pipelineId], (old) => applyMove(old, vars));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(['board', pipelineId], ctx?.prev);   // rollback
      toast.error('Não foi possível mover. Tente de novo.');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['board', pipelineId] }),
  });
}
```

#### Detalhe da proposta (Dialog)

Campos: título, cliente (combobox com busca), valor, moeda, probabilidade (slider), responsável, data prevista, descrição, tags. Abas: *Detalhes* / *Atividades* / *Contratos vinculados*. Rodapé: "Marcar como ganha" / "Marcar como perdida".

---

### 7.7 Contratos — `/contratos`

Sistema de controle e arquivo. Não é editor de contrato.

#### Lista

- **Toggle grade/tabela.** Grade = cards com ícone do tipo de arquivo, título, cliente, status (badge colorido), vigência.
- Filtros: status, cliente, período de vigência, tag.
- Busca por título e número (`pg_trgm`).
- **Destaque visual** para contratos vencendo em <30 dias (badge âmbar) e vencidos (vermelho).

#### Cadastro (`/contratos/novo`)

- Título * / Número do contrato
- Cliente (combobox) / Proposta vinculada (opcional, filtrada pelo cliente escolhido)
- Status (draft → sent → signed → active → expired/cancelled)
- Valor / Moeda
- Vigência: início, fim / Data de assinatura
- Aviso de renovação (dias antes do vencimento)
- Tags
- **Anotações** (textarea grande — o "bloco de notas")
- **Upload do arquivo:** drag & drop, PDF/DOCX/imagem, máx 25 MB

#### Upload — fluxo correto

Não faça upload passando pelo servidor Next (limite de payload da Vercel e desperdício de banda). Use **signed upload URL**:

```
1. Cliente chama Server Action `createContractUploadUrl(contractId, fileName, mime)`
2. Servidor valida permissão e devolve signed upload URL do Supabase Storage
3. Browser envia o arquivo direto para o Storage (com progresso)
4. Cliente chama `confirmContractUpload(contractId, path, size, mime)`
5. Servidor grava file_path/file_name/file_size/file_mime e loga a activity
```

Caminho: `contracts/{org_id}/{contract_id}/{slug-do-nome}.pdf`

#### Visualização (`/contratos/[id]`)

- Servidor gera **signed URL válida por 60s** e passa para o viewer.
- PDF → `<iframe>` (ou `react-pdf` se quiser controle de zoom/página).
- DOCX → sem preview no browser; mostrar botão "Baixar" + ícone.
- Imagem → `<img>`.
- Painel lateral: metadados editáveis inline + anotações + histórico de mudanças de status.
- Botões: Baixar, Substituir arquivo, Excluir (soft), Duplicar.

#### Job de vencimento (Fase 4)

Vercel Cron diário → busca contratos com `end_date - renewal_notice_days <= today` e status `active` → cria `activity` + envia e-mail via Resend.

---

### 7.8 Agenda / Calendário — `/agenda`

Substituto interno do Google Calendar.

#### Visualizações

- **Mês** (padrão) — `dayGridMonth`
- **Semana** — `timeGridWeek`
- **Dia** — `timeGridDay`
- **Lista** — `listWeek`, útil no mobile

#### Interações

| Ação | Resultado |
|---|---|
| Clicar em um dia (vista mês) | Abre dialog de novo evento com a data preenchida |
| Selecionar faixa de horário (vista semana/dia) | Novo evento com início e fim preenchidos |
| Clicar em evento existente | Dialog de edição |
| Arrastar evento | Muda data/hora (`eventDrop` → update otimista) |
| Redimensionar evento | Muda duração (`eventResize`) |

#### Formulário de evento

- Título * / Tipo (Reunião, Ligação, Tarefa, Prazo, Outro) → define a cor padrão
- Data/hora início e fim / Checkbox "dia inteiro"
- Local ou link da chamada
- **Cliente vinculado** (combobox) — ao selecionar, sugere o título "Reunião — {cliente}"
- **Proposta vinculada** (opcional)
- Participantes internos (multi-select de membros)
- Descrição
- Recorrência: Não repete / Diária / Semanal / Mensal (gera `rrule` simples)

#### Painel lateral

- Filtro por tipo de evento (checkboxes com as cores)
- Filtro por responsável
- "Só meus eventos" (toggle)
- Lista dos próximos 5 eventos

#### Técnico

- Buscar eventos **apenas do range visível** (`datesSet` → refetch com `from`/`to`). Não carregue o ano inteiro.
- Timezone fixo `America/Sao_Paulo` no FullCalendar.
- Conflito de horário: ao salvar, avisar (não bloquear) se houver sobreposição com evento do mesmo responsável.
- Recorrência no MVP: expandir no cliente para o range visível. Não materialize ocorrências no banco.

---

### 7.9 Configurações — `/configuracoes`

- **Perfil** — nome, avatar (upload no bucket `avatars`)
- **Organização** — nome, logo, timezone, moeda (só `owner`/`admin`)
- **Equipe** — lista de membros, papel, convidar por e-mail, remover
- **Pipeline** — criar/renomear/reordenar/colorir stages, marcar stage como ganho/perdido, definir WIP limit

---

## 8. Segurança

| Item | Regra |
|---|---|
| RLS | Habilitada em **todas** as tabelas. Nenhuma exceção. |
| `service_role` key | Só em `src/lib/supabase/admin.ts`, com `import 'server-only'` no topo. Nunca em variável `NEXT_PUBLIC_*`. |
| Storage | Bucket `contracts` privado. Acesso só por signed URL de 60s gerada no servidor. |
| Validação | Zod na Server Action, sempre. Nunca confie no que veio do formulário. |
| SQL injection | Só query builder do Supabase ou RPC parametrizada. Nunca string concatenada. |
| Headers | CSP, `X-Frame-Options: DENY`, `Strict-Transport-Security` via `next.config.ts`. |
| Segredos | Vercel Environment Variables. `.env.local` no `.gitignore`. Zero segredo em commit. |
| LGPD | Dados de clientes são pessoais. `activities` serve de trilha de auditoria. Implementar exportação e exclusão sob demanda quando houver dado de PF. |
| Sessão | Cookies httpOnly gerenciados pelo `@supabase/ssr`. Refresh no middleware. |

---

## 9. Variáveis de ambiente

```bash
# .env.local.example
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # SERVIDOR APENAS
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ALLOWED_EMAIL_DOMAIN=suaempresa.com.br  # vazio = qualquer domínio
RESEND_API_KEY=                          # Fase 4
```

---

## 10. Deploy e ambientes

| Ambiente | Branch | Supabase | URL |
|---|---|---|---|
| Local | qualquer | projeto `dev` (ou `supabase start`) | localhost:3000 |
| Preview | PR | projeto `dev` | `*.vercel.app` |
| Produção | `main` | projeto `prod` | domínio próprio |

**Pipeline:**

1. Push → Vercel builda preview automaticamente
2. `main` → produção
3. Migrations via `supabase db push` (rodar **antes** do deploy que depende delas)
4. Regenerar tipos após migration: `supabase gen types typescript --project-id XXX > src/types/database.ts`

**Checklist antes do primeiro deploy de produção:**

- [ ] RLS habilitada e testada (tentar ler dado de outra org com anon key → deve retornar vazio)
- [ ] `service_role` key não aparece no bundle do cliente (`grep -r "service_role" .next/static`)
- [ ] Bucket `contracts` está privado
- [ ] Redirect URLs do Auth incluem o domínio de produção
- [ ] Backup automático do Supabase ativado
- [ ] Timezone da org configurado

---

## 11. Roadmap de execução (prompts para Claude Code)

Ordem importa. **Não pule fases.** Cada prompt deve caber em uma sessão e terminar com algo funcionando.

### Fase 0 — Fundação (dia 1)

```
1. Crie o projeto Next.js 15 com TypeScript, Tailwind, App Router e src/.
   Instale as dependências da §2 do ARQUITETURA.md. Configure shadcn/ui.
   Crie a estrutura de pastas exata da §5 (pastas vazias com .gitkeep).

2. Configure o Supabase: clients browser/server/admin em src/lib/supabase/,
   middleware de sessão e src/middleware.ts de proteção de rota (§7.2).

3. Rode as migrations 0001, 0002 e 0003 da §4. Depois gere src/types/database.ts.

4. Implemente src/lib/auth.ts com requireUser(), requireOrg() e requireRole(),
   e src/lib/format.ts (moeda em centavos, data pt-BR, CNPJ, CPF, telefone)
   e src/lib/validators.ts (validarCNPJ, validarCPF com dígito verificador).
```

### Fase 1 — Entrada (dia 2)

```
5. Construa a landing page pública em src/app/page.tsx conforme §7.1.
6. Construa /login com magic link, /auth/callback e /auth/sign-out conforme §7.2.
7. Construa o shell autenticado (app)/layout.tsx: sidebar, topbar, avatar dropdown (§7.3).
```

### Fase 2 — Núcleo (dias 3–6)

```
8.  Módulo Clientes — lista com tabela, busca, filtros e paginação server-side (§7.5).
9.  Módulo Clientes — formulário de cadastro/edição com validação de CNPJ/CPF
    e autopreenchimento de CEP via BrasilAPI.
10. Módulo Clientes — página de detalhe com abas e timeline.
11. Módulo Propostas — Kanban com dnd-kit: arrastar cards E colunas,
    índice fracionário e updates otimistas. Siga a §7.6 à risca,
    incluindo as 8 regras não-óbvias.
12. Módulo Propostas — dialog de detalhe do deal, criar/editar, ganhar/perder.
```

### Fase 3 — Complementos (dias 7–9)

```
13. Módulo Contratos — lista, cadastro e upload via signed URL (§7.7).
14. Módulo Contratos — viewer de PDF com signed URL e painel de anotações.
15. Módulo Agenda — FullCalendar com vistas mês/semana/dia,
    clique no dia, drag de evento e dialog de criação (§7.8).
16. Dashboard — RPC dashboard_summary, 4 KPIs, funil, gráfico de receita
    e as 4 listas acionáveis (§7.4).
```

### Fase 4 — Acabamento (dias 10–12)

```
17. Configurações: perfil, organização, equipe e editor de pipeline.
18. Busca global com ⌘K (cmdk) sobre clientes, propostas e contratos.
19. Loading states (skeletons), empty states e error boundaries em todas as rotas.
20. Testes e2e (Playwright): login, cadastrar cliente, mover card no Kanban.
21. Responsividade mobile: sidebar vira drawer, Kanban rola horizontal,
    tabelas viram cards.
```

### Backlog (depois de estar em uso)

- Notificações por e-mail (Resend) — reunião amanhã, contrato vencendo
- Sync bidirecional com Google Calendar
- Importação de clientes por CSV
- Relatórios exportáveis em PDF
- Campos customizados por org
- Assinatura eletrônica (Clicksign)
- Realtime no Kanban (Supabase Realtime) — só se mais de uma pessoa usar o board ao mesmo tempo

---

## 12. Quando esta arquitetura quebra

Sinais e o que fazer:

| Sintoma | Limite aproximado | Ação |
|---|---|---|
| Kanban lento ao carregar | >300 cards por coluna | Virtualização (`@tanstack/react-virtual`) + paginação por coluna |
| Lista de clientes lenta | >50k linhas | Paginação por cursor em vez de offset; índice composto |
| Dashboard demorando | >2s na RPC | Materialized view com refresh a cada 15 min |
| Storage caro | >100 GB | Mover arquivos frios para R2/S3 com lifecycle |
| Muitos usuários simultâneos | >100 conexões | Habilitar Supavisor (pooler) no Supabase |
| Server Actions insuficientes | Chegou app mobile ou integração | Expor `/api/v1/*` reusando `src/server/` |

Nenhum desses limites será atingido nos primeiros 2 anos com as premissas da §1. **Não otimize antes.**

---

## 13. Definição de pronto (por feature)

Uma feature só está pronta quando:

- [ ] Funciona no happy path
- [ ] Tem loading state (skeleton, não spinner genérico)
- [ ] Tem empty state com CTA
- [ ] Tem tratamento de erro com toast e mensagem em português
- [ ] Validação no cliente **e** na Server Action (mesmo schema Zod)
- [ ] RLS testada: usuário de outra org não vê o dado
- [ ] Funciona em 375px de largura
- [ ] Navegável por teclado
- [ ] Registra `activity` quando altera dado relevante
- [ ] Sem `any` no TypeScript e sem warning de lint
