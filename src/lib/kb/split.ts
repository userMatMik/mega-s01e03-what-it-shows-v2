// How a merged ticket splits into one ticket per problem. Counts are the desk's own view (CauseTable):
// one report per id, placed by causes.ts. The page and tools/analyze.ts both run this file.
import { groupByCause, readAs, ticketCause, uniqueById, type Report, type Tenant } from './causes.ts';

export type Problem = 'parser' | 'hint' | 'oneDayMove';

// The tickets filed for #4471's problems, in the order they were opened.
export const TICKETS: Record<Problem, { number: number; title: string }> = {
  parser: { number: 1, title: 'Dates are parsed month first, so day-first tenants get day and month flipped' },
  hint: { number: 2, title: 'booking-v3 form hint says MM/DD/YYYY but the form reads day first' },
  oneDayMove: { number: 3, title: 'Invites shift by one day across dates or locations' },
};

export type ProblemGroup = {
  problem: Problem;
  // The desk row these reports sit in.
  row: string;
  reports: Report[];
  ids: string[];
  tenants: string[];
  channels: Record<string, number>;
  taggedAs: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

export type Split = {
  ticket: number;
  rawRows: number;
  uniqueIds: number;
  exportedTwice: string[];
  merged: number;
  owner: string | null;
  groups: ProblemGroup[];
};

const tally = (rs: Report[], key: (r: Report) => string) =>
  rs.reduce<Record<string, number>>((n, r) => ({ ...n, [key(r)]: (n[key(r)] ?? 0) + 1 }), {});

function group(problem: Problem, row: string, reports: Report[]): ProblemGroup {
  const days = reports.map((r) => r.receivedAt.slice(0, 10)).sort();
  return {
    problem,
    row,
    reports,
    ids: reports.map((r) => r.id).sort(),
    tenants: [...new Set(reports.map((r) => r.tenant))].sort(),
    channels: tally(reports, (r) => r.channel),
    taggedAs: tally(reports, (r) => r.meta.intakeTag),
    firstSeen: days[0],
    lastSeen: days[days.length - 1],
  };
}

export function splitTicket(
  rows: Report[],
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
  ticket = 4471,
): Split {
  // An id exported twice must be the same report both times, or the export is not one snapshot.
  const first = new Map<string, string>();
  const exportedTwice = new Set<string>();
  for (const r of rows) {
    const seen = first.get(r.id);
    if (seen !== undefined && seen !== JSON.stringify(r)) throw new Error(`${r.id} is exported twice with different data`);
    if (seen !== undefined) exportedTwice.add(r.id);
    first.set(r.id, JSON.stringify(r));
  }
  const unique = uniqueById(rows);
  const merged = unique.filter((r) => r.mergedInto === ticket);
  const causes = groupByCause(merged, tenantOf);
  const unplaced = causes.find((g) => g.cause === 'unplaced');
  if (unplaced) throw new Error(`${unplaced.reports.length} reports merged into #${ticket} have no cause: check the tenant directory`);
  const missing = oneDayMove.filter((id) => !merged.some((r) => r.id === id));
  if (missing.length) throw new Error(`desk notes name reports not merged into #${ticket}: ${missing.join(', ')}`);

  const byCause = (cause: string) => causes.find((g) => g.cause === cause);
  const parser = byCause('parser');
  const hint = byCause('hint');
  if (!parser || !hint) throw new Error(`#${ticket} no longer has both desk rows, parser and hint`);
  // The desk reads the one-day moves differently but files them in the row of their cause (readAs).
  const movedRows = causes.filter((g) => readAs(g, oneDayMove) > 0).map((g) => g.cause);
  const moved = merged.filter((r) => oneDayMove.includes(r.id));

  return {
    ticket,
    rawRows: rows.length,
    uniqueIds: unique.length,
    exportedTwice: [...exportedTwice].sort(),
    merged: merged.length,
    owner: ticketCause(causes, ticket),
    groups: [
      group('parser', 'parser', parser.reports),
      group('hint', 'hint', hint.reports),
      group('oneDayMove', `${movedRows.join(', ')}, read as a one-day move`, moved),
    ],
  };
}
