// Notes store (Zustand) — local note cache + search/tag/sort state.

import { create } from 'zustand';

import type { Note } from '@/src/types';

export type NoteSort = 'newest' | 'oldest';

interface NoteState {
  notes: Note[];
  searchQuery: string;
  tagFilter: string | null;
  sort: NoteSort;
  loading: boolean;
  error: string | null;

  setNotes: (notes: Note[]) => void;
  upsertNote: (note: Note) => void;
  removeNote: (id: string) => void;
  setSearch: (q: string) => void;
  setTagFilter: (tag: string | null) => void;
  setSort: (sort: NoteSort) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useNoteStore = create<NoteState>((set) => ({
  notes: [],
  searchQuery: '',
  tagFilter: null,
  sort: 'newest',
  loading: false,
  error: null,

  setNotes: (notes) => set({ notes }),
  upsertNote: (note) =>
    set((state) => {
      if (note.deletedAt) {
        return { notes: state.notes.filter((n) => n.id !== note.id) };
      }
      const idx = state.notes.findIndex((n) => n.id === note.id);
      if (idx === -1) return { notes: [note, ...state.notes] };
      const existing = state.notes[idx];
      if (new Date(note.updatedAt).getTime() < new Date(existing.updatedAt).getTime()) {
        return state;
      }
      const next = state.notes.slice();
      next[idx] = note;
      return { notes: next };
    }),
  removeNote: (id) => set((state) => ({ notes: state.notes.filter((n) => n.id !== id) })),
  setSearch: (searchQuery) => set({ searchQuery }),
  setTagFilter: (tagFilter) => set({ tagFilter }),
  setSort: (sort) => set({ sort }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

/** All distinct tags across notes (for the filter row). */
export function selectAllTags(state: NoteState): string[] {
  const set = new Set<string>();
  for (const note of state.notes) for (const tag of note.tags) set.add(tag);
  return Array.from(set).sort();
}

/** Notes after search + tag filter + sort. Pinned always float to the top. */
export function selectVisibleNotes(state: NoteState): Note[] {
  const q = state.searchQuery.trim().toLowerCase();
  const filtered = state.notes.filter((n) => {
    if (state.tagFilter && !n.tags.includes(state.tagFilter)) return false;
    if (q) {
      const haystack = `${n.title} ${n.body} ${n.tags.join(' ')}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
  const dir = state.sort === 'newest' ? -1 : 1;
  return filtered.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return dir * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
  });
}
