<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import type { Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { splitTicket, TICKETS } from '#lib/kb/split';

  let { ticket }: { ticket: number } = $props();

  const split = $derived(splitTicket(reports as Report[], tenantOf, notes.oneDayMove, ticket));
  const label = { parser: 'dates read month first', hint: 'booking-v3 hint asks for the month first', oneDayMove: 'one-day move' };
</script>

<p class="sum">
  <strong>{split.merged}</strong> reports merged into #{ticket} ({split.rawRows} rows exported, {split.exportedTwice.length}
  reports listed twice) · <strong>{split.groups.length}</strong> tickets
</p>

<table>
  <thead>
    <tr><th>problem</th><th>desk row</th><th>reports</th><th>tenants</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each split.groups as g (g.problem)}
      <tr>
        <td>{label[g.problem]}</td>
        <td><code>{g.row}</code></td>
        <td>{g.reports.length}</td>
        <td>{g.tenants.length}</td>
        <td>{g.firstSeen} → {g.lastSeen}</td>
        <td>#{TICKETS[g.problem].number}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .sum { font-size: 1.1rem; }
</style>
