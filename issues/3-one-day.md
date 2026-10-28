# Invites shift by one day across dates or locations (5 reports)

Split from #4471 ("dates parse mm/dd in eu locales"), which the desk merged by subject line and marked known.

**Covers 5 reports**: the reports the desk read as a one-day move (`desk-notes.json`, `oneDayMove`). The desk files them in its `parser` row by tenant, so #1 counts them as well.

## What happens

The date moves by one day, or differs between places. A day/month swap never does that: it keeps the date or moves it to another month.

- R-41202 (kettle.books, email, 2026-04-02): "Invite says Tuesday 12 May. Calendar says Monday 11 May. My client turned up on the Monday. We had coffee."
- R-41209 (alder.physio, app, 2026-04-06): "Every booking in June is one day off. Only June. Why only June."
- R-41236 (nine.lanterns, app, 2026-04-20): "The invite arrived before I made the booking. I would like to know how."
- R-41344 (pale.harbour, email, 2026-06-12): "Client in Lisbon got Tuesday. Client in Toronto got Monday. Same meeting. We held it twice."
- R-41620 (lantern.row, email, 2026-10-04): "Tuesday 6 October showed as Monday. I moved it myself. I have stopped reporting these but my colleague says it helps you."

| | |
|---|---|
| Tenants (5) | `alder.physio`, `kettle.books`, `lantern.row`, `nine.lanterns`, `pale.harbour` |
| Channels | email ×3 · app ×2 |
| Received | 2026-04-02 → 2026-10-04 |
| Intake tagged them as | parser ×5 (intake guesses from the browser; the tenant decides the cause) |

## Cause

Not established by the export. A time-zone or day-boundary conversion of the invite would fit the same meeting landing on different days in Lisbon and Toronto; check how invite dates move between the tenant's and the recipient's time zone. The parser fix in #1 does not cover these.

<details><summary>All 5 report ids</summary>

R-41202, R-41209, R-41236, R-41344, R-41620

</details>

---
Counted the desk's way, from the kb export of 2026-10-04: 427 rows, 412 reports once each id is counted once (15 were exported twice), every one merged into #4471, each in the desk row `groupByCause` in `src/lib/kb/causes.ts` files it under. Computed by `src/lib/kb/split.ts` (`node tools/analyze.ts`); page: `src/routes/kb/incidents/4471-split/+page.svx`, as the desk sees it: `rendered/kb/incidents/4471-split.html`.
