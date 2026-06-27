// Settings — profile, preferences, data & privacy, about, account.

import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { ConfirmDialog } from '@/src/components/common/ConfirmDialog';
import { ThemedText } from '@/src/components/common/ThemedText';
import { TopBar } from '@/src/components/common/TopBar';
import { Row, Section } from '@/src/components/settings/SettingsRow';
import { useToast } from '@/src/hooks/useToast';
import { signOut, updateUserProfile } from '@/src/services/auth';
import { exportToCSV, exportToJSON, shareExport, type ExportResult } from '@/src/services/export';
import { pickAndCompressImage, uploadAvatar } from '@/src/services/storage';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useBountyStore } from '@/src/store/useBountyStore';
import { useRevenueStore } from '@/src/store/useRevenueStore';
import { useUIStore } from '@/src/store/useUIStore';
import { BOUNTY_CATEGORIES } from '@/src/types';
import { colors } from '@/src/utils/colors';
import { useTranslation } from '@/src/utils/i18n';

const APP_VERSION = '1.0.0-beta2706';
const PRIVACY_URL = 'https://github.com/limalime/garap/privacy.md';
const TERMS_URL = 'https://github.com/limalime/garap/terms.md';
const CHANGELOG_URL = 'https://github.com/limalime/garap/releases';

type DialogKind = 'logout' | 'signOutAll' | 'clearCache' | 'deleteAccount' | null;

