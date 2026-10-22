/** Agenda of the Beranda: my events still to come or in progress, today first then tomorrow. */
import type { Principal } from '../access/types';
import { db } from '../db';
import { agendaFor } from '../event/events.query';
import { isoDateIn } from '../metrics/dates';
import type { IsoDate } from '../metrics/types';
import type { Executor } from '../pm/tx';
import type { HomeAgendaItem } from './home.dto';

/**
 * `agendaFor` already limits to what has not ended before the end of tomorrow; this only says which
 * day each row belongs to. An event that began on an earlier day and is still running counts as today.
 */
export async function getAgenda(
  p: Principal,
  clock: { now: Date; today: IsoDate; timeZone: string },
  exec: Executor = db,
): Promise<HomeAgendaItem[]> {
  const items = await agendaFor(p, clock, exec);
  return items.map((i) => ({
    id: i.id,
    title: i.title,
    kind: i.kind,
    startsAt: i.startsAt,
    endsAt: i.endsAt,
    locationType: i.locationType,
    project: i.project ? { id: i.project.id, name: i.project.name } : null,
    day: isoDateIn(new Date(i.startsAt), clock.timeZone) <= clock.today ? 'today' : 'tomorrow',
  }));
}
