// Create / edit note modal (Notes feature). Markdown body with preview toggle,
// freeform tags, optional linked bounty, and copy-to-clipboard.

import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MarkdownPreview } from '@/src/components/common/MarkdownPreview';
import { SelectField } from '@/src/components/common/SelectField';
import { useNoteActions } from '@/src/hooks/useNoteActions';
import { useToast } from '@/src/hooks/useToast';
import { useBountyStore } from '@/src/store/useBountyStore';
import type { Note } from '@/src/types';
import { colors } from '@/src/utils/colors';

const NONE = 'None';

interface NoteEditorModalProps {
  note?: Note; // undefined = create
  onClose: () => void;
}

export function NoteEditorModal({ note, onClose }: NoteEditorModalProps) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { createNote, updateNote } = useNoteActions();
  const bounties = useBountyStore((s) => s.bounties);

  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const [tags, setTags] = useState<string[]>(note?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [linkedBountyId, setLinkedBountyId] = useState<string | undefined>(note?.linkedBountyId);
  const [preview, setPreview] = useState(false);
  const [bountyOpen, setBountyOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const linkedName =
    bounties.find((b) => b.id === linkedBountyId)?.bountyName ?? NONE;
  const bountyOptions = [NONE, ...bounties.map((b) => b.bountyName)];

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '');
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput('');
  };

  const handleSave = async () => {
    if (!title.trim() && !body.trim()) {
      toast('info', 'Add a title or some content first.');
      return;
    }
    setSaving(true);
    try {
      const draft = { title: title.trim(), body, tags, linkedBountyId };
      if (note) await updateNote(note.id, draft);
      else await createNote(draft);
      toast('success', note ? 'Note updated' : 'Note created');
      onClose();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(`${title ? `# ${title}\n\n` : ''}${body}`);
    toast('success', 'Copied to clipboard');
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 8 }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pb-3">
        <Pressable onPress={onClose} hitSlop={8}>
          <Text className="text-base text-text-secondary">Cancel</Text>
        </Pressable>
        <View className="flex-row items-center gap-4">
          <Pressable onPress={() => setPreview((p) => !p)} hitSlop={8}>
            <Ionicons
              name={preview ? 'create-outline' : 'eye-outline'}
              size={22}
              color={colors.textPrimary}
            />
          </Pressable>
          <Pressable onPress={copyToClipboard} hitSlop={8}>
            <Ionicons name="copy-outline" size={20} color={colors.textPrimary} />
          </Pressable>
          <Pressable onPress={handleSave} disabled={saving} hitSlop={8}>
            <Text className="text-base font-bold text-primary-light">{saving ? 'Saving…' : 'Save'}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1 px-5" keyboardShouldPersistTaps="handled">
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={colors.textSecondary}
          className="mb-2 text-2xl font-bold text-text-primary"
        />

        {preview ? (
          <View className="min-h-[200px] rounded-card bg-card p-4">
            <MarkdownPreview source={body || '_Nothing to preview yet._'} />
          </View>
        ) : (
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Write in markdown… # heading, **bold**, - [ ] task"
            placeholderTextColor={colors.textSecondary}
            multiline
            className="min-h-[200px] rounded-card bg-card p-4 text-base text-text-primary"
            style={{ textAlignVertical: 'top' }}
          />
        )}

        {/* Tags */}
        <Text className="mb-1 mt-4 text-xs font-semibold text-text-secondary">Tags</Text>
        <View className="mb-2 flex-row flex-wrap gap-2">
          {tags.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => setTags((prev) => prev.filter((t) => t !== tag))}
              className="flex-row items-center gap-1 rounded-pill bg-primary/15 px-3 py-1"
            >
              <Text className="text-xs font-semibold text-primary-light">#{tag}</Text>
              <Ionicons name="close" size={12} color={colors.primaryLight} />
            </Pressable>
          ))}
        </View>
        <View className="flex-row items-center gap-2 rounded-pill bg-card px-4 py-2">
          <TextInput
            value={tagInput}
            onChangeText={setTagInput}
            onSubmitEditing={addTag}
            placeholder="Add a tag"
            placeholderTextColor={colors.textSecondary}
            className="flex-1 text-text-primary"
            returnKeyType="done"
          />
          <Pressable onPress={addTag} hitSlop={8}>
            <Ionicons name="add-circle" size={22} color={colors.primaryLight} />
          </Pressable>
        </View>

        {/* Linked bounty */}
        <Text className="mb-1 mt-4 text-xs font-semibold text-text-secondary">Linked bounty</Text>
        <SelectField
          value={linkedName}
          options={bountyOptions}
          onChange={(name) => {
            const match = bounties.find((b) => b.bountyName === name);
            setLinkedBountyId(name === NONE ? undefined : match?.id);
          }}
          visible={bountyOpen}
          onOpen={() => setBountyOpen(true)}
          onClose={() => setBountyOpen(false)}
        />

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </View>
  );
}
