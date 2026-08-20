import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import * as activitiesService from "./activities";

type Supabase = SupabaseClient<Database>;
type TaskStatus = Database["public"]["Enums"]["task_status"];
type TaskPriority = Database["public"]["Enums"]["task_priority"];

type Member = { id: string; full_name: string | null };

export type TaskColumn = {
  id: string;
  name: string;
  color: string;
  position: string;
  is_done: boolean;
  wip_limit: number | null;
};

export type BoardTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  column_id: string;
  position: string;
  due_on: string | null;
  tags: string[];
  assignee: Member | null;
};

export type Board = {
  projectId: string;
  columns: TaskColumn[];
  tasksByColumn: Record<string, BoardTask[]>;
};

/** Kanban de tarefas de um projeto (§4.2, item 27) — só tarefas de topo; subtarefas ficam no dialog de detalhe (item 28). */
export async function getBoard(
  supabase: Supabase,
  orgId: string,
  projectId: string,
): Promise<Board> {
  const [{ data: columns, error: columnsErr }, { data: tasks, error: tasksErr }] =
    await Promise.all([
      supabase
        .from("task_columns")
        .select("id, name, color, position, is_done, wip_limit")
        .eq("org_id", orgId)
        .eq("project_id", projectId)
        .order("position", { ascending: true }),
      supabase
        .from("tasks")
        .select(
          "id, title, status, priority, column_id, position, due_on, tags, assignee:profiles!tasks_assignee_id_fkey(id, full_name)",
        )
        .eq("org_id", orgId)
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .is("parent_id", null)
        .order("position", { ascending: true }),
    ]);

  if (columnsErr) throw columnsErr;
  if (tasksErr) throw tasksErr;

  const tasksByColumn: Record<string, BoardTask[]> = {};
  for (const column of columns ?? []) tasksByColumn[column.id] = [];
  for (const task of (tasks ?? []) as unknown as BoardTask[]) {
    (tasksByColumn[task.column_id] ??= []).push(task);
  }

  return { projectId, columns: columns ?? [], tasksByColumn };
}

/**
 * Move um card — 1 UPDATE. Coluna com `is_done` marca status='done' +
 * completed_at; qualquer outra reabre a tarefa (status='todo'), mesma
 * mecânica do deals.move() com is_won/is_lost.
 */
export async function move(
  supabase: Supabase,
  params: {
    orgId: string;
    actorId: string;
    taskId: string;
    toColumnId: string;
    position: string;
  },
) {
  const { data: column, error: columnErr } = await supabase
    .from("task_columns")
    .select("id, is_done")
    .eq("id", params.toColumnId)
    .eq("org_id", params.orgId)
    .maybeSingle();

  if (columnErr) throw columnErr;
  if (!column) return { ok: false as const, error: "Coluna não encontrada." };

  const update: Database["public"]["Tables"]["tasks"]["Update"] = {
    column_id: params.toColumnId,
    position: params.position,
    status: column.is_done ? "done" : "todo",
    completed_at: column.is_done ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", params.taskId)
    .eq("org_id", params.orgId)
    .select("id, title, client_id")
    .maybeSingle();

  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "Tarefa não encontrada." };

  await activitiesService.log(supabase, {
    orgId: params.orgId,
    actorId: params.actorId,
    kind: column.is_done ? "task_completed" : "task_moved",
    entityType: "task",
    entityId: data.id,
    clientId: data.client_id,
    payload: { title: data.title },
  });

  return { ok: true as const };
}

export async function moveColumn(
  supabase: Supabase,
  params: { orgId: string; columnId: string; position: string },
) {
  const { error } = await supabase
    .from("task_columns")
    .update({ position: params.position })
    .eq("id", params.columnId)
    .eq("org_id", params.orgId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function createQuick(
  supabase: Supabase,
  params: {
    orgId: string;
    actorId: string;
    projectId: string;
    columnId: string;
    title: string;
    position: string;
  },
) {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      org_id: params.orgId,
      project_id: params.projectId,
      column_id: params.columnId,
      title: params.title,
      position: params.position,
      created_by: params.actorId,
    })
    .select("id, title, client_id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  await activitiesService.log(supabase, {
    orgId: params.orgId,
    actorId: params.actorId,
    kind: "task_created",
    entityType: "task",
    entityId: data.id,
    clientId: data.client_id,
    payload: { title: data.title },
  });

  return { ok: true as const, data };
}

export type TaskInput = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  startsOn: string;
  dueOn: string;
  estimateMin: number | null;
  tags: string[];
};

export type TaskDetail = TaskInput & {
  id: string;
  projectId: string;
  columnId: string;
  parentId: string | null;
  clientId: string | null;
  spentMin: number;
  completedAt: string | null;
};

