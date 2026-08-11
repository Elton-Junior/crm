# ARQUITETURA — EXPANSÃO (Workspace estilo Bitrix24)

> Complemento do `ARQUITETURA.md`. Tudo que está lá continua valendo.
> Este documento cobre os 4 módulos novos: **Tarefas e Projetos**, **Drive**, **Chat** e **Automação**.
> Versão 1.0 — 10/08/2026

---

## 0. Leia isto antes de qualquer coisa

Este documento **não** substitui o `ARQUITETURA.md` — ele estende. As regras de RLS, dinheiro em centavos, soft delete, estrutura por feature e convenções de Server Action continuam idênticas.

**Duas mudanças no documento original que este arquivo impõe:**

1. A premissa **P3** ("não há billing") continua. Mas a premissa implícita de "MVP enxuto em 12 dias" **morreu**. Ver §1.
2. A tabela `contracts` será **refatorada** para usar o primitivo `files` (§3.1). Faça isso **antes de subir qualquer contrato real** — depois fica caro.

---

## 1. Conversa honesta sobre custo

Você pediu paridade funcional com o Bitrix24 e marcou os 4 módulos. Antes do "como", o "quanto".

### Estimativa realista (1 pessoa + Claude Code, em dias úteis)

| Módulo | Dias | Risco | Comentário |
|---|---|---|---|
| CRM base (já planejado) | 12 | Baixo | Dashboard, Clientes, Kanban, Contratos, Agenda |
| **Tarefas e Projetos** | 6 | Baixo | Reaproveita ~70% da máquina do Kanban de propostas |
| **Drive / Documentos** | 5 | Médio | Árvore de pastas, upload, permissões, preview |
| **Automação e gatilhos** | 8 | **Alto** | O motor é fácil; a UI de montar regra é um produto em si |
| **Chat interno** | 10 | **Alto** | Realtime, presença, não-lidas, notificações, histórico |
| **Total** | **~41 dias úteis** | | ≈ 2 meses em tempo integral, 4–5 meses em meio período |

### O que eu recomendo cortar (e por quê)

**Chat interno é o pior investimento dos quatro.** Custa mais que Tarefas + Drive somados, e você está competindo com o WhatsApp que sua equipe de 20 pessoas já usa e não vai abandonar. Chat que ninguém usa é pior que chat nenhum: vira mais um lugar onde a informação some.

**A alternativa que entrega 80% do valor por 15% do custo:** comentários com @menção nas entidades (cliente, proposta, tarefa, contrato) + notificações. Isso resolve o problema real — *"onde está a conversa sobre este cliente?"* — que o WhatsApp não resolve. E é o primitivo `comments` da §3.2, que você vai construir de qualquer jeito porque Tarefas precisa dele.

**Minha proposta:** construa `comments` + `notifications` primeiro. Use por 2 meses. Se ainda sentir falta de chat de verdade, o §6 está aqui e o schema já suporta. Se não sentir, você economizou 10 dias.

**Automação:** o motor de regras é barato. O que é caro é o construtor visual de regras ("quando... se... então..."). Comece com **regras fixas em código** (§7.2) — cobre 90% dos casos reais de um CRM de 20 pessoas — e só construa o builder visual se alguém realmente pedir para criar uma regra que você não previu.

### Ordem de execução recomendada

```
1. CRM base (Fases 0–4 do ARQUITETURA.md)      ← termine isto primeiro, sem desvio
2. Primitivos compartilhados (§3)               ← 3 dias, destrava tudo
3. Tarefas e Projetos (§4)
4. Drive (§5)
5. Automação com regras fixas (§7)
6. [reavaliar] Chat (§6) ou parar em comentários
```

**Não pule o passo 2.** Se você construir Tarefas antes dos primitivos, vai duplicar upload de arquivo, comentário e notificação — e depois vai ter que refatorar três lugares.

---

## 2. O princípio que sustenta a expansão

