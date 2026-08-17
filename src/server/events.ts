import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import * as activitiesService from "./activities";

type Supabase = SupabaseClient<Database>;
export type EventKind = Database["public"]["Enums"]["event_kind"];

/** Cor padrão por tipo — o usuário não escolhe cor livremente (§7.8). */
export const KIND_COLORS: Record<EventKind, string> = {
  meeting: "#3b82f6",
  call: "#8b5cf6",
  task: "#f59e0b",
  deadline: "#ef4444",
  other: "#64748b",
};

export type ClientEvent = {
  id: string;
  title: string;
  kind: Database["public"]["Enums"]["event_kind"];
  status: string;
  starts_at: string;
  ends_at: string;
};

/**
 * Lista de eventos de um cliente para a página de detalhe (§7.5). Só
 * leitura — o calendário completo é o item 15 do roadmap.
 */
export async function listByClient(
  supabase: Supabase,
  orgId: string,
  clientId: string,
): Promise<ClientEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, kind, status, starts_at, ends_at")
    .eq("org_id", orgId)
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export type CalendarEvent = {
  id: string;
  title: string;
  kind: EventKind;
  color: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  rrule: string | null;
  status: string;
  owner_id: string | null;
  owner: { id: string; full_name: string | null } | null;
  client: { id: string; name: string } | null;
};

export type EventListFilters = {
  from: string;
  to: string;
  ownerId?: string;
  kinds?: EventKind[];
};

/**
 * Eventos do range visível do calendário (§7.8 "Técnico" — nunca o ano
 * inteiro). Eventos recorrentes (rrule preenchido) sempre voltam, mesmo
 * com a primeira ocorrência fora do range: a expansão pro range visível
 * acontece no cliente (ver features/events/recurrence.ts), não aqui.
 */
export async function listRange(
  supabase: Supabase,
  orgId: string,
  filters: EventListFilters,
): Promise<CalendarEvent[]> {
  let query = supabase
    .from("events")
    .select(
      "id, title, kind, color, location, starts_at, ends_at, all_day, rrule, status, owner_id, owner:profiles!events_owner_id_fkey(id, full_name), client:clients!events_client_id_fkey(id, name)",
    )
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .or(
      `rrule.not.is.null,and(starts_at.lte.${filters.to},ends_at.gte.${filters.from})`,
    );

  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);
  if (filters.kinds && filters.kinds.length > 0) query = query.in("kind", filters.kinds);

  const { data, error } = await query.order("starts_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as CalendarEvent[];
}

export type EventInput = {
  title: string;
  kind: EventKind;
  location: string;
  clientId: string;
  dealId: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  rrule: string;
  ownerId: string;
  description: string;
  attendeeIds: string[];
};

export type EventDetail = EventInput & {
  id: string;
  clientName: string | null;
  dealTitle: string | null;
};

function emptyToNull(value: string): string | null {
  return value === "" ? null : value;
}

export async function getById(
  supabase: Supabase,
  orgId: string,
  id: string,
): Promise<EventDetail | null> {
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, title, kind, location, client_id, deal_id, starts_at, ends_at, all_day, rrule, owner_id, description, client:clients!events_client_id_fkey(name), deal:deals!events_deal_id_fkey(title), attendees:event_attendees(user_id)",
    )
    .eq("id", id)
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const client = data.client as unknown as { name: string } | null;
  const deal = data.deal as unknown as { title: string } | null;
  const attendees = data.attendees as unknown as { user_id: string }[];

  return {
    id: data.id,
    title: data.title,
    kind: data.kind,
    location: data.location ?? "",
    clientId: data.client_id ?? "",
    clientName: client?.name ?? null,
    dealId: data.deal_id ?? "",
    dealTitle: deal?.title ?? null,
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    allDay: data.all_day,
    rrule: data.rrule ?? "",
    ownerId: data.owner_id ?? "",
    description: data.description ?? "",
    attendeeIds: attendees.map((a) => a.user_id),
  };
}

