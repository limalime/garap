// Reusable create/edit bounty form (Bounty Management Agent).
// React Hook Form for field state; Zod (bountySchema / bountyEditSchema) for
// validation on submit. All selects + the date picker are dependency-free.

import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';

import { DatePickerField } from '@/src/components/common/DatePickerField';
import { ThemedText } from '@/src/components/common/ThemedText';
import { SelectField } from '@/src/components/common/SelectField';
import {
  BOUNTY_CATEGORIES,
  BOUNTY_STATUSES,
  PLATFORMS,
  PRIZE_UNITS,
  type Bounty,
  type BountyCategory,
  type BountyStatus,
  type Platform,
  type PrizeUnit,
  type Todo,
} from '@/src/types';
import { colors } from '@/src/utils/colors';
import { bountyEditSchema, bountySchema, type BountyFormValues } from '@/src/utils/validation';

export interface BountyFormInput {
  bountyName: string;
  platform: Platform;
  platformCustomName: string;
  deadline: string;
  prizeAmount: string;
  prizeUnit: PrizeUnit;
  status: BountyStatus;
  category: BountyCategory;
  sourceLink: string;
  submissionLink: string;
  notes: string;
  todos: Todo[];
}

function toInput(b?: Partial<Bounty>): BountyFormInput {
  return {
    bountyName: b?.bountyName ?? '',
    platform: b?.platform ?? 'Other',
    platformCustomName: b?.platformCustomName ?? '',
    deadline: b?.deadline ?? '',
    prizeAmount: b?.prizeAmount != null ? String(b.prizeAmount) : '',
    prizeUnit: b?.prizeUnit ?? 'USD',
    status: b?.status ?? 'Active',
    category: b?.category ?? 'Hackathon',
    sourceLink: b?.sourceLink ?? '',
    submissionLink: b?.submissionLink ?? '',
    notes: b?.notes ?? '',
    todos: b?.todos ?? [],
  };
}

type OpenField = 'platform' | 'prizeUnit' | 'status' | 'category' | 'deadline' | null;

interface BountyFormProps {
  mode: 'create' | 'edit';
  initial?: Partial<Bounty>;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: BountyFormValues) => void;
}

