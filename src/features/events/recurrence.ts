import type { CalendarEvent } from "@/server/events";

export type EventOccurrence = CalendarEvent & { occurrenceId: string };

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Expande eventos recorrentes (rrule simples: FREQ=DAILY/WEEKLY/MONTHLY)
 * em ocorrências concretas dentro do range visível do calendário. As
 * instâncias geradas só existem no cliente — nada é materializado no
 * banco (§7.8, "Recorrência no MVP").
 */
export function expandRecurringEvents(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date,
): EventOccurrence[] {
  const result: EventOccurrence[] = [];

  for (const event of events) {
    const freq = !event.rrule
      ? null
      : event.rrule.includes("DAILY")
        ? "daily"
        : event.rrule.includes("WEEKLY")
          ? "weekly"
          : event.rrule.includes("MONTHLY")
            ? "monthly"
            : null;

    if (!freq) {
      result.push({ ...event, occurrenceId: event.id });
      continue;
    }

    const durationMs = new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime();
    let cursor = new Date(event.starts_at);
    let guard = 0;

    // 366 cobre até uma recorrência diária por um ano inteiro — bem mais
    // que qualquer range de calendário (mês/semana/dia) precisa exibir.
    while (cursor.getTime() <= rangeEnd.getTime() && guard < 366) {
      const occursEnd = cursor.getTime() + durationMs;
      if (occursEnd >= rangeStart.getTime()) {
        result.push({
          ...event,
          occurrenceId: `${event.id}:${cursor.toISOString()}`,
          starts_at: cursor.toISOString(),
          ends_at: new Date(occursEnd).toISOString(),
        });
      }

      cursor = freq === "daily" ? addDays(cursor, 1) : freq === "weekly" ? addDays(cursor, 7) : addMonths(cursor, 1);
      guard++;
    }
  }

  return result;
}
