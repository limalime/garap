// Note list card with swipe actions (Notes feature).

import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import type { Note } from '@/src/types';
import { colors } from '@/src/utils/colors';
import { formatShortDate, truncate } from '@/src/utils/formatting';

interface NoteCardProps {
  note: Note;
  onPress: (note: Note) => void;
  onTogglePin: (note: Note) => void;
  onDelete: (note: Note) => void;
}

export function NoteCard({ note, onPress, onTogglePin, onDelete }: NoteCardProps) {
  const firstLine = note.title || note.body.split('\n')[0] || 'Untitled';
  const preview = note.body.replace(/\n+/g, ' ').trim();

  const rightActions = () => (
    <View className="flex-row overflow-hidden rounded-r-card">
      <Pressable
        onPress={() => onTogglePin(note)}
        className="h-full w-[72px] items-center justify-center gap-1"
        style={{ backgroundColor: colors.status.won }}
      >
        <Ionicons name={note.pinned ? 'star' : 'star-outline'} size={20} color="#FFFFFF" />
        <Text className="text-[10px] font-semibold text-white">{note.pinned ? 'Unpin' : 'Pin'}</Text>
      </Pressable>
      <Pressable
        onPress={() => onDelete(note)}
        className="h-full w-[72px] items-center justify-center gap-1"
        style={{ backgroundColor: colors.status.lost }}
      >
        <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
        <Text className="text-[10px] font-semibold text-white">Delete</Text>
      </Pressable>
    </View>
  );

  return (
    <ReanimatedSwipeable renderRightActions={rightActions} overshootRight={false} friction={2}>
      <Pressable onPress={() => onPress(note)} className="rounded-card bg-card p-4 active:opacity-80">
        <View className="flex-row items-start justify-between">
          <Text className="flex-1 pr-2 text-base font-bold text-text-primary" numberOfLines={1}>
            {firstLine}
          </Text>
          {note.pinned ? <Ionicons name="star" size={16} color={colors.status.won} /> : null}
        </View>

        {preview ? (
          <Text className="mt-1 text-sm text-text-secondary" numberOfLines={2}>
            {truncate(preview, 120)}
          </Text>
        ) : null}

        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-1 flex-row flex-wrap gap-1.5">
            {note.tags.slice(0, 3).map((tag) => (
              <View key={tag} className="rounded-pill bg-primary/15 px-2 py-0.5">
                <Text className="text-[10px] font-semibold text-primary-light">#{tag}</Text>
              </View>
            ))}
          </View>
          <Text className="text-[11px] text-text-secondary">{formatShortDate(note.updatedAt)}</Text>
        </View>
      </Pressable>
    </ReanimatedSwipeable>
  );
}
