# #4471, split one ticket per problem

The support desk merged 412 date reports into #4471 by subject line and marked it known. Counted the
desk's own way, with its kb as exported on 4 October 2026, they are three problems:

| ticket | problem | reports | desk row |
|---|---|---|---|
| #1 | the shared parser reads dates month first | 379 | `parser` |
| #2 | booking-v3's date hint asks for the month first, the form reads day first | 33 | `hint` |
| #3 | the date moves by one day | 5 | `parser`, read as a one-day move |

- **The desk's own view** is `CauseTable` over `reports-4471.json`. It counts one report per id: the
  export has 427 rows, and 15 reports are listed twice, which leaves 412. Each report goes in the row
  `causes.ts` gives it by tenant and channel, never by subject or intake tag.
- **The one-day moves** are the five reports `desk-notes.json` lists as `oneDayMove`. The desk files them
  in the `parser` row, so #1 counts them. Their bodies show a one-day move, not a swap, so they also have
  a ticket of their own. The export does not say what causes them.

## Where things are

- `src/routes/kb/incidents/4471-split/+page.svx`: the signed page. As the desk sees it:
  `rendered/kb/incidents/4471-split.html`.
- `src/lib/kb/split.ts`: the split, built on the desk's own `causes.ts`. The page renders it
  (`SplitTable.svelte`), and `tools/analyze.ts` writes it to `evidence/split.json` and the ticket drafts in
  `issues/`.
- `tools/verify.ts`: checks the counts, the drafts, the signature and the render.

```
npm install && npm run analyze && npm run build && npm run verify
```

Everything in `src/` is the export as received, except what this split adds: the page, `split.ts`,
`SplitTable.svelte`, and the build frame `src/app.html` and `src/routes/+layout.js`.