async function syncAttendees(supabase: Supabase, eventId: string, attendeeIds: string[]) {
  await supabase.from("event_attendees").delete().eq("event_id", eventId);
  if (attendeeIds.length > 0) {
    await supabase
      .from("event_attendees")
      .insert(attendeeIds.map((userId) => ({ event_id: eventId, user_id: userId })));
  }
}

export async function create(
  supabase: Supabase,
  params: { orgId: string; actorId: string; input: EventInput },
) {
  const { data, error } = await supabase
    .from("events")
    .insert({
      org_id: params.orgId,
      created_by: params.actorId,
      title: params.input.title,
      kind: params.input.kind,
      color: KIND_COLORS[params.input.kind],
      location: emptyToNull(params.input.location),
      client_id: params.input.clientId || null,
      deal_id: params.input.dealId || null,
      starts_at: params.input.startsAt,
      ends_at: params.input.endsAt,
      all_day: params.input.allDay,
      rrule: emptyToNull(params.input.rrule),
      owner_id: params.input.ownerId || null,
      description: emptyToNull(params.input.description),
    })
    .select("id, client_id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  await syncAttendees(supabase, data.id, params.input.attendeeIds);

  await activitiesService.log(supabase, {
    orgId: params.orgId,
    actorId: params.actorId,
    kind: "event_created",
    entityType: "event",
    entityId: data.id,
    clientId: data.client_id,
    payload: { title: params.input.title },
  });

  return { ok: true as const, data };
}

/** Atualização completa (formulário de edição). Sem log — não há `event_updated` no enum. */
export async function update(
  supabase: Supabase,
  params: { orgId: string; eventId: string; input: EventInput },
) {
  const { data, error } = await supabase
    .from("events")
    .update({
      title: params.input.title,
      kind: params.input.kind,
      color: KIND_COLORS[params.input.kind],
      location: emptyToNull(params.input.location),
      client_id: params.input.clientId || null,
      deal_id: params.input.dealId || null,
      starts_at: params.input.startsAt,
      ends_at: params.input.endsAt,
      all_day: params.input.allDay,
      rrule: emptyToNull(params.input.rrule),
      owner_id: params.input.ownerId || null,
      description: emptyToNull(params.input.description),
    })
    .eq("id", params.eventId)
    .eq("org_id", params.orgId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "Evento não encontrado." };

  await syncAttendees(supabase, params.eventId, params.input.attendeeIds);

  return { ok: true as const };
}

/** Update leve usado por eventDrop/eventResize — só data/hora. */
export async function move(
  supabase: Supabase,
  params: { orgId: string; eventId: string; startsAt: string; endsAt: string },
) {
  const { error } = await supabase
    .from("events")
    .update({ starts_at: params.startsAt, ends_at: params.endsAt })
    .eq("id", params.eventId)
    .eq("org_id", params.orgId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function softDelete(
  supabase: Supabase,
  params: { orgId: string; eventId: string },
) {
  const { data, error } = await supabase
    .from("events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.eventId)
    .eq("org_id", params.orgId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "Evento não encontrado." };
  return { ok: true as const };
}

export type EventConflict = { id: string; title: string; starts_at: string; ends_at: string };

/** Aviso não-bloqueante de sobreposição com outro evento do mesmo responsável (§7.8). */
export async function checkConflict(
  supabase: Supabase,
  params: {
    orgId: string;
    ownerId: string;
    startsAt: string;
    endsAt: string;
    excludeId?: string;
  },
): Promise<EventConflict[]> {
  if (!params.ownerId) return [];

  let query = supabase
    .from("events")
    .select("id, title, starts_at, ends_at")
    .eq("org_id", params.orgId)
    .eq("owner_id", params.ownerId)
    .is("deleted_at", null)
    .lt("starts_at", params.endsAt)
    .gt("ends_at", params.startsAt)
    .limit(5);

  if (params.excludeId) query = query.neq("id", params.excludeId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
