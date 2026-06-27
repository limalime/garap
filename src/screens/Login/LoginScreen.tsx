// Login / Sign Up — email/password + Google/GitHub OAuth (Authentication Agent).
// Dark violet theme, Zod-validated forms, spinner loading states, toast errors.

import { zodResolver } from '@hookform/resolvers/zod';
import { FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/src/components/common/ThemedText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/src/hooks/useToast';
import {
  resetPassword,
  signInEmail,
  signInGitHub,
  signInGoogle,
  signUpEmail,
} from '@/src/services/auth';
import { useAuthStore } from '@/src/store/useAuthStore';
import { colors } from '@/src/utils/colors';
import { Wordmark } from '@/src/components/common/Wordmark';
import { signInSchema, signUpSchema, type SignInValues, type SignUpValues } from '@/src/utils/validation';

type Mode = 'signin' | 'signup';

interface FieldProps {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'email-address' | 'default';
  autoCapitalize?: 'none' | 'words';
}

function Field({ error, ...input }: FieldProps) {
  return (
    <View className="mb-3">
      <TextInput
        {...input}
        placeholderTextColor={colors.textSecondary}
        className="rounded-pill bg-card px-5 py-4 text-base text-text-primary"
      />
      {error ? <ThemedText className="ml-4 mt-1 text-xs text-status-lost">{error}</ThemedText> : null}
    </View>
  );
}

function OAuthButton({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: 'google' | 'github';
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="mb-3 flex-row items-center justify-center gap-3 rounded-pill border border-white/10 bg-card py-4 active:opacity-70"
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <FontAwesome name={icon} size={18} color={colors.textPrimary} />
      <ThemedText className="text-base font-semibold text-text-primary">{label}</ThemedText>
    </Pressable>
  );
}

export function LoginScreen() {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const setLoading = useAuthStore((s) => s.setLoading);

  const [mode, setMode] = useState<Mode>('signin');
  const [busy, setBusy] = useState<null | 'email' | 'google' | 'github'>(null);
  const isSignUp = mode === 'signup';

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });
  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '', displayName: '' },
  });

  const withBusy = async (which: 'email' | 'google' | 'github', fn: () => Promise<void>) => {
    setBusy(which);
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(null);
      setLoading(false);
    }
  };

  const onSignIn = (values: SignInValues) =>
    withBusy('email', async () => {
      await signInEmail(values.email, values.password);
      // Navigation is handled by the AuthGate once the session lands.
    });

  const onSignUp = (values: SignUpValues) =>
    withBusy('email', async () => {
      const result = await signUpEmail(values.email, values.password, values.displayName);
      if (!result.session) {
        // Email confirmation required — no session returned.
        toast('success', 'Check your email to confirm your account.');
        setMode('signin');
      }
    });

  const onGoogle = () => withBusy('google', async () => void (await signInGoogle()));
  const onGitHub = () => withBusy('github', async () => void (await signInGitHub()));

  const onForgotPassword = async () => {
    const email = signInForm.getValues('email').trim();
    if (!email) {
      toast('info', 'Enter your email first, then tap Forgot Password.');
      return;
    }
    try {
      await resetPassword(email);
      toast('success', 'Password reset link sent.');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Could not send reset link');
    }
  };

  const anyBusy = busy !== null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6"
        style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Wordmark */}
        <View className="items-center">
          <Wordmark height={48} />
        </View>
        <ThemedText className="mb-8 mt-4 text-center text-sm text-text-secondary">
          {isSignUp ? 'Create your account' : 'Track. Submit. Win.'}
        </ThemedText>

        {isSignUp ? (
          <>
            <Controller
              control={signUpForm.control}
              name="displayName"
              render={({ field, fieldState }) => (
                <Field
                  placeholder="Display name"
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={signUpForm.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field
                  placeholder="Email"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              )}
            />
            <Controller
              control={signUpForm.control}
              name="password"
              render={({ field, fieldState }) => (
                <Field
                  placeholder="Password"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                  secureTextEntry
                />
              )}
            />
            <Controller
              control={signUpForm.control}
              name="confirmPassword"
              render={({ field, fieldState }) => (
                <Field
                  placeholder="Confirm password"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                  secureTextEntry
                />
              )}
            />
          </>
        ) : (
          <>
            <Controller
              control={signInForm.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field
                  placeholder="Email"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              )}
            />
            <Controller
              control={signInForm.control}
              name="password"
              render={({ field, fieldState }) => (
                <Field
                  placeholder="Password"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                  secureTextEntry
                />
              )}
            />
            <Pressable className="mb-4 self-end" onPress={onForgotPassword} hitSlop={8}>
              <ThemedText className="text-xs font-semibold text-primary-light">Forgot password?</ThemedText>
            </Pressable>
          </>
        )}

        {/* Primary submit */}
        <Pressable
          className="mb-5 h-14 items-center justify-center rounded-pill bg-primary active:opacity-80"
          style={{ opacity: anyBusy ? 0.6 : 1 }}
          disabled={anyBusy}
          onPress={
            isSignUp ? signUpForm.handleSubmit(onSignUp) : signInForm.handleSubmit(onSignIn)
          }
        >
          {busy === 'email' ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <ThemedText className="text-base font-bold text-text-primary">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </ThemedText>
          )}
        </Pressable>

        {/* Divider */}
        <View className="mb-5 flex-row items-center gap-3">
          <View className="h-px flex-1 bg-white/10" />
          <ThemedText className="text-xs text-text-secondary">or continue with</ThemedText>
          <View className="h-px flex-1 bg-white/10" />
        </View>

        {/* OAuth */}
        <OAuthButton label="Continue with Google" icon="google" onPress={onGoogle} disabled={anyBusy} />
        <OAuthButton label="Continue with GitHub" icon="github" onPress={onGitHub} disabled={anyBusy} />

        {/* Mode toggle */}
        <View className="mt-6 flex-row justify-center gap-2">
          <ThemedText className="text-sm text-text-secondary">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          </ThemedText>
          <Pressable
            onPress={() => setMode(isSignUp ? 'signin' : 'signup')}
            disabled={anyBusy}
            hitSlop={8}
          >
            <ThemedText className="text-sm font-bold text-primary-light">
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
