-- ============================================================
-- 0009_drive.sql
-- Fase 7, itens 31-32 (ARQUITETURA-EXPANSAO.md §5).
--
-- §5.2: função para o breadcrumb da árvore de pastas (CTE recursiva —
-- devolve as linhas do caminho, não uma string concatenada, porque a UI
-- precisa de cada segmento clicável).
--
-- §5.3: "tudo visível pra org, exceto uma pasta especial 'Privado' por
-- usuário" — pasta raiz única por usuário (sem aninhamento dentro dela,
-- reforçado na app), oculta de todo mundo menos quem criou. Sem
-- override de owner/admin de propósito: mantém a semântica de "privado"
-- simples e sem superfície extra pra errar.
-- ============================================================

create or replace function public.folder_ancestors(p_folder uuid)
returns table (id uuid, name text, depth int)
language sql stable security definer set search_path = public as $$
  with recursive up as (
    select f.id, f.parent_id, f.name, 0 as depth
    from folders f
    where f.id = p_folder
    union all
    select f.id, f.parent_id, f.name, up.depth + 1
    from folders f
    join up on f.id = up.parent_id
  )
  select up.id, up.name, up.depth from up order by up.depth desc;
$$;

alter table folders add column is_private boolean not null default false;

drop policy if exists folders_select on folders;
create policy folders_select on folders
  for select using (
    public.is_member(org_id) and (not is_private or created_by = auth.uid())
  );

drop policy if exists files_select on files;
create policy files_select on files
  for select using (
    public.is_member(org_id) and (
      folder_id is null
      or exists (
        select 1 from folders f
        where f.id = files.folder_id
          and (not f.is_private or f.created_by = auth.uid())
      )
    )
  );