O Bitrix24 parece 15 produtos, mas por baixo são ~6 primitivos recombinados:

| Primitivo | Aparece em |
|---|---|
| **Board** (colunas + cards ordenados) | Pipeline de vendas, tarefas, suporte |
| **File** (arquivo + metadados + permissão) | Contratos, drive, anexos de tarefa, anexos de chat |
| **Comment** (thread + menção) | Cliente, proposta, tarefa, documento |
| **Notification** (evento → usuário) | Todos |
| **Event** (agenda) | Reuniões, prazos de tarefa, vencimento de contrato |
| **Automation** (gatilho → ação) | Todos |

**A regra:** antes de criar uma feature nova, pergunte qual primitivo ela é. Se for um que já existe, **reutilize** — não crie uma segunda implementação.

### O Board genérico — a decisão mais importante deste documento

Você já tem um Kanban de propostas. Tarefas precisa de outro. **Não faça dois.**

**Decisão:** separar **domínio** de **apresentação**.

- Tabelas continuam separadas: `deals` e `tasks`. Elas divergem muito (deal tem valor/probabilidade/cliente; task tem responsável/prazo/checklist/subtarefa). Forçar uma tabela polimórfica única gera FK fraca, tipagem ruim e `if (type === ...)` espalhado.
- **Componente é um só:** `<KanbanBoard<T>>` genérico, em `src/components/kanban/`, parametrizado por adapter.

```ts
// src/components/kanban/types.ts
export interface KanbanAdapter<T> {
  getId: (item: T) => string;
  getColumnId: (item: T) => string;
  getPosition: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  onMove: (itemId: string, toColumnId: string, newPosition: string) => Promise<void>;
  onColumnMove: (columnId: string, newPosition: string) => Promise<void>;
}
```

`deals` e `tasks` implementam o adapter. Toda a lógica de dnd-kit, índice fracionário, `DragOverlay`, update otimista e as 8 regras não-óbvias da §7.6 do ARQUITETURA.md ficam **em um lugar só**.

> **Refatoração:** o Kanban de propostas provavelmente já vai ter sido construído quando você chegar aqui. Extraia o genérico a partir dele — não reescreva do zero. Testes e2e do Kanban de propostas continuam passando = extração correta.

---

## 3. Primitivos compartilhados (construir primeiro)

### 3.1 `files` — arquivo como cidadão de primeira classe

Hoje `contracts` guarda `file_path`, `file_name`, `file_size`, `file_mime` inline. Isso não escala para 4 módulos que anexam arquivo.

**Refatoração (faça agora, sem dados em produção):**

```sql
-- migration 0004, parte 1
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
  folder_id     uuid references folders(id) on delete set null,  -- null = anexo solto
  name          text not null,
  storage_path  text not null unique,      -- caminho real no bucket
  size          bigint not null,
  mime          text not null,
  checksum      text,                      -- sha256, para deduplicação futura
  version       int not null default 1,
  replaces_id   uuid references files(id) on delete set null,  -- versionamento
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index files_org_folder_idx on files (org_id, folder_id) where deleted_at is null;
create index files_name_trgm_idx on files using gin (name gin_trgm_ops);

-- anexo polimórfico: o mesmo arquivo pode estar em vários lugares
create table file_links (
  file_id     uuid not null references files(id) on delete cascade,
  entity_type text not null,   -- 'contract' | 'task' | 'deal' | 'client' | 'message' | 'comment'
  entity_id   uuid not null,
  created_at  timestamptz not null default now(),
  primary key (file_id, entity_type, entity_id)
);
create index file_links_entity_idx on file_links (entity_type, entity_id);

-- contracts passa a apontar para files
alter table contracts add column file_id uuid references files(id) on delete set null;
alter table contracts drop column file_path;
alter table contracts drop column file_name;
alter table contracts drop column file_size;
alter table contracts drop column file_mime;
```

