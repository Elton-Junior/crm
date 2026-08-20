import "server-only";

import { generateKeyBetween } from "fractional-indexing";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import * as activitiesService from "./activities";

type Supabase = SupabaseClient<Database>;
type ProjectStatus = Database["public"]["Enums"]["project_status"];

type Member = { id: string; full_name: string | null };

export type ProjectListItem = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: ProjectStatus;
  starts_on: string | null;
  due_on: string | null;
  client: { id: string; name: string } | null;
  owner: Member | null;
  members: Member[];
  totalTasks: number;
  doneTasks: number;
};

export type ProjectListFilters = {
  search?: string;
  status?: ProjectStatus;
  clientId?: string;
};

function sanitizeSearch(term: string): string {
  return term.replace(/[%_]/g, " ").trim();
}

/** Grade de projetos (§4.2, item 26) — progresso calculado a partir das tarefas não excluídas de cada projeto. */
export async function list(
  supabase: Supabase,
  orgId: string,
  filters: ProjectListFilters,
): Promise<ProjectListItem[]> {
  let query = supabase
    .from("projects")
    .select(
      "id, name, description, color, status, starts_on, due_on, client:clients!projects_client_id_fkey(id, name), owner:profiles!projects_owner_id_fkey(id, full_name)",
    )
    .eq("org_id", orgId)
    .is("deleted_at", null);

  const search = filters.search ? sanitizeSearch(filters.search) : "";
  if (search) query = query.ilike("name", `%${search}%`);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.clientId) query = query.eq("client_id", filters.clientId);

  const { data: projects, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  if (!projects || projects.length === 0) return [];

  const projectIds = projects.map((p) => p.id);

  const [{ data: members, error: membersErr }, { data: tasks, error: tasksErr }] =
    await Promise.all([
      supabase
        .from("project_members")
        .select("project_id, user:profiles!project_members_user_id_fkey(id, full_name)")
        .in("project_id", projectIds),
      supabase
        .from("tasks")
        .select("project_id, status")
        .eq("org_id", orgId)
        .in("project_id", projectIds)
        .is("deleted_at", null),
    ]);

  if (membersErr) throw membersErr;
  if (tasksErr) throw tasksErr;

  const membersByProject: Record<string, Member[]> = {};
  for (const row of members ?? []) {
    const user = row.user as unknown as Member | null;
    if (!user) continue;
    (membersByProject[row.project_id] ??= []).push(user);
  }

  const statsByProject: Record<string, { total: number; done: number }> = {};
  for (const t of tasks ?? []) {
    const stats = (statsByProject[t.project_id] ??= { total: 0, done: 0 });
    stats.total += 1;
    if (t.status === "done") stats.done += 1;
  }

  return (projects as unknown as Omit<ProjectListItem, "members" | "totalTasks" | "doneTasks">[]).map(
    (p) => ({
      ...p,
      members: membersByProject[p.id] ?? [],
      totalTasks: statsByProject[p.id]?.total ?? 0,
      doneTasks: statsByProject[p.id]?.done ?? 0,
    }),
  );
}

export type ProjectInput = {
  name: string;
  description: string;
  color: string;
  status: ProjectStatus;
  clientId: string;
  ownerId: string;
  startsOn: string;
  dueOn: string;
  memberIds: string[];
};

export type ProjectDetail = ProjectInput & {
  id: string;
  clientName: string | null;
};

/** Colunas padrão de todo projeto novo — mesma mecânica de pipeline_stages (§4.1), sem editor dedicado no MVP. */
const DEFAULT_COLUMNS: { name: string; color: string; isDone: boolean }[] = [
  { name: "A Fazer", color: "#64748b", isDone: false },
  { name: "Em Andamento", color: "#3b82f6", isDone: false },
  { name: "Revisão", color: "#f59e0b", isDone: false },
  { name: "Concluído", color: "#22c55e", isDone: true },
];

async function seedDefaultColumns(supabase: Supabase, orgId: string, projectId: string) {
  let columnPosition: string | null = null;
  const columnRows = DEFAULT_COLUMNS.map((col) => {
    columnPosition = generateKeyBetween(columnPosition, null);
    return {
      org_id: orgId,
      project_id: projectId,
      name: col.name,
      color: col.color,
      is_done: col.isDone,
      position: columnPosition,
    };
  });
  const { error } = await supabase.from("task_columns").insert(columnRows);
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}