export async function getById(
  supabase: Supabase,
  orgId: string,
  taskId: string,
): Promise<TaskDetail | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, project_id, column_id, parent_id, title, description, status, priority, assignee_id, client_id, starts_on, due_on, completed_at, estimate_min, spent_min, tags",
    )
    .eq("id", taskId)
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    projectId: data.project_id,
    columnId: data.column_id,
    parentId: data.parent_id,
    title: data.title,
    description: data.description ?? "",
    status: data.status,
    priority: data.priority,
    assigneeId: data.assignee_id ?? "",
    clientId: data.client_id,
    startsOn: data.starts_on ?? "",
    dueOn: data.due_on ?? "",
    completedAt: data.completed_at,
    estimateMin: data.estimate_min,
    spentMin: data.spent_min,
    tags: data.tags ?? [],
  };
}

/** Não mexe em column_id/position (papel do drag, ver move()). Sem log de activity — mesmo motivo do deals.update(). */
export async function update(
  supabase: Supabase,
  params: { orgId: string; taskId: string; input: TaskInput },
) {
  const { data: current, error: currentErr } = await supabase
    .from("tasks")
    .select("status")
    .eq("id", params.taskId)
    .eq("org_id", params.orgId)
    .maybeSingle();

  if (currentErr) return { ok: false as const, error: currentErr.message };
  if (!current) return { ok: false as const, error: "Tarefa não encontrada." };

  const patch: Database["public"]["Tables"]["tasks"]["Update"] = {
    title: params.input.title,
    description: params.input.description || null,
    status: params.input.status,
    priority: params.input.priority,
    assignee_id: params.input.assigneeId || null,
    starts_on: params.input.startsOn || null,
    due_on: params.input.dueOn || null,
    estimate_min: params.input.estimateMin,
    tags: params.input.tags,
  };

  if (params.input.status === "done" && current.status !== "done") {
    patch.completed_at = new Date().toISOString();
  } else if (params.input.status !== "done" && current.status === "done") {
    patch.completed_at = null;
  }

  const { error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", params.taskId)
    .eq("org_id", params.orgId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function softDelete(supabase: Supabase, params: { orgId: string; taskId: string }) {
  const { error } = await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.taskId)
    .eq("org_id", params.orgId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

// ------------------------------------------------------------
// Checklist
// ------------------------------------------------------------

export type ChecklistItem = { id: string; title: string; done: boolean; position: string };

export async function listChecklist(supabase: Supabase, taskId: string): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from("task_checklist_items")
    .select("id, title, done, position")
    .eq("task_id", taskId)
    .order("position", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function addChecklistItem(
  supabase: Supabase,
  params: { taskId: string; title: string; position: string },
) {
  const { data, error } = await supabase
    .from("task_checklist_items")
    .insert({ task_id: params.taskId, title: params.title, position: params.position })
    .select("id, title, done, position")
    .single();

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}

export async function toggleChecklistItem(
  supabase: Supabase,
  params: { itemId: string; done: boolean },
) {
  const { error } = await supabase
    .from("task_checklist_items")
    .update({ done: params.done })
    .eq("id", params.itemId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function deleteChecklistItem(supabase: Supabase, itemId: string) {
  const { error } = await supabase.from("task_checklist_items").delete().eq("id", itemId);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

// ------------------------------------------------------------
// Subtarefas
// ------------------------------------------------------------

export type SubtaskItem = { id: string; title: string; status: TaskStatus; position: string };

export async function listSubtasks(
  supabase: Supabase,
  orgId: string,
  parentId: string,
): Promise<SubtaskItem[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, status, position")
    .eq("org_id", orgId)
    .eq("parent_id", parentId)
    .is("deleted_at", null)
    .order("position", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createSubtask(
  supabase: Supabase,
  params: {
    orgId: string;
    actorId: string;
    parentId: string;
    projectId: string;
    columnId: string;
    title: string;
    position: string;
  },
) {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      org_id: params.orgId,
      project_id: params.projectId,
      column_id: params.columnId,
      parent_id: params.parentId,
      title: params.title,
      position: params.position,
      created_by: params.actorId,
    })
    .select("id, title, status, position")
    .single();

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}

export async function toggleSubtaskStatus(
  supabase: Supabase,
  params: { orgId: string; taskId: string; done: boolean },
) {
  const { error } = await supabase
    .from("tasks")
    .update({
      status: params.done ? "done" : "todo",
      completed_at: params.done ? new Date().toISOString() : null,
    })
    .eq("id", params.taskId)
    .eq("org_id", params.orgId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

// ------------------------------------------------------------
// Observadores
// ------------------------------------------------------------

export async function listWatchers(supabase: Supabase, taskId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("task_watchers")
    .select("user_id")
    .eq("task_id", taskId);

  if (error) throw error;
  return (data ?? []).map((w) => w.user_id);
}

export async function setWatching(
  supabase: Supabase,
  params: { taskId: string; userId: string; watching: boolean },
) {
  if (params.watching) {
    const { error } = await supabase
      .from("task_watchers")
      .insert({ task_id: params.taskId, user_id: params.userId });
    // 23505 = já está acompanhando (unique violation) — idempotente, não é erro.
    if (error && error.code !== "23505") return { ok: false as const, error: error.message };
    return { ok: true as const };
  }

  const { error } = await supabase
    .from("task_watchers")
    .delete()
    .eq("task_id", params.taskId)
    .eq("user_id", params.userId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

// ------------------------------------------------------------
// Apontamento de horas
// ------------------------------------------------------------

export type TimeEntry = {
  id: string;
  minutes: number;
  note: string | null;
  logged_on: string;
  user: Member | null;
};

export async function listTimeEntries(supabase: Supabase, taskId: string): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from("time_entries")
    .select("id, minutes, note, logged_on, user:profiles!time_entries_user_id_fkey(id, full_name)")
    .eq("task_id", taskId)
    .order("logged_on", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as TimeEntry[];
}

/** Sem trigger no banco: soma `spent_min` na mesma chamada (§4.1). */
export async function addTimeEntry(
  supabase: Supabase,
  params: {
    orgId: string;
    taskId: string;
    userId: string;
    minutes: number;
    note: string;
    loggedOn: string;
  },
) {
  const { error: insertErr } = await supabase.from("time_entries").insert({
    org_id: params.orgId,
    task_id: params.taskId,
    user_id: params.userId,
    minutes: params.minutes,
    note: params.note || null,
    logged_on: params.loggedOn,
  });

  if (insertErr) return { ok: false as const, error: insertErr.message };

  const { data: task, error: taskErr } = await supabase
    .from("tasks")
    .select("spent_min")
    .eq("id", params.taskId)
    .eq("org_id", params.orgId)
    .maybeSingle();

  if (taskErr) return { ok: false as const, error: taskErr.message };
  if (!task) return { ok: false as const, error: "Tarefa não encontrada." };

  const { error: updateErr } = await supabase
    .from("tasks")
    .update({ spent_min: task.spent_min + params.minutes })
    .eq("id", params.taskId)
    .eq("org_id", params.orgId);

  if (updateErr) return { ok: false as const, error: updateErr.message };
  return { ok: true as const };
}

// ------------------------------------------------------------
// "Minhas tarefas" (item 29) e integrações (item 30)
// ------------------------------------------------------------

export type MyTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_on: string | null;
  project: { id: string; name: string; color: string } | null;
};

/** Tarefas abertas atribuídas ao usuário, para agrupar em Atrasadas/Hoje/Semana/Depois no cliente. */
export async function listMine(supabase: Supabase, orgId: string, userId: string): Promise<MyTask[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, status, priority, due_on, project:projects!tasks_project_id_fkey(id, name, color)")
    .eq("org_id", orgId)
    .eq("assignee_id", userId)
    .is("deleted_at", null)
    .not("status", "in", "(done,cancelled)")
    .order("due_on", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as unknown as MyTask[];
}

/** Tarefas com prazo no intervalo — usado pela Agenda via union all com events (§4.4). */
export type TaskDeadline = {
  id: string;
  title: string;
  due_on: string;
  project_id: string;
  project_name: string;
};

export async function listDeadlinesInRange(
  supabase: Supabase,
  orgId: string,
  from: string,
  to: string,
): Promise<TaskDeadline[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, due_on, project:projects!tasks_project_id_fkey(id, name)")
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .not("due_on", "is", null)
    .not("status", "in", "(done,cancelled)")
    .gte("due_on", from)
    .lte("due_on", to);

  if (error) throw error;
  return (data ?? []).map((t) => {
    const project = t.project as unknown as { id: string; name: string } | null;
    return {
      id: t.id,
      title: t.title,
      due_on: t.due_on as string,
      project_id: project?.id ?? "",
      project_name: project?.name ?? "",
    };
  });
}

/** Card "Minhas tarefas atrasadas" do Dashboard (item 30). */
export async function countOverdue(supabase: Supabase, orgId: string, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("assignee_id", userId)
    .is("deleted_at", null)
    .not("status", "in", "(done,cancelled)")
    .lt("due_on", new Date().toISOString().slice(0, 10));

  if (error) throw error;
  return count ?? 0;
}