**Bucket único:** renomeie o conceito de `contracts` para `files` no Storage. Caminho: `files/{org_id}/{yyyy}/{mm}/{file_id}-{slug}.ext`. Um bucket privado só, com a mesma policy de `storage.foldername(name)[1]::uuid`.

> **Por que particionar por ano/mês:** listagem de bucket com dezenas de milhares de objetos numa pasta só fica lenta no console do Supabase. Custo zero agora, evita dor depois.

O fluxo de upload por **signed URL** da §7.7 do ARQUITETURA.md continua idêntico — só muda o destino.

### 3.2 `comments` — conversa em qualquer entidade

```sql
create table comments (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  entity_type   text not null,   -- 'client' | 'deal' | 'task' | 'contract' | 'project' | 'file'
  entity_id     uuid not null,
  parent_id     uuid references comments(id) on delete cascade,  -- thread
  author_id     uuid not null references profiles(id) on delete cascade,
  body          text not null,
  mentions      uuid[] not null default '{}',   -- user_ids mencionados
  edited_at     timestamptz,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index comments_entity_idx on comments (entity_type, entity_id, created_at desc)
  where deleted_at is null;
create index comments_mentions_idx on comments using gin (mentions);
```

**UI:** um componente `<CommentThread entityType entityId />` reaproveitado em toda ficha. Editor simples (textarea + `@` autocomplete de membros), não rich text. Menção vira notificação.

### 3.3 `notifications` — o que faz o sistema parecer vivo

```sql
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
  url           text,                      -- para onde o clique leva
  actor_id      uuid references profiles(id) on delete set null,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index notifications_user_unread_idx on notifications (user_id, created_at desc)
  where read_at is null;
```

**RLS:** cada um só vê as suas → `using (user_id = auth.uid())`.

**UI:** sino na topbar com badge de não-lidas, dropdown com as 20 últimas, página `/notificacoes` com tudo. Contagem via Supabase Realtime na tabela `notifications` filtrada por `user_id`.

**Regra:** notificação é criada **pelo motor de automação** (§7), nunca espalhada por Server Actions. Isso mantém um lugar só para mudar quando você quiser adicionar e-mail ou push depois.

---

## 4. Módulo: Tarefas e Projetos

### 4.1 Schema

```sql
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
  client_id   uuid references clients(id) on delete set null,  -- projeto de cliente
  deal_id     uuid references deals(id) on delete set null,    -- nasceu de uma proposta ganha
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
  role        text not null default 'member',   -- 'manager' | 'member'
  primary key (project_id, user_id)
);

-- colunas do Kanban de tarefas (mesma mecânica de pipeline_stages)
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
  parent_id      uuid references tasks(id) on delete cascade,   -- subtarefa

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
  estimate_min   int,                    -- estimativa em minutos
  spent_min      int not null default 0, -- somatório do time tracking

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
create index on task_checklist_items (task_id, position);

create table task_watchers (
  task_id   uuid not null references tasks(id) on delete cascade,
  user_id   uuid not null references profiles(id) on delete cascade,
  primary key (task_id, user_id)
);

-- apontamento de horas
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
```

### 4.2 Telas

| Rota | Conteúdo |
|---|---|
| `/projetos` | Grade de cards de projeto: nome, cliente, progresso (% de tarefas concluídas), prazo, membros (avatares empilhados), status |
| `/projetos/[id]` | Kanban de tarefas — **usa `<KanbanBoard>` genérico** |
| `/projetos/[id]?view=lista` | Tabela agrupável por responsável / prazo / prioridade |
| `/projetos/[id]?view=gantt` | Timeline. **Deixe por último** — é a parte mais cara e a menos usada |
| `/tarefas` | "Minhas tarefas" entre todos os projetos: Atrasadas / Hoje / Semana / Depois |

### 4.3 Detalhe da tarefa (Dialog)

