/**
 * Events list filters in the URL (Indonesian keys and values) and their API query. The default
 * (upcoming, no kind, no project, no search) leaves the URL, so a clean list has a clean address.
 */
import { EVENT_SEARCH_MAX, type EventTab } from '@server/event/events.dto';
import { EVENT_KINDS, type EventKind } from '@server/pm/enums';
import { type FilterPatch, readEnum, readString } from './use-url-filters';

export const EVENT_FILTER_PARAMS = {
  time: 'waktu',
  kind: 'jenis',
  project: 'proyek',
  q: 'q',
} as const;

/** URL word → API tab. */
const TIME_SLUGS = { 'akan-datang': 'upcoming', lewat: 'past' } as const satisfies Record<
  string,
  EventTab
>;
export type EventTimeSlug = keyof typeof TIME_SLUGS;
export const EVENT_TIME_SLUGS = Object.keys(TIME_SLUGS) as EventTimeSlug[];

/** Rows per keyset page; the server default is smaller, the plan (P6 §5) asks for 30. */
export const EVENT_PAGE_SIZE = 30;

export type EventFilters = {
  waktu: EventTimeSlug;
  /** One kind, or '' for every kind. */
  jenis: EventKind | '';
  /** Project id; '' = every project the viewer can see. */
  proyek: string;
  q: string;
};

export const DEFAULT_EVENT_FILTERS: EventFilters = {
  waktu: 'akan-datang',
  jenis: '',
  proyek: '',
  q: '',
};

/** URL → filters; unknown values (typos, old links) fall back to the defaults. */
export function parseEventFilters(sp: URLSearchParams): EventFilters {
  const P = EVENT_FILTER_PARAMS;
  return {
    waktu: readEnum(sp, P.time, EVENT_TIME_SLUGS, DEFAULT_EVENT_FILTERS.waktu),
    jenis: readEnum<EventKind | ''>(sp, P.kind, EVENT_KINDS, ''),
    proyek: readString(sp, P.project),
    q: readString(sp, P.q).slice(0, EVENT_SEARCH_MAX),
  };
}

/** Query for `GET /api/app/events` without the cursor, which belongs to the page being fetched. */
export type EventListQuery = {
  tab: EventTab;
  kind?: EventKind;
  projectId?: string;
  q?: string;
  limit: number;
};

export function toEventQuery(f: EventFilters): EventListQuery {
  return {
    tab: TIME_SLUGS[f.waktu],
    ...(f.jenis ? { kind: f.jenis } : {}),
    ...(f.proyek ? { projectId: f.proyek } : {}),
    ...(f.q.trim() ? { q: f.q.trim() } : {}),
    limit: EVENT_PAGE_SIZE,
  };
}

/** True when a kind, a project or a search narrows the list, so an empty result offers "Hapus saringan". */
export function hasEventFilters(f: EventFilters): boolean {
  return f.jenis !== '' || f.proyek !== '' || f.q.trim() !== '';
}

/** URL change that clears kind, project and search; the chosen tab stays. */
export const clearEventFiltersPatch = (): FilterPatch => ({
  [EVENT_FILTER_PARAMS.kind]: null,
  [EVENT_FILTER_PARAMS.project]: null,
  [EVENT_FILTER_PARAMS.q]: null,
});

/** The tab slug as the URL stores it: the default leaves the address. */
export const timePatch = (slug: EventTimeSlug): FilterPatch => ({
  [EVENT_FILTER_PARAMS.time]: slug === DEFAULT_EVENT_FILTERS.waktu ? null : slug,
});