export function SettingsScreen() {
  const toast = useToast();
  const { t, formatDate } = useTranslation();

  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const logout = useAuthStore((s) => s.logout);

  const {
    language,
    setLanguage,
    notificationsEnabled,
    toggleNotifications,
    notificationCategories,
    setNotificationCategory,
  } = useUIStore();

  const [name, setName] = useState(user?.displayName ?? '');
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [dialogBusy, setDialogBusy] = useState(false);

  const nameDirty = name.trim() !== (user?.displayName ?? '');

  // ---- Profile ----
  const handleSaveName = async () => {
    if (!nameDirty || !name.trim()) return;
    setSavingName(true);
    try {
      await updateUserProfile(name.trim());
      updateProfile({ displayName: name.trim() });
      toast('success', 'Profile updated');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSavingName(false);
    }
  };

  const handleAvatar = async (source: 'library' | 'camera') => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const picked = await pickAndCompressImage(source);
      if (!picked) return;
      const url = await uploadAvatar(user.id, picked);
      await updateUserProfile(undefined, url);
      updateProfile({ avatarUrl: url });
      toast('success', 'Photo updated');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ---- Notifications ----
  const sendTestNotification = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        toast('error', 'Notifications permission denied');
        return;
      }
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Garap', body: 'Test notification 🎉 Reminders are working.' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
      });
      toast('success', 'Test notification scheduled');
    } catch {
      toast('error', 'Could not send test notification');
    }
  };

  // ---- Data & privacy ----
  const doExport = async (kind: 'csv' | 'json') => {
    try {
      const bounties = useBountyStore.getState().bounties;
      const revenue = {
        totalRevenueUSD: useRevenueStore.getState().totalRevenueUSD,
        winRate: useRevenueStore.getState().winRate,
        revenueByCategory: useRevenueStore.getState().revenueByCategory,
        history: useRevenueStore.getState().history,
        wonCount: useRevenueStore.getState().history.length,
        lastUpdated: useRevenueStore.getState().lastUpdated ?? new Date().toISOString(),
      };
      const result: ExportResult =
        kind === 'csv' ? exportToCSV(bounties, revenue) : exportToJSON(bounties, revenue);
      await shareExport(result);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Export failed');
    }
  };

  const runDialog = async () => {
    setDialogBusy(true);
    try {
      if (dialog === 'logout' || dialog === 'signOutAll') {
        await signOut();
        logout();
        toast('success', 'Signed out');
      } else if (dialog === 'clearCache') {
        // Clear cached in-memory store data (keeps the auth session); the next
        // realtime/refetch repopulates from the server.
        useBountyStore.getState().setBounties([]);
        toast('success', 'Cache cleared');
      } else if (dialog === 'deleteAccount') {
        // Client can't hard-delete an auth user without a service role; sign the
        // user out and surface guidance. A server Edge Function should finish it.
        await signOut();
        logout();
        toast('info', 'Account sign-out complete. Contact support to fully erase data.');
      }
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Action failed');
    } finally {
      setDialogBusy(false);
      setDialog(null);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <TopBar title={t('settings')} showSettings={false} showBack />
      <ScrollView contentContainerClassName="gap-6 px-5 pb-20" showsVerticalScrollIndicator={false}>
        {/* Profile */}
        <Section title={t('profile')}>
          <View className="items-center gap-3 px-4 py-5">
            <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-pill bg-background">
              {uploadingAvatar ? (
                <ActivityIndicator color={colors.primaryLight} />
              ) : user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={{ width: 96, height: 96 }} contentFit="cover" />
              ) : (
                <Ionicons name="person" size={40} color={colors.textSecondary} />
              )}
            </View>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => handleAvatar('library')}
                className="flex-row items-center gap-1.5 rounded-pill bg-card px-4 py-2"
              >
                <Ionicons name="image-outline" size={16} color={colors.primaryLight} />
                <ThemedText className="text-sm font-semibold text-primary-light">Upload</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => handleAvatar('camera')}
                className="flex-row items-center gap-1.5 rounded-pill bg-card px-4 py-2"
              >
                <Ionicons name="camera-outline" size={16} color={colors.primaryLight} />
                <ThemedText className="text-sm font-semibold text-primary-light">Camera</ThemedText>
              </Pressable>
            </View>
          </View>

          <View className="border-t border-white/5 px-4 py-4">
            <ThemedText className="mb-1 text-xs text-text-secondary">{t('displayName')}</ThemedText>
            <View className="flex-row items-center gap-2">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={colors.textSecondary}
                className="flex-1 rounded-pill bg-background px-4 py-2.5 text-base text-text-primary"
              />
              {nameDirty ? (
                <Pressable
                  onPress={handleSaveName}
                  disabled={savingName}
                  className="rounded-pill bg-primary px-4 py-2.5"
                >
                  {savingName ? (
                    <ActivityIndicator size="small" color={colors.textPrimary} />
                  ) : (
                    <ThemedText className="font-bold text-text-primary">{t('save')}</ThemedText>
                  )}
                </Pressable>
              ) : null}
            </View>
          </View>

          <Row label={t('email')} sublabel={user?.email ?? '—'} />
          <Row
            label={t('memberSince')}
            sublabel={user?.createdAt ? formatDate(user.createdAt) : '—'}
            last
          />
        </Section>

        {/* Preferences */}
        <Section title={t('preferences')}>
          <Row label={t('theme')} right={<ThemedText className="text-sm text-text-secondary">{t('darkViolet')}</ThemedText>} />
          <Row
            label={t('language')}
            right={
              <Pressable onPress={() => setLanguage(language === 'en' ? 'id' : 'en')} hitSlop={8}>
                <ThemedText className="font-bold text-primary-light">{language.toUpperCase()}</ThemedText>
              </Pressable>
            }
          />
          <Row
            label={t('notifications')}
            right={
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                trackColor={{ true: colors.primary, false: colors.status.pending }}
              />
            }
          />
          <Row label={t('testNotification')} onPress={sendTestNotification} icon="notifications-outline" last />
        </Section>

        {/* Per-category notifications */}
        {notificationsEnabled ? (
          <Section title={t('notifyByCategory')}>
            {BOUNTY_CATEGORIES.map((cat, i) => (
              <Row
                key={cat}
                label={cat}
                last={i === BOUNTY_CATEGORIES.length - 1}
                right={
                  <Switch
                    value={notificationCategories[cat]}
                    onValueChange={(v) => setNotificationCategory(cat, v)}
                    trackColor={{ true: colors.primary, false: colors.status.pending }}
                  />
                }
              />
            ))}
          </Section>
        ) : null}

        {/* Data & Privacy */}
        <Section title={t('dataPrivacy')}>
          <Row label={t('exportCsv')} onPress={() => doExport('csv')} icon="download-outline" />
          <Row label={t('exportJson')} onPress={() => doExport('json')} icon="download-outline" />
          <Row label={t('clearCache')} onPress={() => setDialog('clearCache')} icon="trash-bin-outline" />
          <Row label={t('deleteAccount')} onPress={() => setDialog('deleteAccount')} icon="warning-outline" destructive last />
        </Section>

        {/* About */}
        <Section title={t('about')}>
          <Row label={t('appVersion')} right={<ThemedText className="text-sm text-text-secondary">{APP_VERSION}</ThemedText>} />
          <Row label={t('changelog')} onPress={() => Linking.openURL(CHANGELOG_URL)} icon="open-outline" />
          <Row label={t('privacyPolicy')} onPress={() => Linking.openURL(PRIVACY_URL)} icon="open-outline" />
          <Row label={t('termsOfService')} onPress={() => Linking.openURL(TERMS_URL)} icon="open-outline" />
          <Row
            label={t('donate')}
            onPress={() => Linking.openURL('https://buymeacoffee.com/garap')}
            icon="cafe-outline"
            last
          />
        </Section>

        {/* Account */}
        <Section title={t('account')}>
          <Row
            label={t('linkedMethods')}
            sublabel={user?.email ? 'Email' : '—'}
          />
          <Row label={t('signOutAll')} onPress={() => setDialog('signOutAll')} icon="phone-portrait-outline" />
          <Row label={t('logout')} onPress={() => setDialog('logout')} destructive icon="log-out-outline" last />
        </Section>
      </ScrollView>

      {/* Confirmation dialogs */}
      <ConfirmDialog
        visible={dialog === 'logout' || dialog === 'signOutAll'}
        title={t('logout')}
        message="Are you sure you want to sign out?"
        confirmLabel={t('logout')}
        destructive
        loading={dialogBusy}
        onConfirm={runDialog}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        visible={dialog === 'clearCache'}
        title={t('clearCache')}
        message="This clears locally cached data. Your account and synced data are safe. This cannot be undone."
        confirmLabel={t('clearCache')}
        destructive
        loading={dialogBusy}
        onConfirm={runDialog}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        visible={dialog === 'deleteAccount'}
        title={t('deleteAccount')}
        message="This permanently signs you out and requests account deletion. Type DELETE to confirm."
        confirmLabel={t('deleteAccount')}
        requireText="DELETE"
        destructive
        loading={dialogBusy}
        onConfirm={runDialog}
        onCancel={() => setDialog(null)}
      />
    </View>
  );
}