Título · descrição · responsável · prazo · prioridade · projeto/coluna · checklist com barra de progresso · subtarefas · anexos (`file_links`) · **comentários** (`<CommentThread entityType="task">`) · apontamento de horas · observadores.

### 4.4 Integrações com o CRM (é isto que justifica ser o mesmo sistema)

- Proposta marcada como **ganha** → oferecer "Criar projeto a partir desta proposta", já com cliente e valor vinculados.
- Tarefa com `due_on` aparece **na Agenda** (§7.8 do ARQUITETURA.md) como evento do tipo `deadline`. Não duplique em `events` — a query do calendário faz `union all` entre `events` e `tasks` com prazo.
- Ficha do cliente ganha aba **Projetos**.
- Dashboard ganha o card "Minhas tarefas atrasadas".

---

## 5. Módulo: Drive / Documentos

### 5.1 Escopo — o que fazer e o que não fazer

**Fazer:** árvore de pastas, upload (drag & drop, múltiplo, com progresso), preview de PDF e imagem, download, mover/renomear, lixeira, busca por nome, versionamento simples, link compartilhável interno.

**Não fazer:** edição colaborativa de documento online. Isso é o Google Docs — meses de trabalho e um problema resolvido (CRDT, OT) que você não quer resolver. Se precisar editar, o usuário baixa, edita e sobe nova versão (o campo `replaces_id` já suporta).

### 5.2 Árvore de pastas — query

Caminho completo com CTE recursiva (não guarde `path` denormalizado; renomear pasta invalidaria tudo):

```sql
create or replace function folder_path(p_folder uuid)
returns text
language sql stable as $$
  with recursive up as (
    select id, parent_id, name from folders where id = p_folder
    union all
    select f.id, f.parent_id, f.name from folders f join up on f.id = up.parent_id
  )
  select string_agg(name, ' / ' order by depth desc)
  from (select name, row_number() over () as depth from up) t;
$$;
```

Para a sidebar da árvore, carregue **um nível por vez** (lazy). Carregar a árvore inteira de uma vez só funciona até ~500 pastas.

### 5.3 Permissões

MVP: **tudo visível para toda a org** (RLS por `org_id`), exceto uma pasta especial "Privado" por usuário. Permissão por pasta é uma feature que parece simples e não é — deixe no backlog até alguém pedir com um caso concreto.

### 5.4 Telas

| Rota | Conteúdo |
|---|---|
| `/drive` | Árvore à esquerda, grade/lista à direita, breadcrumb, botão Upload, busca |
| `/drive/[folderId]` | Mesma tela, pasta aberta |
| Dialog de preview | PDF em iframe, imagem inline, resto = ícone + download |

Reaproveite o viewer que você já construiu em `/contratos/[id]` — extraia para `src/components/file-viewer/`.

---

## 6. Módulo: Chat interno *(recomendo adiar — leia a §1 antes)*

### 6.1 Schema

```sql
create type channel_kind as enum ('public','private','dm');

create table channels (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  kind        channel_kind not null default 'public',
  name        text,                    -- null em DM
  topic       text,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  archived_at timestamptz
);
create index channels_org_idx on channels (org_id) where archived_at is null;

create table channel_members (
  channel_id    uuid not null references channels(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  last_read_at  timestamptz not null default now(),
  muted         boolean not null default false,
  joined_at     timestamptz not null default now(),
  primary key (channel_id, user_id)
);
create index channel_members_user_idx on channel_members (user_id);

create table messages (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  channel_id   uuid not null references channels(id) on delete cascade,
  author_id    uuid not null references profiles(id) on delete cascade,
  body         text not null,
  reply_to_id  uuid references messages(id) on delete set null,
  mentions     uuid[] not null default '{}',
  edited_at    timestamptz,
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index messages_channel_created_idx on messages (channel_id, created_at desc)
  where deleted_at is null;

create table message_reactions (
  message_id  uuid not null references messages(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  emoji       text not null,
  primary key (message_id, user_id, emoji)
);
```

