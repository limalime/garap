// Notes service — CRUD against the `notes` Supabase table (snake_case ↔ camel).

import type { Note } from '@/src/types';
import type { Database } from '@/src/types/database';

import { supabase } from './supabase';

const TABLE = 'notes';

export type NoteRow = Database['public']['Tables']['notes']['Row'];
type NoteInsert = Database['public']['Tables']['notes']['Insert'];
type NoteUpdate = Database['public']['Tables']['notes']['Update'];

export function mapNoteRow(row: NoteRow): Note {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    tags: row.tags ?? [],
    linkedBountyId: row.linked_bounty_id ?? undefined,
    pinned: row.pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function toRow(patch: Partial<Note>): NoteUpdate {
  const row: NoteUpdate = {};
  if (patch.userId !== undefined) row.user_id = patch.userId;
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.body !== undefined) row.body = patch.body;
  if (patch.tags !== undefined) row.tags = patch.tags;
  if (patch.linkedBountyId !== undefined) row.linked_bounty_id = patch.linkedBountyId ?? null;
  if (patch.pinned !== undefined) row.pinned = patch.pinned;
  if (patch.deletedAt !== undefined) row.deleted_at = patch.deletedAt ?? null;
  return row;
}

export async function getNotes(userId?: string): Promise<Note[]> {
  let query = supabase.from(TABLE).select('*').is('deleted_at', null);
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapNoteRow);
}

export async function createNote(
  note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'pinned'> & { pinned?: boolean }
): Promise<Note> {
  const payload = toRow(note) as NoteInsert;
  const { data, error } = await supabase.from(TABLE).insert(payload).select().single();
  if (error) throw error;
  return mapNoteRow(data);
}

export async function updateNote(id: string, patch: Partial<Note>): Promise<Note> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(toRow(patch))
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapNoteRow(data);
}

export async function togglePin(id: string, pinned: boolean): Promise<Note> {
  return updateNote(id, { pinned });
}

/** Soft delete (sets deleted_at). */
export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
