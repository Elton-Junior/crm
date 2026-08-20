"use server";

import { revalidatePath } from "next/cache";

import { requireOrg, requireUser } from "@/lib/auth";
import * as filesService from "@/server/files";
import * as tasksService from "@/server/tasks";

import {
  moveColumnSchema,
  moveTaskSchema,
  quickCreateTaskSchema,
  taskFormSchema,
} from "./schema";

export async function getBoardData(projectId: string) {
  const { supabase, orgId } = await requireOrg();
  return tasksService.getBoard(supabase, orgId, projectId);
}

export async function moveTask(input: unknown) {
  const parsed = moveTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, user, orgId } = await requireOrg();
  const result = await tasksService.move(supabase, {
    orgId,
    actorId: user.id,
    taskId: parsed.data.taskId,
    toColumnId: parsed.data.toColumnId,
    position: parsed.data.position,
  });

  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };
  return { ok: true as const, data: null };
}

export async function moveColumn(input: unknown) {
  const parsed = moveColumnSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, orgId } = await requireOrg();
  const result = await tasksService.moveColumn(supabase, {
    orgId,
    columnId: parsed.data.columnId,
    position: parsed.data.position,
  });

  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };
  return { ok: true as const, data: null };
}

export async function createTask(projectId: string, input: unknown) {
  const parsed = quickCreateTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, user, orgId } = await requireOrg();
  const result = await tasksService.createQuick(supabase, {
    orgId,
    actorId: user.id,
    projectId,
    columnId: parsed.data.columnId,
    title: parsed.data.title,
    position: parsed.data.position,
  });

  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };
  return { ok: true as const, data: result.data };
}

export async function getTaskDetail(taskId: string) {
  const { supabase, user, orgId } = await requireOrg();
  const task = await tasksService.getById(supabase, orgId, taskId);
  if (!task) {
    return { ok: false as const, errors: { _form: ["Tarefa não encontrada."] } };
  }

  const [checklist, subtasks, watchers, timeEntries, attachments] = await Promise.all([
    tasksService.listChecklist(supabase, taskId),
    tasksService.listSubtasks(supabase, orgId, taskId),
    tasksService.listWatchers(supabase, taskId),
    tasksService.listTimeEntries(supabase, taskId),
    filesService.listByEntity(supabase, { entityType: "task", entityId: taskId }),
  ]);

  return {
    ok: true as const,
    data: {
      task,
      checklist,
      subtasks,
      timeEntries,
      attachments,
      isWatching: watchers.includes(user.id),
    },
  };
}

export async function updateTask(taskId: string, projectId: string, input: unknown) {
  const parsed = taskFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, orgId } = await requireOrg();
  const result = await tasksService.update(supabase, { orgId, taskId, input: parsed.data });

  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };

  revalidatePath(`/projetos/${projectId}`);
  return { ok: true as const, data: null };
}

export async function deleteTask(taskId: string, projectId: string) {
  const { supabase, orgId } = await requireOrg();
  const result = await tasksService.softDelete(supabase, { orgId, taskId });

  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };

  revalidatePath(`/projetos/${projectId}`);
  return { ok: true as const, data: null };
}

export async function addChecklistItem(taskId: string, title: string, position: string) {
  const trimmed = title.trim();
  if (!trimmed) return { ok: false as const, errors: { _form: ["Informe um título."] } };

  const { supabase } = await requireOrg();
  const result = await tasksService.addChecklistItem(supabase, { taskId, title: trimmed, position });

  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };
  return { ok: true as const, data: result.data };
}

export async function toggleChecklistItem(itemId: string, done: boolean) {
  const { supabase } = await requireOrg();
  const result = await tasksService.toggleChecklistItem(supabase, { itemId, done });

  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };
  return { ok: true as const, data: null };
}

export async function deleteChecklistItem(itemId: string) {
  const { supabase } = await requireOrg();
  const result = await tasksService.deleteChecklistItem(supabase, itemId);

  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };
  return { ok: true as const, data: null };
}

export async function createSubtask(
  parentId: string,
  projectId: string,
  columnId: string,
  title: string,
  position: string,
) {
  const trimmed = title.trim();
  if (!trimmed) return { ok: false as const, errors: { _form: ["Informe um título."] } };

  const { supabase, user, orgId } = await requireOrg();
  const result = await tasksService.createSubtask(supabase, {
    orgId,
    actorId: user.id,
    parentId,
    projectId,
    columnId,
    title: trimmed,
    position,
  });

  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };
  return { ok: true as const, data: result.data };
}

export async function toggleSubtaskStatus(taskId: string, done: boolean) {
  const { supabase, orgId } = await requireOrg();
  const result = await tasksService.toggleSubtaskStatus(supabase, { orgId, taskId, done });

  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };
  return { ok: true as const, data: null };
}

export async function setWatching(taskId: string, watching: boolean) {
  const { supabase, user } = await requireOrg();
  const result = await tasksService.setWatching(supabase, {
    taskId,
    userId: user.id,
    watching,
  });

  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };
  return { ok: true as const, data: null };
}

export async function addTimeEntry(taskId: string, minutes: number, note: string, loggedOn: string) {
  if (!minutes || minutes <= 0) {
    return { ok: false as const, errors: { _form: ["Informe uma duração válida."] } };
  }

  const { supabase, user, orgId } = await requireOrg();
  const result = await tasksService.addTimeEntry(supabase, {
    orgId,
    taskId,
    userId: user.id,
    minutes,
    note,
    loggedOn: loggedOn || new Date().toISOString().slice(0, 10),
  });

  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };
  return { ok: true as const, data: null };
}

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
];
const MAX_FILE_SIZE = 25 * 1024 * 1024;

export async function createTaskUploadUrl(fileName: string, mime: string, size: number) {
  await requireUser();

  if (!ALLOWED_MIME_TYPES.includes(mime)) {
    return { ok: false as const, errors: { _form: ["Tipo de arquivo não permitido."] } };
  }
  if (size > MAX_FILE_SIZE) {
    return { ok: false as const, errors: { _form: ["Arquivo maior que 25 MB."] } };
  }

  const { supabase, orgId } = await requireOrg();
  const result = await filesService.createUploadUrl(supabase, { orgId, fileName });

  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };
  return { ok: true as const, data: result.data };
}

export async function confirmTaskUpload(
  taskId: string,
  fileId: string,
  path: string,
  fileName: string,
  size: number,
  mime: string,
) {
  const { supabase, user, orgId } = await requireOrg();
  const confirmResult = await filesService.confirmUpload(supabase, {
    id: fileId,
    orgId,
    actorId: user.id,
    path,
    name: fileName,
    size,
    mime,
  });

  if (!confirmResult.ok) return { ok: false as const, errors: { _form: [confirmResult.error] } };

  const linkResult = await filesService.linkToEntity(supabase, {
    fileId,
    entityType: "task",
    entityId: taskId,
  });

  if (!linkResult.ok) return { ok: false as const, errors: { _form: [linkResult.error] } };
  return { ok: true as const, data: confirmResult.data };
}