### 6.2 Realtime

Supabase Realtime, canal por `channel_id`:

```ts
supabase
  .channel(`chat:${channelId}`)
  .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages',
        filter: `channel_id=eq.${channelId}` },
      (payload) => appendMessage(payload.new))
  .subscribe();
```

**Cuidados que quebram chat na prática:**

1. **RLS vale para Realtime.** Se a policy de `messages` estiver errada, o usuário recebe evento de canal que não pode ver. Teste isso explicitamente.
2. **Paginação por cursor** (`created_at < X`), nunca offset. Scroll infinito para cima.
3. **Não-lidas** = `count(*) where created_at > channel_members.last_read_at`. Atualize `last_read_at` com debounce, não a cada scroll.
4. **Mensagem otimista** com `id` temporário no cliente; reconcilie pelo `id` real no INSERT que voltar.
5. **Presença** (`supabase.channel().track()`) é o recurso mais caro em conexões e o menos valioso. Deixe por último ou nunca.
6. **Limite de conexões Realtime** do plano Supabase — 20 usuários com várias abas abertas consomem mais do que parece. Confira o plano antes.

### 6.3 A versão barata (recomendada)

Se optar por não construir chat: `<CommentThread>` (§3.2) nas fichas de cliente, proposta, tarefa e contrato + notificação de menção. **1 dia de trabalho em vez de 10**, e resolve o caso de uso que importa.

---

## 7. Módulo: Automação e gatilhos

### 7.1 Arquitetura do motor

Três peças, desacopladas:

```
[ trigger no Postgres ]  →  [ tabela outbox ]  →  [ worker ]  →  [ ações ]
   (INSERT/UPDATE)           (fila durável)       (cron 1min)    (notif, task, e-mail…)
```

**Por que outbox e não chamar direto:** se a ação falhar (e-mail fora do ar), o evento não some. Reprocessa. Sem Redis, sem fila externa — é uma tabela.

```sql
create type outbox_status as enum ('pending','processing','done','failed');

create table outbox_events (
  id            bigserial primary key,
  org_id        uuid not null references organizations(id) on delete cascade,
  event_type    text not null,       -- 'deal.stage_changed' | 'task.assigned' | ...
  entity_type   text not null,
  entity_id     uuid not null,
  payload       jsonb not null default '{}',
  actor_id      uuid,
  status        outbox_status not null default 'pending',
  attempts      int not null default 0,
  last_error    text,
  available_at  timestamptz not null default now(),  -- backoff
  created_at    timestamptz not null default now()
);
create index outbox_pending_idx on outbox_events (status, available_at)
  where status in ('pending','failed');

create table automation_rules (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  name          text not null,
  enabled       boolean not null default true,
  event_type    text not null,
  conditions    jsonb not null default '[]',   -- [{field, op, value}]
  actions       jsonb not null default '[]',   -- [{type, params}]
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index automation_rules_event_idx on automation_rules (org_id, event_type)
  where enabled;

create table automation_runs (
  id          bigserial primary key,
  rule_id     uuid references automation_rules(id) on delete cascade,
  event_id    bigint references outbox_events(id) on delete cascade,
  status      text not null,        -- 'ok' | 'error' | 'skipped'
  error       text,
  created_at  timestamptz not null default now()
);
```

Trigger que alimenta a outbox:

```sql
create or replace function emit_deal_stage_changed() returns trigger
language plpgsql as $$
begin
  if new.stage_id is distinct from old.stage_id then
    insert into outbox_events (org_id, event_type, entity_type, entity_id, payload)
    values (new.org_id, 'deal.stage_changed', 'deal', new.id,
            jsonb_build_object('from', old.stage_id, 'to', new.stage_id,
                               'value_cents', new.value_cents,
                               'client_id', new.client_id));
  end if;
  return new;
end;
$$;

create trigger deals_emit_stage_changed
  after update on deals
  for each row execute function emit_deal_stage_changed();
```

