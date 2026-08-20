"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { EyeIcon, EyeOffIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TagsInput } from "@/features/clients/components/TagsInput";
import { CommentThread } from "@/features/comments/components/CommentThread";
import { firstErrorMessage } from "@/lib/action-errors";

import { deleteTask, getTaskDetail, setWatching, updateTask } from "../actions";
import { taskBoardKey } from "../hooks";
import {
  TASK_FORM_DEFAULTS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  taskFormSchema,
  type TaskFormInput,
} from "../schema";
import { TaskAttachments, type AttachmentItem } from "./TaskAttachments";
import { TaskChecklist, type ChecklistItem } from "./TaskChecklist";
import { TaskSubtasks, type SubtaskItem } from "./TaskSubtasks";
import { TaskTimeTracking, type TimeEntryItem } from "./TaskTimeTracking";

const NONE = "__none__";

type Member = { id: string; full_name: string | null };

export function TaskDetailDialog({
  taskId,
  projectId,
  members,
  onOpenChange,
}: {
  taskId: string | null;
  projectId: string;
  members: Member[];
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();

  const [loadedTaskId, setLoadedTaskId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [columnId, setColumnId] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntryItem[]>([]);
  const [spentMin, setSpentMin] = useState(0);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const form = useForm<TaskFormInput>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: TASK_FORM_DEFAULTS,
  });

  const open = taskId !== null;
  const isLoading = open && loadedTaskId !== taskId;

  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;

    getTaskDetail(taskId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        toast.error(firstErrorMessage(result.errors, "Não foi possível carregar a tarefa."));
        onOpenChange(false);
        return;
      }

      const { task, checklist, subtasks, isWatching, timeEntries, attachments } = result.data;
      form.reset({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId,
        startsOn: task.startsOn,
        dueOn: task.dueOn,
        estimateMin: task.estimateMin,
        tags: task.tags,
      });
      setColumnId(task.columnId);
      setChecklist(checklist);
      setSubtasks(subtasks);
      setAttachments(attachments);
      setTimeEntries(timeEntries);
      setSpentMin(task.spentMin);
      setIsWatching(isWatching);
      setLoadedTaskId(taskId);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  function handleSave(values: TaskFormInput) {
    if (!taskId) return;
    setIsSaving(true);
    updateTask(taskId, projectId, values).then((result) => {
      setIsSaving(false);
      if (!result.ok) {
        toast.error(firstErrorMessage(result.errors, "Não foi possível salvar."));
        return;
      }
      toast.success("Tarefa atualizada.");
      qc.invalidateQueries({ queryKey: taskBoardKey(projectId) });
      onOpenChange(false);
    });
  }

  function handleToggleWatching() {
    if (!taskId) return;
    const next = !isWatching;
    setIsWatching(next);
    setWatching(taskId, next).then((result) => {
      if (!result.ok) {
        setIsWatching(!next);
        toast.error(firstErrorMessage(result.errors, "Não foi possível atualizar."));
      }
    });
  }

  function handleDelete() {
    if (!taskId) return;
    deleteTask(taskId, projectId).then((result) => {
      if (!result.ok) {
        toast.error(firstErrorMessage(result.errors, "Não foi possível excluir a tarefa."));
        return;
      }
      toast.success("Tarefa excluída.");
      qc.invalidateQueries({ queryKey: taskBoardKey(projectId) });
      setConfirmDeleteOpen(false);
      onOpenChange(false);
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pr-6">
              <DialogTitle>
                {isLoading ? "Carregando..." : form.getValues("title") || "Tarefa"}
              </DialogTitle>
              {!isLoading ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleWatching}
                  className="text-muted-foreground"
                >
                  {isWatching ? <EyeIcon /> : <EyeOffIcon />}
                  {isWatching ? "Acompanhando" : "Acompanhar"}
                </Button>
              ) : null}
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : (
            <Tabs defaultValue="details">
              <TabsList className="flex-wrap">
                <TabsTrigger value="details">Detalhes</TabsTrigger>
                <TabsTrigger value="checklist">Checklist</TabsTrigger>
                <TabsTrigger value="subtasks">Subtarefas</TabsTrigger>
                <TabsTrigger value="attachments">Anexos</TabsTrigger>
                <TabsTrigger value="comments">Comentários</TabsTrigger>
                <TabsTrigger value="time">Horas</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="pt-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prioridade</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="assigneeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsável</FormLabel>
                          <Select
                            value={field.value || NONE}
                            onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Sem responsável" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={NONE}>Sem responsável</SelectItem>
                              {members.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  {member.full_name ?? "Sem nome"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 sm:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="startsOn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Início</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dueOn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prazo</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="estimateMin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estimativa (min)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                value={field.value ?? ""}
                                onChange={(e) =>
                                  field.onChange(e.target.value === "" ? null : Number(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tags</FormLabel>
                          <FormControl>
                            <TagsInput value={field.value} onChange={field.onChange} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea rows={4} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setConfirmDeleteOpen(true)}
                      >
                        <Trash2Icon /> Excluir
                      </Button>
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? "Salvando..." : "Salvar"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="checklist" className="pt-4">
                <TaskChecklist taskId={taskId!} initialItems={checklist} />
              </TabsContent>

              <TabsContent value="subtasks" className="pt-4">
                {columnId ? (
                  <TaskSubtasks
                    taskId={taskId!}
                    projectId={projectId}
                    columnId={columnId}
                    initialItems={subtasks}
                  />
                ) : null}
              </TabsContent>

              <TabsContent value="attachments" className="pt-4">
                <TaskAttachments taskId={taskId!} initialItems={attachments} />
              </TabsContent>

              <TabsContent value="comments" className="pt-4">
                <CommentThread
                  entityType="task"
                  entityId={taskId!}
                  members={members}
                  revalidatePath={`/projetos/${projectId}`}
                />
              </TabsContent>

              <TabsContent value="time" className="pt-4">
                <TaskTimeTracking
                  taskId={taskId!}
                  spentMin={spentMin}
                  estimateMin={form.getValues("estimateMin")}
                  initialItems={timeEntries}
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              A tarefa sai do quadro e não pode ser restaurada pela interface.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
