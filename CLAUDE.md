# CLAUDE.md

Contexto permanente do projeto. Leia antes de qualquer alteração.
A especificação completa está em `ARQUITETURA.md` — este arquivo é o resumo operacional.

## O que é

CRM interno da empresa. Módulos: Dashboard, Clientes, Propostas (Kanban), Contratos, Agenda.
Uso interno, ~20 usuários. Não há billing.

## Stack

Next.js 16 (App Router, RSC) · TypeScript strict · Tailwind v4 + shadcn/ui ·
Supabase (Postgres + Auth + Storage + RLS) · Vercel ·
TanStack Query v5 · react-hook-form + Zod · @dnd-kit · FullCalendar · Recharts · date-fns

## Next 16 — o que você provavelmente "lembra" errado

Estas regras têm precedência sobre qualquer padrão de Next.js que você tenha aprendido:

- **Não existe `middleware.ts`.** É `src/proxy.ts`, e a função exportada é `export async function proxy(request: NextRequest)`. `config.matcher` continua igual.
- O proxy roda em **Node.js runtime por padrão**. Não force `runtime = 'edge'` — o `@supabase/ssr` precisa de APIs do Node.
- **Turbopack é o default** em `next dev` e `next build`. Escape: `next build --webpack`.
- Defaults de `next/image` mudaram (`qualities`, `localPatterns`, `remotePatterns`).
- **Não use `"use cache"` / Cache Components.** `revalidatePath` e `revalidateTag` cobrem tudo neste projeto.
- Node ≥ 20.9, TypeScript ≥ 5.1.

Se descobrir outra divergência entre o framework real e o que está escrito aqui, **atualize esta seção** antes de seguir.

## Regras inegociáveis

1. **RLS sempre.** Toda tabela tem `org_id` e RLS habilitada. Toda query filtra `org_id` explicitamente, mesmo com RLS ativa.
2. **Dinheiro em centavos** (`bigint`, coluna `*_cents`). Nunca float. Formatar só na UI.
3. **Datas em `timestamptz`.** Converter para `America/Sao_Paulo` só na renderização.
4. **Lógica de negócio em `src/server/`**, não dentro da Server Action. A action só valida, chama o service e invalida cache.
5. **Server Action retorna `{ ok: true, data }` ou `{ ok: false, errors }`.** Nunca deixe exception vazar para o cliente.
6. **Validação com Zod no cliente e no servidor**, com o mesmo schema de `features/*/schema.ts`.
7. **Soft delete** (`deleted_at`) em `clients`, `deals`, `contracts`, `events`. Leituras filtram `.is('deleted_at', null)`.
8. **`SUPABASE_SERVICE_ROLE_KEY` só em `src/lib/supabase/admin.ts`**, com `import 'server-only'`. Nunca em `NEXT_PUBLIC_*`.
9. **Sem `any`.** Tipos vêm de `src/types/database.ts` (gerado pelo Supabase CLI).
10. **Não invente tabela, coluna ou rota** que não esteja em `ARQUITETURA.md`. Se faltar, pare e pergunte.

## Organização do código

Por **feature**, não por camada:

```
src/features/<feature>/
  components/   # UI da feature
  actions.ts    # 'use server' — orquestra
  queries.ts    # leituras server-side
  hooks.ts      # TanStack Query
  schema.ts     # Zod + tipos
  ordering.ts   # (só em deals) índice fracionário
```

`src/server/<feature>.ts` = lógica de negócio pura, sem React, reutilizável por futura API REST.

## Convenções

- Componentes: `PascalCase.tsx`. Outros arquivos: `kebab-case.ts`.
- Rotas em português (`/clientes`, `/propostas`, `/contratos`, `/agenda`), código em inglês (`clients`, `deals`, `contracts`, `events`).
- Actions: verbo + entidade → `createClient`, `moveDeal`, `deleteContract`.
- Hooks: `useClients` / `useClient(id)` / `useCreateClient`.
- Toda mensagem de UI em **português do Brasil**.

## Kanban — cuidados específicos

- `PointerSensor` com `activationConstraint: { distance: 8 }` (senão clique vira drag).
- `collisionDetection={closestCorners}`.
- Cada draggable declara `data.current.type` = `'deal'` ou `'stage'`.
- Ordenação por **índice fracionário** (`fractional-indexing`), calculado no cliente. Mover = 1 UPDATE.
- Update **otimista** obrigatório, com rollback em erro.
- Coluna vazia precisa de dropzone com `min-h-[120px]`.
- Usar `DragOverlay` para o preview.

## Comandos

```bash
npm run dev
npm run build
npm run lint
npx supabase db push                     # aplica migrations
npx supabase gen types typescript --project-id XXX > src/types/database.ts
npx playwright test
```

## Definição de pronto

Feature só está pronta com: loading state (skeleton), empty state com CTA, erro tratado com toast em pt-BR,
validação nas duas pontas, RLS testada, funciona em 375px, navegável por teclado,
registra `activity` quando altera dado relevante, sem `any` e sem warning de lint.
