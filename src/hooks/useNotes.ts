// Notes data hook — React Query fetch + store mirror + realtime subscription.

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getNotes, mapNoteRow, type NoteRow } from '@/src/services/note';
import { supabase } from '@/src/services/supabase';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useNoteStore } from '@/src/store/useNoteStore';

export const notesQueryKey = (userId?: string) => ['notes', userId] as const;

export function useNotes() {
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const setNotes = useNoteStore((s) => s.setNotes);
  const setLoading = useNoteStore((s) => s.setLoading);
  const setError = useNoteStore((s) => s.setError);

  const query = useQuery({
    queryKey: notesQueryKey(userId),
    queryFn: () => getNotes(userId!),
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (query.data) setNotes(query.data);
  }, [query.data, setNotes]);

  useEffect(() => {
    setLoading(query.isFetching);
  }, [query.isFetching, setLoading]);

  useEffect(() => {
    setError(query.error ? (query.error as Error).message : null);
  }, [query.error, setError]);

  useEffect(() => {
    if (!userId) return;
    const upsertNote = useNoteStore.getState().upsertNote;
    const removeNote = useNoteStore.getState().removeNote;

    const channel = supabase
      .channel(`notes:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const old = payload.old as Partial<NoteRow>;
            if (old?.id) removeNote(old.id);
            return;
          }
          upsertNote(mapNoteRow(payload.new as NoteRow));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return query;
}
