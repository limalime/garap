// Garap palette — single source of truth for non-Tailwind contexts
// (chart props, status maps, native APIs). Mirrors tailwind.config.js.

import type { BountyStatus } from '@/src/types';

export const colors = {
  primary: '#6B46C1',
  primaryLight: '#A78BFA',
  background: '#0F0F1E',
  card: '#1A1A2E',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  status: {
    active: '#10B981',
    submitted: '#3B82F6',
    won: '#FBBF24',
    lost: '#EF4444',
    pending: '#6B7280',
    archived: '#4B5563',
  },
} as const;

export const STATUS_COLORS: Record<BountyStatus, string> = {
  Active: colors.status.active,
  Submitted: colors.status.submitted,
  Won: colors.status.won,
  Lost: colors.status.lost,
  Pending: colors.status.pending,
  Archived: colors.status.archived,
};

export function statusColor(status: BountyStatus): string {
  return STATUS_COLORS[status] ?? colors.status.pending;
}
