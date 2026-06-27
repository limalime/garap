// Notes — optimistic create/update/delete/pin. Lighter than bounties (no offline
// queue); realtime + refetch reconcile the store with the server.

import { useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useCallback } from 'react';

import { notesQueryKey } from '@/src/hooks/useNotes';
import {
  createNote as createNoteApi,
  deleteNote as deleteNoteApi,
  togglePin as togglePinApi,
  updateNote as updateNoteApi,
} from '@/src/services/note';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useNoteStore } from '@/src/store/useNoteStore';
import type { Note } from '@/src/types';

export interface NoteDraft {
  title: string;
  body: string;
  tags: string[];
  linkedBountyId?: string;
}

export function useNoteActions() {
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: notesQueryKey(userId) }),
    [queryClient, userId]
  );

  const createNote = useCallback(
    async (draft: NoteDraft): Promise<Note> => {
      if (!userId) throw new Error('You must be signed in.');
      const store = useNoteStore.getState();
      const now = new Date().toISOString();
      const optimistic: Note = {
        id: Crypto.randomUUID(),
        userId,
        title: draft.title,
        body: draft.body,
        tags: draft.tags,
        linkedBountyId: draft.linkedBountyId,
        pinned: false,
        createdAt: now,
        updatedAt: now,
      };
      store.upsertNote(optimistic);
      try {
        const saved = await createNoteApi({ ...draft, userId });
        store.removeNote(optimistic.id);
        store.upsertNote(saved);
        void invalidate();
        return saved;
      } catch (err) {
        store.removeNote(optimistic.id);
        throw err;
      }
    },
    [userId, invalidate]
  );

  const updateNote = useCallback(
    async (id: string, patch: Partial<Note>): Promise<void> => {
      const store = useNoteStore.getState();
      const prev = store.notes.find((n) => n.id === id);
      store.upsertNote({ ...(prev as Note), ...patch, updatedAt: new Date().toISOString() });
      try {
        const saved = await updateNoteApi(id, patch);
        store.upsertNote(saved);
        void invalidate();
      } catch (err) {
        if (prev) store.upsertNote(prev);
        throw err;
      }
    },
    [invalidate]
  );

  const togglePin = useCallback(
    async (note: Note): Promise<void> => {
      const store = useNoteStore.getState();
      store.upsertNote({ ...note, pinned: !note.pinned, updatedAt: new Date().toISOString() });
      try {
        await togglePinApi(note.id, !note.pinned);
        void invalidate();
      } catch (err) {
        store.upsertNote(note);
        throw err;
      }
    },
    [invalidate]
  );

  const deleteNote = useCallback(
    async (note: Note): Promise<void> => {
      const store = useNoteStore.getState();
      store.removeNote(note.id);
      try {
        await deleteNoteApi(note.id);
        void invalidate();
      } catch (err) {
        store.upsertNote(note);
        throw err;
      }
    },
    [invalidate]
  );

  return { createNote, updateNote, togglePin, deleteNote };
}
