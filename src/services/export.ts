// Data export (UI State / Data Sync agents) — CSV + JSON with revenue summary.

import { Share } from 'react-native';

import type { Bounty, RevenueStats } from '@/src/types';

export interface ExportResult {
  filename: string;
  mimeType: string;
  content: string;
}

const CSV_COLUMNS: (keyof Bounty)[] = [
  'id',
  'bountyName',
  'platform',
  'category',
  'status',
  'deadline',
  'prizeAmount',
  'prizeUnit',
  'prizeInUSD',
  'submissionLink',
  'notes',
  'createdAt',
  'updatedAt',
];

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Bounties as CSV, with a leading revenue-summary comment block. */
export function exportToCSV(bounties: Bounty[], revenue?: RevenueStats): ExportResult {
  const header = CSV_COLUMNS.join(',');
  const rows = bounties.map((b) => CSV_COLUMNS.map((c) => csvEscape(b[c])).join(','));

  const summary: string[] = [];
  if (revenue) {
    summary.push(
      `# Total Revenue (USD),${revenue.totalRevenueUSD}`,
      `# Win Rate (%),${revenue.winRate}`,
      `# Won Bounties,${revenue.wonCount}`,
      '#'
    );
  }

  return {
    filename: `garap-bounties-${stamp()}.csv`,
    mimeType: 'text/csv',
    content: [...summary, header, ...rows].join('\n'),
  };
}

/** Bounties + revenue as a single JSON document. */
export function exportToJSON(bounties: Bounty[], revenue?: RevenueStats): ExportResult {
  const doc = {
    app: 'Garap',
    exportedAt: new Date().toISOString(),
    revenue: revenue ?? null,
    bountyCount: bounties.length,
    bounties,
  };
  return {
    filename: `garap-export-${stamp()}.json`,
    mimeType: 'application/json',
    content: JSON.stringify(doc, null, 2),
  };
}

/** Open the OS share sheet with an export's content. */
export async function shareExport(result: ExportResult): Promise<void> {
  await Share.share({ title: result.filename, message: result.content });
}
