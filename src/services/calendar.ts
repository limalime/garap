// Calendar & Notification Agent — device calendar sync + deadline reminders.
// Event/notification ids are mapped to bounty ids in AsyncStorage so we can
// update or remove them later. All native calls are guarded for web.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { useUIStore } from '@/src/store/useUIStore';
import type { Bounty, CalendarEvent } from '@/src/types';
import { formatPrize } from '@/src/utils/formatting';

const EVENTS_KEY = 'garap.calendar.events.v1';
const NOTIFS_KEY = 'garap.calendar.notifs.v1';
const CALENDAR_ID_KEY = 'garap.calendar.id.v1';
const DEFAULT_ALARMS = [1440, 60]; // 24h and 1h before

const isWeb = Platform.OS === 'web';
const timeZone =
  typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';

// --------------------------------------------------------------------------
// id maps
// --------------------------------------------------------------------------
async function readMap(key: string): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}
async function writeMap(key: string, map: Record<string, string>): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(map));
}
async function readListMap(key: string): Promise<Record<string, string[]>> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
  } catch {
    return {};
  }
}

export async function isBountySynced(bountyId: string): Promise<boolean> {
  const map = await readMap(EVENTS_KEY);
  return Boolean(map[bountyId]);
}

export async function getSyncedBountyIds(): Promise<string[]> {
  return Object.keys(await readMap(EVENTS_KEY));
}

