// Dropdown select (UI State Agent) — a pressable that opens a modal option list.
// Dependency-free so it works identically on native and web.

import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { colors } from '@/src/utils/colors';

interface SelectFieldProps<T extends string> {
  label?: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  placeholder?: string;
  visible: boolean;
  onOpen: () => void;
  onClose: () => void;
  error?: string;
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  visible,
  onOpen,
  onClose,
  error,
}: SelectFieldProps<T>) {
  return (
    <View className="mb-3">
      {label ? (
        <Text className="mb-1 ml-1 text-xs font-semibold text-text-secondary">{label}</Text>
      ) : null}

      <Pressable
        onPress={onOpen}
        className="flex-row items-center justify-between rounded-pill bg-card px-5 py-4"
      >
        <Text className={value ? 'text-base text-text-primary' : 'text-base text-text-secondary'}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </Pressable>
      {error ? <Text className="ml-4 mt-1 text-xs text-status-lost">{error}</Text> : null}

      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable className="flex-1 justify-end bg-black/60" onPress={onClose}>
          <Pressable className="max-h-[60%] rounded-t-card bg-card pb-8 pt-2" onPress={() => {}}>
            <View className="mb-2 items-center pt-2">
              <View className="h-1 w-12 rounded-pill bg-white/20" />
            </View>
            {label ? (
              <Text className="mb-1 px-5 text-sm font-bold text-text-primary">{label}</Text>
            ) : null}
            <ScrollView>
              {options.map((opt) => {
                const active = opt === value;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => {
                      onChange(opt);
                      onClose();
                    }}
                    className="flex-row items-center justify-between px-5 py-4 active:bg-white/5"
                  >
                    <Text
                      className="text-base"
                      style={{ color: active ? colors.primaryLight : colors.textPrimary }}
                    >
                      {opt}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark" size={20} color={colors.primaryLight} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
