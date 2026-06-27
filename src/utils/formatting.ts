// Display formatting helpers (Revenue, Calendar, Bounty agents).

import type { PrizeUnit } from '@/src/types';

/** Format a USD amount as a localized currency string. */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
}

/** Format a prize amount with its unit, e.g. "1.5 ETH". */
export function formatPrize(amount: number, unit: PrizeUnit): string {
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 6,
  }).format(amount ?? 0);
  return `${formatted} ${unit}`;
}

/**
 * Human-readable countdown until a deadline.
 * - Past: "Overdue"
 * - Same calendar day: "N Hours Left" (hour-level precision)
 * - Future calendar days: "N Days Left"
 */
export function deadlineCountdown(deadlineISO: string, now: Date = new Date()): string {
  const deadline = new Date(deadlineISO);
  const diffMs = deadline.getTime() - now.getTime();

  if (Number.isNaN(diffMs)) return '—';
  if (diffMs < 0) return 'Overdue';

  const isSameCalendarDay =
    deadline.getFullYear() === now.getFullYear() &&
    deadline.getMonth() === now.getMonth() &&
    deadline.getDate() === now.getDate();

  if (isSameCalendarDay) {
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours < 1) return 'Due now';
    return `${hours} Hour${hours === 1 ? '' : 's'} Left`;
  }

  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return `${days} Day${days === 1 ? '' : 's'} Left`;
}

/** Short date label, e.g. "Jun 25". */
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Truncate text to a max length with an ellipsis. */
export function truncate(text: string, max = 80): string {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
