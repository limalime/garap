// Notes screen — searchable, taggable, sortable note list with a markdown editor.

import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { NoteCard } from '@/src/components/notes/NoteCard';
import { NoteEditorModal } from '@/src/components/notes/NoteEditorModal';
import { FAB } from '@/src/components/common/FAB';
import { TopBar } from '@/src/components/common/TopBar';
import { useNoteActions } from '@/src/hooks/useNoteActions';
import { useToast } from '@/src/hooks/useToast';
import {
  selectAllTags,
  selectVisibleNotes,
  useNoteStore,
} from '@/src/store/useNoteStore';
import type { Note } from '@/src/types';
import { colors } from '@/src/utils/colors';

type Editing = { mode: 'create' } | { mode: 'edit'; note: Note } | null;

export function NotesScreen() {
  const toast = useToast();
  const { togglePin, deleteNote } = useNoteActions();

  const searchQuery = useNoteStore((s) => s.searchQuery);
  const setSearch = useNoteStore((s) => s.setSearch);
  const sort = useNoteStore((s) => s.sort);
  const setSort = useNoteStore((s) => s.setSort);
  const tagFilter = useNoteStore((s) => s.tagFilter);
  const setTagFilter = useNoteStore((s) => s.setTagFilter);
  const state = useNoteStore();

  const notes = useMemo(() => selectVisibleNotes(state), [state]);
  const tags = useMemo(() => selectAllTags(state), [state]);
  const totalCount = state.notes.length;

  const [editing, setEditing] = useState<Editing>(null);

  const handleDelete = (note: Note) => {
    Alert.alert('Delete note', 'Delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteNote(note);
            toast('success', 'Note deleted');
          } catch {
            toast('error', 'Delete failed');
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-background">
      <TopBar title="Notes" showSettings={false} />

      {/* Search */}
      <View className="mx-5 mb-2 flex-row items-center gap-2 rounded-pill bg-card px-4 py-3">
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearch}
          placeholder="Search notes"
          placeholderTextColor={colors.textSecondary}
          className="flex-1 text-text-primary"
        />
        <Pressable onPress={() => setSort(sort === 'newest' ? 'oldest' : 'newest')} hitSlop={8}>
          <Ionicons
            name={sort === 'newest' ? 'arrow-down' : 'arrow-up'}
            size={18}
            color={colors.primaryLight}
          />
        </Pressable>
      </View>

      {/* Tag filter row */}
      {tags.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 px-5"
          className="mb-2 max-h-10 grow-0"
        >
          {tags.map((tag) => {
            const active = tagFilter === tag;
            return (
              <Pressable
                key={tag}
                onPress={() => setTagFilter(active ? null : tag)}
                className="h-8 justify-center rounded-pill px-3"
                style={{ backgroundColor: active ? colors.primary : colors.card }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: active ? colors.textPrimary : colors.textSecondary }}
                >
                  #{tag}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            onPress={(n) => setEditing({ mode: 'edit', note: n })}
            onTogglePin={(n) => togglePin(n).catch(() => toast('error', 'Pin failed'))}
            onDelete={handleDelete}
          />
        )}
        contentContainerClassName="gap-3 px-5 pb-32"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="mt-24 items-center px-8">
            <Ionicons name="document-text-outline" size={40} color={colors.textSecondary} />
            <Text className="mt-3 text-base font-bold text-text-primary">
              {totalCount === 0 ? 'No notes yet' : 'No matching notes'}
            </Text>
            <Text className="mt-1 text-center text-sm text-text-secondary">
              {totalCount === 0 ? 'Tap + to write your first note.' : 'Try a different search or tag.'}
            </Text>
          </View>
        }
      />

      <FAB onPress={() => setEditing({ mode: 'create' })} />

      <Modal
        visible={editing !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditing(null)}
      >
        {editing ? (
          <NoteEditorModal
            note={editing.mode === 'edit' ? editing.note : undefined}
            onClose={() => setEditing(null)}
          />
        ) : null}
      </Modal>
    </View>
  );
}