// --------------------------------------------------------------------------
// permissions
// --------------------------------------------------------------------------
export async function requestCalendarPermission(): Promise<boolean> {
  if (isWeb) return false;
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isWeb) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// --------------------------------------------------------------------------
// calendar
// --------------------------------------------------------------------------
async function getGarapCalendarId(): Promise<string> {
  const cached = await AsyncStorage.getItem(CALENDAR_ID_KEY);
  if (cached) return cached;

  // Reuse an existing writable calendar, else create a dedicated one.
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existing = calendars.find((c) => c.title === 'Garap' && c.allowsModifications);
  let id = existing?.id;

  if (!id) {
    const source =
      Platform.OS === 'ios'
        ? (await Calendar.getDefaultCalendarAsync()).source
        : { isLocalAccount: true, name: 'Garap', type: Calendar.SourceType.LOCAL };
    id = await Calendar.createCalendarAsync({
      title: 'Garap',
      color: '#6B46C1',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: Platform.OS === 'ios' ? source.id : undefined,
      source,
      name: 'Garap Bounties',
      ownerAccount: 'Garap',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
  }
  await AsyncStorage.setItem(CALENDAR_ID_KEY, id);
  return id;
}

export function bountyToEvent(bounty: Bounty): CalendarEvent {
  const start = new Date(bounty.deadline);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return {
    title: bounty.bountyName,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    description: `${bounty.platform} · ${formatPrize(bounty.prizeAmount, bounty.prizeUnit)} · ${bounty.status}`,
    alarms: DEFAULT_ALARMS,
    location: bounty.submissionLink,
  };
}

/** Create (or replace) a device calendar event for a bounty. Returns the event id. */
export async function syncBountyToCalendar(bounty: Bounty): Promise<string | null> {
  if (isWeb) return null;
  const granted = await requestCalendarPermission();
  if (!granted) throw new Error('Calendar permission denied.');

  const calendarId = await getGarapCalendarId();
  const event = bountyToEvent(bounty);
  const map = await readMap(EVENTS_KEY);

  // Replace any stale event first.
  if (map[bounty.id]) {
    try {
      await Calendar.deleteEventAsync(map[bounty.id]);
    } catch {
      // already gone
    }
  }

  const eventId = await Calendar.createEventAsync(calendarId, {
    title: event.title,
    startDate: new Date(event.startDate),
    endDate: new Date(event.endDate),
    notes: event.description,
    location: event.location,
    timeZone,
    alarms: event.alarms.map((m) => ({ relativeOffset: -m })),
  });

  map[bounty.id] = eventId;
  await writeMap(EVENTS_KEY, map);
  await scheduleBountyReminders(bounty);
  return eventId;
}

export async function updateCalendarEvent(bountyId: string, bounty: Bounty): Promise<void> {
  if (isWeb) return;
  const map = await readMap(EVENTS_KEY);
  const eventId = map[bountyId];
  if (!eventId) return;
  const event = bountyToEvent(bounty);
  await Calendar.updateEventAsync(eventId, {
    title: event.title,
    startDate: new Date(event.startDate),
    endDate: new Date(event.endDate),
    notes: event.description,
    timeZone,
  });
  await scheduleBountyReminders(bounty);
}

export async function removeBountyFromCalendar(bountyId: string): Promise<void> {
  if (isWeb) return;
  const map = await readMap(EVENTS_KEY);
  if (map[bountyId]) {
    try {
      await Calendar.deleteEventAsync(map[bountyId]);
    } catch {
      // ignore
    }
    delete map[bountyId];
    await writeMap(EVENTS_KEY, map);
  }
  await cancelBountyReminders(bountyId);
}

// --------------------------------------------------------------------------
// notifications
// --------------------------------------------------------------------------
/** Schedule a single local reminder `minutesBefore` the deadline. */
export async function scheduleNotification(
  bounty: Bounty,
  minutesBefore: number
): Promise<string | null> {
  if (isWeb) return null;
  const fireDate = new Date(new Date(bounty.deadline).getTime() - minutesBefore * 60 * 1000);
  if (fireDate.getTime() <= Date.now()) return null; // already passed

  return Notifications.scheduleNotificationAsync({
    content: {
      title: `⏰ ${bounty.bountyName}`,
      body:
        minutesBefore >= 1440
          ? `Due in ${Math.round(minutesBefore / 1440)}d — ${bounty.platform}`
          : `Due in ${minutesBefore}m — submit soon!`,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
  });
}

/** Schedule the default 24h + 1h reminders, replacing any existing ones. */
export async function scheduleBountyReminders(bounty: Bounty): Promise<void> {
  if (isWeb) return;
  if (!useUIStore.getState().notificationsEnabled) return;
  await cancelBountyReminders(bounty.id);
  const granted = await requestNotificationPermission();
  if (!granted) return;

  const ids: string[] = [];
  for (const minutes of DEFAULT_ALARMS) {
    const id = await scheduleNotification(bounty, minutes);
    if (id) ids.push(id);
  }
  const map = await readListMap(NOTIFS_KEY);
  map[bounty.id] = ids;
  await AsyncStorage.setItem(NOTIFS_KEY, JSON.stringify(map));
}

export async function cancelBountyReminders(bountyId: string): Promise<void> {
  if (isWeb) return;
  const map = await readListMap(NOTIFS_KEY);
  for (const id of map[bountyId] ?? []) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // ignore
    }
  }
  if (map[bountyId]) {
    delete map[bountyId];
    await AsyncStorage.setItem(NOTIFS_KEY, JSON.stringify(map));
  }
}

// --------------------------------------------------------------------------
// timeline + export
// --------------------------------------------------------------------------
/** Upcoming non-archived deadlines within `days`, soonest first. */
export function getTimelineDeadlines(bounties: Bounty[], days: number): Bounty[] {
  const now = Date.now();
  const horizon = now + days * 86_400_000;
  return bounties
    .filter((b) => b.status !== 'Archived' && b.status !== 'Won' && b.status !== 'Lost')
    .filter((b) => {
      const t = new Date(b.deadline).getTime();
      return t >= now && t <= horizon;
    })
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
}

function icalDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/** Build an RFC-5545 iCalendar string for the given bounties. */
export function exportICal(bounties: Bounty[]): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Garap//Bounties//EN'];
  for (const b of bounties) {
    const event = bountyToEvent(b);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${b.id}@garap`,
      `DTSTART:${icalDate(event.startDate)}`,
      `DTEND:${icalDate(event.endDate)}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description}`,
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
