// Internationalization (UI State Agent) — lightweight EN/ID dictionary + hook.
// Custom solution (no react-i18next) to keep the bundle small; the active
// language comes from useUIStore.

import { useCallback } from 'react';

import { useUIStore, type Language } from '@/src/store/useUIStore';

const en = {
  // Tabs / screens
  dashboard: 'Dashboard',
  projects: 'Projects',
  notes: 'Notes',
  calendar: 'Calendar',
  settings: 'Settings',
  // Settings sections
  profile: 'Profile',
  preferences: 'Preferences',
  dataPrivacy: 'Data & Privacy',
  about: 'About',
  account: 'Account',
  // Settings rows
  displayName: 'Display name',
  email: 'Email',
  memberSince: 'Member since',
  theme: 'Theme',
  language: 'Language',
  notifications: 'Notifications',
  notifyByCategory: 'Notify by category',
  testNotification: 'Send test notification',
  exportCsv: 'Export as CSV',
  exportJson: 'Export as JSON',
  clearCache: 'Clear cache',
  deleteAccount: 'Delete account',
  appVersion: 'App version',
  changelog: 'Changelog',
  privacyPolicy: 'Privacy policy',
  termsOfService: 'Terms of service',
  donate: 'Donate',
  logout: 'Log out',
  signOutAll: 'Sign out all devices',
  linkedMethods: 'Linked methods',
  // Misc
  save: 'Save',
  cancel: 'Cancel',
  changePhoto: 'Change photo',
  darkViolet: 'Dark (Violet)',
};

type Dict = typeof en;

const id: Dict = {
  dashboard: 'Dasbor',
  projects: 'Proyek',
  notes: 'Catatan',
  calendar: 'Kalender',
  settings: 'Pengaturan',
  profile: 'Profil',
  preferences: 'Preferensi',
  dataPrivacy: 'Data & Privasi',
  about: 'Tentang',
  account: 'Akun',
  displayName: 'Nama tampilan',
  email: 'Email',
  memberSince: 'Anggota sejak',
  theme: 'Tema',
  language: 'Bahasa',
  notifications: 'Notifikasi',
  notifyByCategory: 'Notifikasi per kategori',
  testNotification: 'Kirim notifikasi uji',
  exportCsv: 'Ekspor sebagai CSV',
  exportJson: 'Ekspor sebagai JSON',
  clearCache: 'Hapus cache',
  deleteAccount: 'Hapus akun',
  appVersion: 'Versi aplikasi',
  changelog: 'Catatan perubahan',
  privacyPolicy: 'Kebijakan privasi',
  termsOfService: 'Ketentuan layanan',
  donate: 'Donasi',
  logout: 'Keluar',
  signOutAll: 'Keluar dari semua perangkat',
  linkedMethods: 'Metode tertaut',
  save: 'Simpan',
  cancel: 'Batal',
  changePhoto: 'Ganti foto',
  darkViolet: 'Gelap (Ungu)',
};

const DICTS: Record<Language, Dict> = { en, id };

export type TranslationKey = keyof Dict;

export function useTranslation() {
  const language = useUIStore((s) => s.language);
  const dict = DICTS[language];

  const t = useCallback((key: TranslationKey) => dict[key] ?? en[key] ?? key, [dict]);

  const formatCurrency = useCallback(
    (amount: number, currency = 'USD') =>
      new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(amount ?? 0),
    [language]
  );

  const formatDate = useCallback(
    (iso: string) => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '—';
      return d.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    },
    [language]
  );

  return { t, language, formatCurrency, formatDate };
}
