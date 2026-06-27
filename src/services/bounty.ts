// Bounty Management Agent — CRUD + queries against the `bounties` Supabase table.
// The DB uses snake_case columns (generated types); this layer maps rows to/from
// the camelCase domain model in src/types. Soft-deletes via deleted_at.
//
// Read queries omit an explicit user filter where RLS already scopes rows to the
// authenticated user; a userId arg is accepted for callers that have it.

import type {
  Bounty,
  BountyCategory,
  BountyStatus,
  NewBounty,
  Platform,
  PrizeUnit,
  Todo,
} from '@/src/types';
import type { Database } from '@/src/types/database';

import { supabase } from './supabase';

const TABLE = 'bounties';

export type BountyRow = Database['public']['Tables']['bounties']['Row'];
type BountyInsert = Database['public']['Tables']['bounties']['Insert'];
type BountyUpdate = Database['public']['Tables']['bounties']['Update'];

/** Map a raw DB row to the domain model (exported for the realtime handler). */
export function mapBountyRow(row: BountyRow): Bounty {
  return toDomain(row);
}

function toDomain(row: BountyRow): Bounty {
  return {
    id: row.id,
    userId: row.user_id,
    bountyName: row.bounty_name,
    platform: (row.platform ?? 'Other') as Platform,
    platformCustomName: row.platform_custom_name ?? undefined,
    deadline: row.deadline,
    prizeAmount: Number(row.prize_amount),
    prizeUnit: (row.prize_unit ?? 'USD') as PrizeUnit,
    prizeInUSD: Number(row.prize_in_usd),
    status: row.status as BountyStatus,
    category: (row.category ?? 'Other') as BountyCategory,
    sourceLink: row.source_link ?? undefined,
    submissionLink: row.submission_link ?? undefined,
    notes: row.notes ?? undefined,
    todos: (row.todos as Todo[] | null) ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

// Map a partial domain object to a DB write payload (only defined keys).
function toRow(patch: Partial<Bounty>): BountyUpdate {
  const row: BountyUpdate = {};
  if (patch.userId !== undefined) row.user_id = patch.userId;
  if (patch.bountyName !== undefined) row.bounty_name = patch.bountyName;
  if (patch.platform !== undefined) row.platform = patch.platform;
  if (patch.platformCustomName !== undefined)
    row.platform_custom_name = patch.platformCustomName ?? null;
  if (patch.deadline !== undefined) row.deadline = patch.deadline;
  if (patch.prizeAmount !== undefined) row.prize_amount = patch.prizeAmount;
  if (patch.prizeUnit !== undefined) row.prize_unit = patch.prizeUnit;
  if (patch.prizeInUSD !== undefined) row.prize_in_usd = patch.prizeInUSD;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.sourceLink !== undefined) row.source_link = patch.sourceLink ?? null;
  if (patch.submissionLink !== undefined) row.submission_link = patch.submissionLink ?? null;
  if (patch.notes !== undefined) row.notes = patch.notes ?? null;
  if (patch.todos !== undefined) row.todos = patch.todos as unknown as BountyRow['todos'];
  if (patch.deletedAt !== undefined) row.deleted_at = patch.deletedAt ?? null;
  return row;
}

// --------------------------------------------------------------------------
// Reads
// --------------------------------------------------------------------------
export async function getBounties(userId?: string): Promise<Bounty[]> {
  let query = supabase.from(TABLE).select('*').is('deleted_at', null);
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query.order('deadline', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toDomain);
}

export async function getBountyById(id: string): Promise<Bounty | null> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? toDomain(data) : null;
}

export async function getBountiesByCategory(
  category: BountyCategory,
  userId?: string
): Promise<Bounty[]> {
  let query = supabase
    .from(TABLE)
    .select('*')
    .is('deleted_at', null)
    .eq('category', category);
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query.order('deadline', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toDomain);
}

/** Full-text-ish search over bounty name and notes (case-insensitive). */
export async function searchBounties(query: string, userId?: string): Promise<Bounty[]> {
  const term = query.trim();
  if (!term) return getBounties(userId);

  // Escape PostgREST `or` reserved chars (commas/parens) in the user term.
  const safe = term.replace(/[,()]/g, ' ');
  let builder = supabase
    .from(TABLE)
    .select('*')
    .is('deleted_at', null)
    .or(`bounty_name.ilike.%${safe}%,notes.ilike.%${safe}%`);
  if (userId) builder = builder.eq('user_id', userId);
  const { data, error } = await builder.order('deadline', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toDomain);
}

// --------------------------------------------------------------------------
// Writes
// --------------------------------------------------------------------------
export async function createBounty(bounty: NewBounty): Promise<Bounty> {
  // user_id + bounty_name + deadline are required by the Insert type.
  const payload = toRow(bounty) as BountyInsert;
  const { data, error } = await supabase.from(TABLE).insert(payload).select().single();
  if (error) throw error;
  return toDomain(data);
}

export async function updateBounty(id: string, updates: Partial<Bounty>): Promise<Bounty> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(toRow(updates))
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toDomain(data);
}

/** Convenience for status transitions (Active → Submitted → Won/Lost, etc.). */
export async function updateBountyStatus(id: string, status: BountyStatus): Promise<Bounty> {
  return updateBounty(id, { status });
}

/** Soft delete (sets deleted_at). */
export async function deleteBounty(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// --------------------------------------------------------------------------
// Export
// --------------------------------------------------------------------------
export type ExportFormat = 'csv' | 'json';
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
  // Quote if it contains a comma, quote, or newline; double up inner quotes.
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toCSV(bounties: Bounty[]): string {
  const header = CSV_COLUMNS.join(',');
  const rows = bounties.map((b) => CSV_COLUMNS.map((col) => csvEscape(b[col])).join(','));
  return [header, ...rows].join('\n');
}

/**
 * Serialize the user's bounties to CSV or JSON. Returns the content plus a
 * suggested filename/mime type so the caller can save or share it (e.g. via
 * expo-file-system + expo-sharing).
 */
export async function exportBounties(
  format: ExportFormat,
  userId?: string
): Promise<ExportResult> {
  const bounties = await getBounties(userId);
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === 'json') {
    return {
      filename: `garap-bounties-${stamp}.json`,
      mimeType: 'application/json',
      content: JSON.stringify(bounties, null, 2),
    };
  }

  return {
    filename: `garap-bounties-${stamp}.csv`,
    mimeType: 'text/csv',
    content: toCSV(bounties),
  };
}