**Worker:** Vercel Cron a cada minuto → Route Handler `/api/cron/automation` que faz `select ... for update skip locked limit 50`, executa e marca. O `skip locked` evita processamento duplicado se duas execuções se sobrepuserem.

```
// vercel.json
{ "crons": [{ "path": "/api/cron/automation", "schedule": "* * * * *" }] }
```

Proteja a rota com um `CRON_SECRET` no header — senão qualquer um dispara seu worker.

### 7.2 Comece com regras fixas em código

Antes de qualquer UI de construtor de regras, implemente estas em TypeScript. Elas cobrem quase tudo que um CRM de 20 pessoas precisa:

| Gatilho | Ação |
|---|---|
| Proposta muda de etapa | Notificar o responsável |
| Proposta entra em "Reunião agendada" | Criar tarefa "Agendar reunião com {cliente}" |
| Proposta marcada como ganha | Notificar a org + oferecer criação de projeto |
| Proposta aberta parada há 14 dias | Notificar o responsável (roda no cron diário) |
| Tarefa atribuída a alguém | Notificar o responsável |
| Tarefa vence em 24h | Notificar responsável e observadores |
| Contrato vence em N dias | Notificar o dono do contrato |
| Evento começa em 15 min | Notificar os participantes |
| Alguém é mencionado em comentário | Notificar o mencionado |

Cada uma é uma função `(event: OutboxEvent) => Promise<void>` num registry:

```ts
// src/server/automation/handlers.ts
export const handlers: Record<string, Handler[]> = {
  'deal.stage_changed': [notifyOwner, createMeetingTaskIfStageIsMeeting],
  'deal.won':           [notifyOrg, suggestProjectCreation],
  'task.assigned':      [notifyAssignee],
  'comment.mentioned':  [notifyMentioned],
  // ...
};
```

**Só depois** — se e quando alguém pedir uma regra que você não previu — construa a UI que grava em `automation_rules`. Aí o executor genérico interpreta `conditions`/`actions` em JSONB. O schema já está pronto para isso; a decisão é só *quando* investir na UI.

---

## 8. Design system estilo Bitrix24

Você mencionou querer a cara do Bitrix24. Isso é **paralelo e barato** — não confunda com o escopo funcional.

### 8.1 O que caracteriza o visual deles

| Traço | Como reproduzir |
|---|---|
| Azul corporativo saturado como cor primária | Token `--primary` num azul ~`#2066b0`; usar com parcimônia (botões primários, item ativo da sidebar) |
| **Densidade alta** — muita informação por tela | `--spacing` compacto, linhas de tabela de 36–40px, fonte base 13–14px |
| Sidebar escura à esquerda, sempre visível, ícone + label | Já previsto na §7.3 do ARQUITETURA.md; escurecer e compactar |
| Cards brancos com sombra sutil sobre fundo cinza-azulado | `--background: #eef2f6`, `--card: #ffffff`, sombra `0 1px 2px rgba(0,0,0,.06)` |
| Cantos pouco arredondados | `--radius: 4px` (o padrão do shadcn é bem mais redondo) |
| Badges e chips coloridos por status em toda parte | Componente `<StatusBadge>` com mapa status → cor, usado em cliente, proposta, tarefa, contrato |
| Topbar com busca central e ações à direita | Já previsto |

### 8.2 Como aplicar

Tudo isso vive em **tokens CSS**, não espalhado em classes:

```css
/* src/app/globals.css */
:root {
  --radius: 0.25rem;
  --background: 210 25% 96%;
  --card: 0 0% 100%;
  --primary: 210 69% 41%;
  --sidebar-background: 214 30% 18%;
  --sidebar-foreground: 210 20% 92%;
}
```

