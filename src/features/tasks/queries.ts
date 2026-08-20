import "server-only";

import { requireOrg } from "@/lib/auth";
import type { MyTask } from "@/server/tasks";
import * as tasksService from "@/server/tasks";

export type MyTasksGroups = {
  overdue: MyTask[];
  today: MyTask[];
  week: MyTask[];
  later: MyTask[];
};

/** Agrupa em Atrasadas/Hoje/Semana/Depois (§4.2, item 29) — data local America/Sao_Paulo. */
function groupByDueDate(tasks: MyTask[]): MyTasksGroups {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const weekLimit = new Date();
  weekLimit.setDate(weekLimit.getDate() + 7);
  const weekLimitStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(weekLimit);

  const groups: MyTasksGroups = { overdue: [], today: [], week: [], later: [] };

  for (const task of tasks) {
    if (!task.due_on) {
      groups.later.push(task);
    } else if (task.due_on < today) {
      groups.overdue.push(task);
    } else if (task.due_on === today) {
      groups.today.push(task);
    } else if (task.due_on <= weekLimitStr) {
      groups.week.push(task);
    } else {
      groups.later.push(task);
    }
  }

  return groups;
}

export async function getMyTasks() {
  const { supabase, user, orgId } = await requireOrg();
  const tasks = await tasksService.listMine(supabase, orgId, user.id);
  return groupByDueDate(tasks);
}
