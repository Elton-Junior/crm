-- ============================================================
-- 0008_tasks_activity_kinds.sql
-- Fase 6, item 26+ (ARQUITETURA-EXPANSAO.md §4) — Tarefas e Projetos
-- passam a logar activity, mesmo padrão de deals (§7.6). Sem outbox_events
-- ainda (isso é Fase 8, item 34): segue o padrão atual de chamar
-- activitiesService.log() diretamente, como deals/clients/contracts já
-- fazem — nada na §4 exige o motor de outbox antes da Fase 8.
-- ============================================================

alter type activity_kind add value 'project_created';
alter type activity_kind add value 'task_created';
alter type activity_kind add value 'task_moved';
alter type activity_kind add value 'task_completed';
