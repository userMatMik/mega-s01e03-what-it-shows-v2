// Runs the page's own split (src/lib/kb/split.ts) over the export and writes the evidence and the
// ticket drafts. Local only: it publishes nothing. Run: node tools/analyze.ts
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Report, Tenant } from '../src/lib/kb/causes.ts';
import { splitTicket, TICKETS, type ProblemGroup, type Split } from '../src/lib/kb/split.ts';

const root = join(import.meta.dirname, '..');
const data = join(root, 'src/lib/data');
const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

const reports: Report[] = json(join(data, 'reports-4471.json'));
const tenants: Tenant[] = readdirSync(join(data, 'tenants')).sort().map((f) => json(join(data, 'tenants', f)));
const byHandle = new Map(tenants.map((t) => [t.handle, t]));
const notes: { oneDayMove: string[] } = json(join(data, 'desk-notes.json'));

const split = splitTicket(reports, (r) => byHandle.get(r.tenant), notes.oneDayMove);
const [parser, hint, moved] = split.groups;

const tally = (n: Record<string, number>) =>
  Object.entries(n).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ×${v}`).join(' · ');
const quote = (id: string) => {
  const r = split.groups.flatMap((g) => g.reports).find((x) => x.id === id)!;
  return `- ${r.id} (${r.tenant}, ${r.channel}, ${r.receivedAt.slice(0, 10)}): "${r.body}"`;
};
const facts = (g: ProblemGroup) => `| | |
|---|---|
| Tenants (${g.tenants.length}) | ${g.tenants.map((t) => `\`${t}\``).join(', ')} |
| Channels | ${tally(g.channels)} |
| Received | ${g.firstSeen} → ${g.lastSeen} |
| Intake tagged them as | ${tally(g.taggedAs)} (intake guesses from the browser; the tenant decides the cause) |`;
const ids = (g: ProblemGroup) => `<details><summary>All ${g.ids.length} report ids</summary>

${g.ids.join(', ')}

</details>`;
const source = (s: Split) =>
  `Counted the desk's way, from the kb export of 2026-10-04: ${s.rawRows} rows, ${s.uniqueIds} reports once each id is counted once (${s.exportedTwice.length} were exported twice), every one merged into #${s.ticket}, each in the desk row \`groupByCause\` in \`src/lib/kb/causes.ts\` files it under. Computed by \`src/lib/kb/split.ts\` (\`node tools/analyze.ts\`); page: \`src/routes/kb/incidents/4471-split/+page.svx\`, as the desk sees it: \`rendered/kb/incidents/4471-split.html\`.`;

const drafts: Record<string, string> = {
  '1-parser': `Split from #4471 ("dates parse mm/dd in eu locales"), which the desk merged by subject line and marked known.

**Covers ${parser.ids.length} reports**: the desk's \`${parser.row}\` row for #4471, as exported.

${moved.ids.length} of these ${parser.ids.length} are the reports the desk read as a one-day move (${moved.ids.join(', ')}). The desk files them in this row by tenant, so they are counted here; they are also tracked in #${TICKETS.oneDayMove.number}.

## What happens

The shared parser reads every date month first. Every tenant on file writes the day first, so a booking for 7 April is stored as 4 July. It reaches every tenant, through the app, by email and through the booking-v2 form.

${quote('R-41200')}
${quote('R-41203')}
${quote('R-41212')}

${facts(parser)}

## Fix

Read dates in the tenant's own order (\`dayFirst(locale)\` in \`causes.ts\`), not month first. This is the fix already queued under #4471. It does not reach #${TICKETS.hint.number} or #${TICKETS.oneDayMove.number}.

${ids(parser)}

---
${source(split)}
`,
  '2-hint': `Split from #4471 ("dates parse mm/dd in eu locales"), which the desk merged by subject line and marked known.

**Covers ${hint.ids.length} reports**: the desk's \`${hint.row}\` row for #4471, as exported. The desk's table marks this row "not this ticket — no ticket of its own"; this is that ticket.

## What happens

booking-v3 prints \`MM/DD/YYYY\` under its date field. On a day-first tenant, people type the month first as the hint tells them, and the form reads the date the tenant's way, day first. It comes in only through the booking-v3 form, and it has its own cause: \`DATE_HINT['booking-v3']\` in \`causes.ts\` against a day-first tenant locale. The parser fix in #${TICKETS.parser.number} does not touch it.

${quote('R-41241')}
${quote('R-41305')}

${facts(hint)}

## Fix

Print the tenant's own date order under the field (or use a date picker), and read the field in that same order.

${ids(hint)}

---
${source(split)}
`,
  '3-one-day': `Split from #4471 ("dates parse mm/dd in eu locales"), which the desk merged by subject line and marked known.

**Covers ${moved.ids.length} reports**: the reports the desk read as a one-day move (\`desk-notes.json\`, \`oneDayMove\`). The desk files them in its \`parser\` row by tenant, so #${TICKETS.parser.number} counts them as well.

## What happens

The date moves by one day, or differs between places. A day/month swap never does that: it keeps the date or moves it to another month.

${moved.ids.map(quote).join('\n')}

${facts(moved)}

## Cause

Not established by the export. A time-zone or day-boundary conversion of the invite would fit the same meeting landing on different days in Lisbon and Toronto; check how invite dates move between the tenant's and the recipient's time zone. The parser fix in #${TICKETS.parser.number} does not cover these.

${ids(moved)}

---
${source(split)}
`,
};

mkdirSync(join(root, 'evidence'), { recursive: true });
mkdirSync(join(root, 'issues'), { recursive: true });
writeFileSync(join(root, 'evidence/split.json'), JSON.stringify({ ...split, groups: split.groups.map(({ reports: _, ...g }) => g) }, null, 2) + '\n');
for (const [file, g] of [['1-parser', parser], ['2-hint', hint], ['3-one-day', moved]] as const) {
  const t = TICKETS[g.problem];
  writeFileSync(join(root, `issues/${file}.md`), `# ${t.title} (${g.ids.length} reports)\n\n${drafts[file]}`);
}
console.log(JSON.stringify({ rawRows: split.rawRows, uniqueIds: split.uniqueIds, merged: split.merged, owner: split.owner, tickets: split.groups.map((g) => ({ ticket: TICKETS[g.problem].number, problem: g.problem, reports: g.ids.length })) }));