export async function create(
  supabase: Supabase,
  params: { orgId: string; actorId: string; input: ProjectInput },
) {
  const position = generateKeyBetween(null, null);

  const { data, error } = await supabase
    .from("projects")
    .insert({
      org_id: params.orgId,
      name: params.input.name,
      description: params.input.description || null,
      color: params.input.color,
      status: params.input.status,
      client_id: params.input.clientId || null,
      owner_id: params.input.ownerId || null,
      starts_on: params.input.startsOn || null,
      due_on: params.input.dueOn || null,
      position,
      created_by: params.actorId,
    })
    .select("id, name, client_id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  const columnsResult = await seedDefaultColumns(supabase, params.orgId, data.id);
  if (!columnsResult.ok) return columnsResult;

  const memberIds = new Set(params.input.memberIds);
  if (params.input.ownerId) memberIds.add(params.input.ownerId);
  if (memberIds.size > 0) {
    const { error: membersErr } = await supabase
      .from("project_members")
      .insert([...memberIds].map((userId) => ({ project_id: data.id, user_id: userId })));
    if (membersErr) return { ok: false as const, error: membersErr.message };
  }

  await activitiesService.log(supabase, {
    orgId: params.orgId,
    actorId: params.actorId,
    kind: "project_created",
    entityType: "project",
    entityId: data.id,
    clientId: data.client_id,
    payload: { name: data.name },
  });

  return { ok: true as const, data };
}

export async function getById(
  supabase: Supabase,
  orgId: string,
  projectId: string,
): Promise<ProjectDetail | null> {
  const [{ data, error }, { data: members, error: membersErr }] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, name, description, color, status, client_id, owner_id, starts_on, due_on, client:clients!projects_client_id_fkey(name)",
      )
      .eq("id", projectId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase.from("project_members").select("user_id").eq("project_id", projectId),
  ]);

  if (error) throw error;
  if (membersErr) throw membersErr;
  if (!data) return null;

  const client = data.client as unknown as { name: string } | null;

  return {
    id: data.id,
    name: data.name,
    description: data.description ?? "",
    color: data.color,
    status: data.status,
    clientId: data.client_id ?? "",
    clientName: client?.name ?? null,
    ownerId: data.owner_id ?? "",
    startsOn: data.starts_on ?? "",
    dueOn: data.due_on ?? "",
    memberIds: (members ?? []).map((m) => m.user_id),
  };
}

export async function update(
  supabase: Supabase,
  params: { orgId: string; projectId: string; input: ProjectInput },
) {
  const { data, error } = await supabase
    .from("projects")
    .update({
      name: params.input.name,
      description: params.input.description || null,
      color: params.input.color,
      status: params.input.status,
      client_id: params.input.clientId || null,
      owner_id: params.input.ownerId || null,
      starts_on: params.input.startsOn || null,
      due_on: params.input.dueOn || null,
    })
    .eq("id", params.projectId)
    .eq("org_id", params.orgId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "Projeto não encontrado." };

  const { data: current, error: currentErr } = await supabase
    .from("project_members")
    .select("user_id")
    .eq("project_id", params.projectId);
  if (currentErr) return { ok: false as const, error: currentErr.message };

  const currentIds = new Set((current ?? []).map((m) => m.user_id));
  const nextIds = new Set(params.input.memberIds);
  if (params.input.ownerId) nextIds.add(params.input.ownerId);

  const toAdd = [...nextIds].filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !nextIds.has(id));

  if (toAdd.length > 0) {
    const { error: addErr } = await supabase
      .from("project_members")
      .insert(toAdd.map((userId) => ({ project_id: params.projectId, user_id: userId })));
    if (addErr) return { ok: false as const, error: addErr.message };
  }
  if (toRemove.length > 0) {
    const { error: removeErr } = await supabase
      .from("project_members")
      .delete()
      .eq("project_id", params.projectId)
      .in("user_id", toRemove);
    if (removeErr) return { ok: false as const, error: removeErr.message };
  }

  return { ok: true as const };
}

export async function softDelete(
  supabase: Supabase,
  params: { orgId: string; projectId: string },
) {
  const { error } = await supabase
    .from("projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.projectId)
    .eq("org_id", params.orgId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

/**
 * "Criar projeto a partir desta proposta" (§4.4, item 30) — atalho oferecido
 * quando um deal é marcado como ganho. Só os campos essenciais (nome,
 * cliente, proposta vinculada); o resto o usuário ajusta depois em Editar.
 */
export async function createFromDeal(
  supabase: Supabase,
  params: { orgId: string; actorId: string; dealId: string; name: string; clientId: string | null },
) {
  const position = generateKeyBetween(null, null);

  const { data, error } = await supabase
    .from("projects")
    .insert({
      org_id: params.orgId,
      name: params.name,
      client_id: params.clientId,
      deal_id: params.dealId,
      owner_id: params.actorId,
      position,
      created_by: params.actorId,
    })
    .select("id, name, client_id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  const columnsResult = await seedDefaultColumns(supabase, params.orgId, data.id);
  if (!columnsResult.ok) return columnsResult;

  const { error: memberErr } = await supabase
    .from("project_members")
    .insert({ project_id: data.id, user_id: params.actorId });
  if (memberErr) return { ok: false as const, error: memberErr.message };

  await activitiesService.log(supabase, {
    orgId: params.orgId,
    actorId: params.actorId,
    kind: "project_created",
    entityType: "project",
    entityId: data.id,
    clientId: data.client_id,
    payload: { name: data.name },
  });

  return { ok: true as const, data };
}

/** Lista leve para o combobox "Projeto" (ex.: criar projeto a partir de proposta ganha, item 30). */
export async function listByClient(supabase: Supabase, orgId: string, clientId: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, status, color, due_on")
    .eq("org_id", orgId)
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
