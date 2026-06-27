// Reusable confirmation dialog (UI State Agent). Supports a simple confirm and a
// "type a word to confirm" variant for destructive actions like account deletion.

import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native';

import { colors } from '@/src/utils/colors';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** When set, the confirm button is disabled until the user types this exact word. */
  requireText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  requireText,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');
  const canConfirm = !requireText || typed === requireText;
  const confirmColor = destructive ? colors.status.lost : colors.primary;

  const handleCancel = () => {
    setTyped('');
    onCancel();
  };
  const handleConfirm = () => {
    if (!canConfirm) return;
    setTyped('');
    onConfirm();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <Pressable className="flex-1 items-center justify-center bg-black/60 px-8" onPress={handleCancel}>
        <Pressable className="w-full rounded-card bg-card p-5" onPress={() => {}}>
          <Text className="text-lg font-bold text-text-primary">{title}</Text>
          <Text className="mt-2 text-sm leading-5 text-text-secondary">{message}</Text>

          {requireText ? (
            <TextInput
              value={typed}
              onChangeText={setTyped}
              placeholder={`Type "${requireText}" to confirm`}
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
              autoCorrect={false}
              className="mt-4 rounded-pill bg-background px-4 py-3 text-base text-text-primary"
            />
          ) : null}

          <View className="mt-5 flex-row gap-3">
            <Pressable
              onPress={handleCancel}
              className="flex-1 items-center rounded-pill bg-background py-3"
            >
              <Text className="font-bold text-text-primary">{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              disabled={!canConfirm || loading}
              className="flex-1 items-center rounded-pill py-3"
              style={{ backgroundColor: confirmColor, opacity: !canConfirm || loading ? 0.5 : 1 }}
            >
              {loading ? (
                <ActivityIndicator color={colors.textPrimary} />
              ) : (
                <Text className="font-bold text-text-primary">{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
