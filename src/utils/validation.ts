// Zod schemas — shared by React Hook Form resolvers and service-layer guards.

import { z } from 'zod';

import {
  BOUNTY_CATEGORIES,
  BOUNTY_STATUSES,
  PLATFORMS,
  PRIZE_UNITS,
} from '@/src/types';

export const todoSchema = z.object({
  id: z.string(),
  text: z.string().min(1, 'Todo text is required'),
  completed: z.boolean().default(false),
});

// Accepts a parseable date string in the future. Used for new/edited bounties.
const futureDeadline = z
  .string()
  .min(1, 'Deadline is required')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date')
  .refine((v) => new Date(v).getTime() > Date.now(), 'Deadline must be in the future');

export const bountySchema = z.object({
  bountyName: z.string().min(1, 'Bounty name is required').max(120),
  platform: z.enum(PLATFORMS as [string, ...string[]]),
  platformCustomName: z.string().max(100).optional(),
  deadline: futureDeadline,
  prizeAmount: z.coerce.number().positive('Prize amount must be greater than 0'),
  prizeUnit: z.enum(PRIZE_UNITS as [string, ...string[]]),
  status: z.enum(BOUNTY_STATUSES as [string, ...string[]]).default('Active'),
  category: z.enum(BOUNTY_CATEGORIES as [string, ...string[]]),
  sourceLink: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  submissionLink: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  notes: z.string().max(2000).optional(),
  todos: z.array(todoSchema).default([]),
}).refine(
  (data) => data.platform !== 'Other' || (data.platformCustomName?.trim().length ?? 0) > 0,
  { message: 'Please enter a custom platform name', path: ['platformCustomName'] }
);

export type BountyFormValues = z.infer<typeof bountySchema>;

// When editing, the deadline may already be in the past, so only require a valid
// date (not necessarily future). All other rules match bountySchema.
export const bountyEditSchema = bountySchema.safeExtend({
  deadline: z
    .string()
    .min(1, 'Deadline is required')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date'),
});

export const signInSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type SignInValues = z.infer<typeof signInSchema>;

export const signUpSchema = signInSchema
  .extend({
    displayName: z.string().min(1, 'Display name is required'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignUpValues = z.infer<typeof signUpSchema>;

export const noteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(120),
  body: z.string().max(10000).default(''),
  tags: z.array(z.string()).default([]),
  linkedBountyId: z.string().optional(),
});

export type NoteFormValues = z.infer<typeof noteSchema>;
