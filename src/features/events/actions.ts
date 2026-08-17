"use server";

import { revalidatePath } from "next/cache";

import { requireOrg } from "@/lib/auth";
import * as eventsService from "@/server/events";
import type { EventKind } from "@/server/events";

import { eventFormSchema, recurrenceToRrule } from "./schema";

export async function getEventsRange(params: {
  from: string;
  to: string;
  ownerId?: string;
  kinds?: EventKind[];
}) {
  const { supabase, orgId } = await requireOrg();
  return eventsService.listRange(supabase, orgId, params);
}

export async function getEvent(eventId: string) {
  const { supabase, orgId } = await requireOrg();
  const event = await eventsService.getById(supabase, orgId, eventId);
  if (!event) {
    return { ok: false as const, errors: { _form: ["Evento não encontrado."] } };
  }
  return { ok: true as const, data: event };
}

export async function createEvent(input: unknown) {
  const parsed = eventFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const { recurrence, ...rest } = parsed.data;
  const { supabase, user, orgId } = await requireOrg();
  const result = await eventsService.create(supabase, {
    orgId,
    actorId: user.id,
    input: { ...rest, rrule: recurrenceToRrule(recurrence) },
  });

  if (!result.ok) {
    return { ok: false as const, errors: { _form: [result.error] } };
  }

  revalidatePath("/agenda");
  return { ok: true as const, data: result.data };
}

export async function updateEvent(eventId: string, input: unknown) {
  const parsed = eventFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const { recurrence, ...rest } = parsed.data;
  const { supabase, orgId } = await requireOrg();
  const result = await eventsService.update(supabase, {
    orgId,
    eventId,
    input: { ...rest, rrule: recurrenceToRrule(recurrence) },
  });

  if (!result.ok) {
    return { ok: false as const, errors: { _form: [result.error] } };
  }

  revalidatePath("/agenda");
  return { ok: true as const, data: null };
}

export async function moveEvent(eventId: string, startsAt: string, endsAt: string) {
  const { supabase, orgId } = await requireOrg();
  const result = await eventsService.move(supabase, { orgId, eventId, startsAt, endsAt });

  if (!result.ok) {
    return { ok: false as const, errors: { _form: [result.error] } };
  }

  revalidatePath("/agenda");
  return { ok: true as const, data: null };
}

export async function deleteEvent(eventId: string) {
  const { supabase, orgId } = await requireOrg();
  const result = await eventsService.softDelete(supabase, { orgId, eventId });

  if (!result.ok) {
    return { ok: false as const, errors: { _form: [result.error] } };
  }

  revalidatePath("/agenda");
  return { ok: true as const, data: null };
}

export async function checkEventConflict(
  ownerId: string,
  startsAt: string,
  endsAt: string,
  excludeId?: string,
) {
  const { supabase, orgId } = await requireOrg();
  const conflicts = await eventsService.checkConflict(supabase, {
    orgId,
    ownerId,
    startsAt,
    endsAt,
    excludeId,
  });
  return { ok: true as const, data: conflicts };
}