export function BountyForm({ mode, initial, submitting, submitLabel, onSubmit }: BountyFormProps) {
  const { control, handleSubmit, getValues, setError, formState, watch } =
    useForm<BountyFormInput>({
      defaultValues: toInput(initial),
    });
  const [open, setOpen] = useState<OpenField>(null);
  const selectedPlatform = watch('platform');

  const runSubmit = () => {
    const raw = getValues();
    const schema = mode === 'edit' ? bountyEditSchema : bountySchema;
    const parsed = schema.safeParse({ ...raw, prizeAmount: raw.prizeAmount });

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof BountyFormInput;
        setError(field, { message: issue.message });
      }
      return;
    }
    onSubmit(parsed.data as BountyFormValues);
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {/* Bounty name */}
      <Controller
        control={control}
        name="bountyName"
        render={({ field, fieldState }) => (
          <View className="mb-3">
            <ThemedText className="mb-1 ml-1 text-xs font-semibold text-text-secondary">Bounty name</ThemedText>
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              placeholder="e.g. Solana Summer Hackathon"
              placeholderTextColor={colors.textSecondary}
              className="rounded-pill bg-card px-5 py-4 text-base text-text-primary"
            />
            {fieldState.error ? (
              <ThemedText className="ml-4 mt-1 text-xs text-status-lost">{fieldState.error.message}</ThemedText>
            ) : null}
          </View>
        )}
      />

      {/* Platform + Category */}
      <Controller
        control={control}
        name="platform"
        render={({ field, fieldState }) => (
          <SelectField
            label="Platform"
            value={field.value}
            options={PLATFORMS}
            onChange={field.onChange}
            visible={open === 'platform'}
            onOpen={() => setOpen('platform')}
            onClose={() => setOpen(null)}
            error={fieldState.error?.message}
          />
        )}
      />
      {selectedPlatform === 'Other' ? (
        <Controller
          control={control}
          name="platformCustomName"
          render={({ field, fieldState }) => (
            <View className="mb-3">
              <ThemedText className="mb-1 ml-1 text-xs font-semibold text-text-secondary">
                Custom platform
              </ThemedText>
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                placeholder="e.g. Lens, Farcaster"
                placeholderTextColor={colors.textSecondary}
                className="rounded-pill bg-card px-5 py-4 text-base text-text-primary"
              />
              {fieldState.error ? (
                <ThemedText className="ml-4 mt-1 text-xs text-status-lost">
                  {fieldState.error.message}
                </ThemedText>
              ) : null}
            </View>
          )}
        />
      ) : null}
      <Controller
        control={control}
        name="category"
        render={({ field, fieldState }) => (
          <SelectField
            label="Category"
            value={field.value}
            options={BOUNTY_CATEGORIES}
            onChange={field.onChange}
            visible={open === 'category'}
            onOpen={() => setOpen('category')}
            onClose={() => setOpen(null)}
            error={fieldState.error?.message}
          />
        )}
      />

      {/* Deadline */}
      <Controller
        control={control}
        name="deadline"
        render={({ field, fieldState }) => (
          <DatePickerField
            label="Deadline"
            value={field.value || undefined}
            onChange={field.onChange}
            visible={open === 'deadline'}
            onOpen={() => setOpen('deadline')}
            onClose={() => setOpen(null)}
            error={fieldState.error?.message}
          />
        )}
      />

      {/* Prize amount + unit */}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Controller
            control={control}
            name="prizeAmount"
            render={({ field, fieldState }) => (
              <View className="mb-3">
                <ThemedText className="mb-1 ml-1 text-xs font-semibold text-text-secondary">Prize</ThemedText>
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textSecondary}
                  className="rounded-pill bg-card px-5 py-4 text-base text-text-primary"
                />
                {fieldState.error ? (
                  <ThemedText className="ml-4 mt-1 text-xs text-status-lost">{fieldState.error.message}</ThemedText>
                ) : null}
              </View>
            )}
          />
        </View>
        <View className="w-32">
          <Controller
            control={control}
            name="prizeUnit"
            render={({ field, fieldState }) => (
              <SelectField
                label="Unit"
                value={field.value}
                options={PRIZE_UNITS}
                onChange={field.onChange}
                visible={open === 'prizeUnit'}
                onOpen={() => setOpen('prizeUnit')}
                onClose={() => setOpen(null)}
                error={fieldState.error?.message}
              />
            )}
          />
        </View>
      </View>

      {/* Status */}
      <Controller
        control={control}
        name="status"
        render={({ field, fieldState }) => (
          <SelectField
            label="Status"
            value={field.value}
            options={BOUNTY_STATUSES}
            onChange={field.onChange}
            visible={open === 'status'}
            onOpen={() => setOpen('status')}
            onClose={() => setOpen(null)}
            error={fieldState.error?.message}
          />
        )}
      />

      {/* Source link */}
      <Controller
        control={control}
        name="sourceLink"
        render={({ field, fieldState }) => (
          <View className="mb-3">
            <ThemedText className="mb-1 ml-1 text-xs font-semibold text-text-secondary">
              Source link (optional)
            </ThemedText>
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              placeholder="https://…"
              autoCapitalize="none"
              keyboardType="url"
              placeholderTextColor={colors.textSecondary}
              className="rounded-pill bg-card px-5 py-4 text-base text-text-primary"
            />
            {fieldState.error ? (
              <ThemedText className="ml-4 mt-1 text-xs text-status-lost">{fieldState.error.message}</ThemedText>
            ) : null}
          </View>
        )}
      />

      {/* Submission link */}
      <Controller
        control={control}
        name="submissionLink"
        render={({ field, fieldState }) => (
          <View className="mb-3">
            <ThemedText className="mb-1 ml-1 text-xs font-semibold text-text-secondary">
              Submission link (optional)
            </ThemedText>
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              placeholder="https://…"
              autoCapitalize="none"
              keyboardType="url"
              placeholderTextColor={colors.textSecondary}
              className="rounded-pill bg-card px-5 py-4 text-base text-text-primary"
            />
            {fieldState.error ? (
              <ThemedText className="ml-4 mt-1 text-xs text-status-lost">{fieldState.error.message}</ThemedText>
            ) : null}
          </View>
        )}
      />

      {/* Notes */}
      <Controller
        control={control}
        name="notes"
        render={({ field }) => (
          <View className="mb-3">
            <ThemedText className="mb-1 ml-1 text-xs font-semibold text-text-secondary">Notes (optional)</ThemedText>
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Requirements, ideas, links…"
              placeholderTextColor={colors.textSecondary}
              multiline
              className="min-h-[88px] rounded-card bg-card px-5 py-4 text-base text-text-primary"
              style={{ textAlignVertical: 'top' }}
            />
          </View>
        )}
      />

      {/* TODOs */}
      <Controller
        control={control}
        name="todos"
        render={({ field }) => (
          <View className="mb-4">
            <ThemedText className="mb-1 ml-1 text-xs font-semibold text-text-secondary">Checklist</ThemedText>
            {field.value.map((todo, idx) => (
              <View key={todo.id} className="mb-2 flex-row items-center gap-2">
                <Pressable
                  onPress={() => {
                    const next = field.value.slice();
                    next[idx] = { ...todo, completed: !todo.completed };
                    field.onChange(next);
                  }}
                  hitSlop={6}
                >
                  <Ionicons
                    name={todo.completed ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={todo.completed ? colors.status.active : colors.textSecondary}
                  />
                </Pressable>
                <TextInput
                  value={todo.text}
                  onChangeText={(t) => {
                    const next = field.value.slice();
                    next[idx] = { ...todo, text: t };
                    field.onChange(next);
                  }}
                  placeholder="Task…"
                  placeholderTextColor={colors.textSecondary}
                  className="flex-1 rounded-pill bg-card px-4 py-2.5 text-sm text-text-primary"
                />
                <Pressable
                  onPress={() => field.onChange(field.value.filter((_, i) => i !== idx))}
                  hitSlop={6}
                >
                  <Ionicons name="close-circle" size={22} color={colors.status.lost} />
                </Pressable>
              </View>
            ))}
            <Pressable
              onPress={() =>
                field.onChange([
                  ...field.value,
                  { id: Crypto.randomUUID(), text: '', completed: false },
                ])
              }
              className="mt-1 flex-row items-center gap-2 self-start"
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primaryLight} />
              <ThemedText className="text-sm font-semibold text-primary-light">Add item</ThemedText>
            </Pressable>
          </View>
        )}
      />

      {/* Submit */}
      <Pressable
        onPress={handleSubmit(runSubmit)}
        disabled={submitting}
        className="mb-2 h-14 items-center justify-center rounded-pill bg-primary active:opacity-80"
        style={{ opacity: submitting ? 0.6 : 1 }}
      >
        {submitting ? (
          <ActivityIndicator color={colors.textPrimary} />
        ) : (
          <ThemedText className="text-base font-bold text-text-primary">
            {submitLabel ?? (mode === 'create' ? 'Create Bounty' : 'Save Changes')}
          </ThemedText>
        )}
      </Pressable>
      {formState.isSubmitted && Object.keys(formState.errors).length > 0 ? (
        <ThemedText className="mb-2 text-center text-xs text-status-lost">
          Please fix the highlighted fields.
        </ThemedText>
      ) : null}
    </ScrollView>
  );
}