Mudar a "cara" do sistema inteiro passa a ser mexer em ~10 variáveis. Se um dia quiser outra identidade, é meia hora de trabalho.

### 8.3 Limite

Inspire-se no **layout e nas convenções de UX** — isso é vocabulário comum de software B2B, ninguém é dono. Não copie logo, nome, textos de marketing nem os screenshots do site deles. Além do risco jurídico, é sinal de produto sem identidade — e este é o sistema da **sua** empresa.

### 8.4 Landing page

Se quiser o formato da landing do Bitrix24, a estrutura é: hero com abas que trocam a lista de recursos e o screenshot · faixa de prova social · bloco "por que somos melhores" · calculadora de preço · carrossel de soluções por área · depoimentos · CTA final.

**Para um sistema interno, isso é excesso.** Ninguém precisa ser convencido a usar — eles são obrigados. Mantenha a landing da §7.1 do ARQUITETURA.md: hero, 4 cards de módulo, screenshot, botão Entrar. Invista o tempo economizado no app.

---

## 9. RLS das novas tabelas

Mesmo padrão do `0002_rls.sql`. Adicione ao final da migration 0004:

```sql
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
alter table channels            enable row level security;
alter table channel_members     enable row level security;
alter table messages            enable row level security;
alter table message_reactions   enable row level security;
alter table outbox_events       enable row level security;
alter table automation_rules    enable row level security;
alter table automation_runs     enable row level security;

-- padrão por org (mesmo loop do 0002)
do $$
declare t text;
begin
  foreach t in array array[
    'folders','files','comments','projects','task_columns','tasks',
    'time_entries','channels','automation_rules'
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

-- notificações: cada um vê só as suas
create policy notifications_select on notifications
  for select using (user_id = auth.uid());
create policy notifications_update on notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- mensagens: só de canais dos quais o usuário é membro
create policy messages_select on messages
  for select using (
    exists (select 1 from channel_members cm
            where cm.channel_id = messages.channel_id and cm.user_id = auth.uid())
  );
create policy messages_insert on messages
  for insert with check (
    author_id = auth.uid()
    and exists (select 1 from channel_members cm
                where cm.channel_id = messages.channel_id and cm.user_id = auth.uid())
  );
create policy messages_update_own on messages
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

-- outbox e runs: só leitura para admin; escrita só via service_role no worker
create policy outbox_select on outbox_events
  for select using (public.user_role_in(org_id) in ('owner','admin'));
create policy automation_runs_select on automation_runs
  for select using (
    exists (select 1 from automation_rules r
            where r.id = rule_id and public.user_role_in(r.org_id) in ('owner','admin'))
  );
```

> **Atenção:** o worker de automação roda com `service_role`, que **ignora RLS**. Ele precisa filtrar `org_id` manualmente em toda query. Este é o único lugar do sistema sem a rede de proteção — revise com cuidado extra.

---

## 10. Impacto no que já existe

| Área | Mudança |
|---|---|
| **Sidebar** | Ganha Projetos, Tarefas, Drive (e Chat, se construir). Com 9 itens, agrupe: *Vendas* (Dashboard, Clientes, Propostas, Contratos) · *Trabalho* (Projetos, Tarefas, Agenda) · *Arquivos* (Drive) |
| **Topbar** | Ganha o sino de notificações |
| **Busca ⌘K** | Passa a cobrir tarefas, projetos e arquivos além de clientes/propostas/contratos |
| **Dashboard** | +2 cards: "Minhas tarefas atrasadas" e "Horas apontadas na semana" |
| **Ficha do cliente** | +aba Projetos |
| **Agenda** | Passa a mostrar prazos de tarefa junto com eventos (`union all`, sem duplicar dados) |
| **`contracts`** | Refatorado para usar `files` (§3.1) — **faça antes de ter dados** |
| **Kanban** | Extraído para componente genérico (§2) |

---

## 11. Roadmap de prompts (continua o §11 do ARQUITETURA.md)

### Fase 5 — Primitivos (3 dias)

```
22. Rode a migration 0004 (§3, §4, §9 do ARQUITETURA-EXPANSAO.md).
    Refatore contracts para usar files: remova as colunas file_*, adicione file_id.
    Ajuste o módulo de contratos para o novo modelo. Regenere os tipos.
23. Extraia o Kanban de propostas para um componente genérico
    src/components/kanban/ com o KanbanAdapter da §2.
    Reescreva o board de propostas usando o genérico — os testes e2e
    existentes devem continuar passando sem alteração.
24. Implemente o primitivo <CommentThread entityType entityId /> em
    src/features/comments/ e plugue nas fichas de cliente, proposta e contrato.
25. Implemente notificações: tabela, sino na topbar com Realtime,
    dropdown, página /notificacoes e marcar como lida.
```

### Fase 6 — Tarefas e Projetos (6 dias)

```
26. /projetos — lista em grade com progresso, filtros e CRUD de projeto.
27. /projetos/[id] — Kanban de tarefas usando o componente genérico.
28. Dialog de detalhe da tarefa: checklist, subtarefas, anexos,
    comentários, observadores e apontamento de horas.
29. /tarefas — "Minhas tarefas" agrupadas por Atrasadas/Hoje/Semana/Depois.
30. Integrações: aba Projetos na ficha do cliente, prazos de tarefa na
    Agenda (union all com events), card de tarefas atrasadas no Dashboard,
    ação "criar projeto a partir da proposta ganha".
```

### Fase 7 — Drive (5 dias)

```
31. /drive — árvore de pastas com carregamento lazy, grade/lista de arquivos,
    breadcrumb e busca.
32. Upload múltiplo por drag & drop com signed URL e barra de progresso;
    mover, renomear, lixeira e versionamento (replaces_id).
33. Extraia o viewer de contratos para src/components/file-viewer/ e
    reutilize no Drive.
```

### Fase 8 — Automação (8 dias)

```
34. Motor: tabela outbox_events, triggers de emissão em deals/tasks/
    contracts/comments, e o worker em /api/cron/automation com
    select for update skip locked e proteção por CRON_SECRET.
35. Implemente as 9 regras fixas da §7.2 como handlers em
    src/server/automation/handlers.ts. Toda notificação do sistema
    passa a nascer aqui.
36. Tela /configuracoes/automacoes: listar regras ativas, ver histórico
    de execuções (automation_runs) e ligar/desligar cada uma.
```

### Fase 9 — Chat *(só se ainda fizer sentido depois de 2 meses usando comentários)*

```
37. Schema de canais e mensagens, lista de canais, DM.
38. Thread de mensagens com Realtime, paginação por cursor,
    envio otimista e contagem de não-lidas.
39. Anexos em mensagem (file_links), reações e menções.
```

### Design system (paralelo, 1 dia, pode ser feito a qualquer momento)

```
40. Aplique os tokens da §8.2: radius 4px, fundo cinza-azulado, sidebar
    escura, densidade compacta (linhas de 36-40px, fonte base 14px).
    Crie <StatusBadge> com mapa status→cor e use em cliente, proposta,
    tarefa e contrato.
```

---

## 12. Definição de pronto — adições

Além do checklist da §13 do ARQUITETURA.md, toda feature da expansão precisa de:

- [ ] Se cria/altera algo relevante, **emite evento na outbox** (não chama notificação direto)
- [ ] Se anexa arquivo, usa `files` + `file_links` (nunca coluna de arquivo inline)
- [ ] Se tem discussão, usa `<CommentThread>` (nunca uma segunda implementação de comentário)
- [ ] Se tem board, usa `<KanbanBoard>` genérico (nunca um segundo dnd-kit)
- [ ] Se usa Realtime, a policy de RLS da tabela foi testada com dois usuários de orgs diferentes
