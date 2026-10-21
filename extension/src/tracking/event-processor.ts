/**
 * EventProcessor
 *
 * Ingests tracking events, updates daily aggregates, manages bounded event queues,
 * and maintains local activity records without requiring an active backend.
 */

import {
  Platform,
  TrackingSession,
  QualifiedViewEvent,
  DailySummary,
  UserSettings,
} from '../shared/types';
import { LIMITS } from '../shared/constants';
import { DoomscrollEngine } from './doomscroll-engine';

export function getTodayDateString(timestamp: number = Date.now()): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export class EventProcessor {
  private dailyStats: Map<string, DailySummary> = new Map();
  private recentSessions: TrackingSession[] = [];
  private unsyncedEvents: QualifiedViewEvent[] = [];
  private seenEventIds: Set<string> = new Set();

  constructor(
    initialDailyStats: Record<string, DailySummary> = {},
    initialRecentSessions: TrackingSession[] = [],
    initialUnsyncedEvents: QualifiedViewEvent[] = []
  ) {
    for (const [date, summary] of Object.entries(initialDailyStats)) {
      this.dailyStats.set(date, summary);
    }
    this.recentSessions = [...initialRecentSessions];
    this.unsyncedEvents = [...initialUnsyncedEvents];

    for (const ev of this.unsyncedEvents) {
      this.seenEventIds.add(ev.eventId);
    }
  }

  /**
   * Get or create daily summary record for a given date.
   */
  public getOrCreateDailySummary(dateStr: string = getTodayDateString()): DailySummary {
    let summary = this.dailyStats.get(dateStr);
    if (!summary) {
      summary = {
        date: dateStr,
        instagramDurationSeconds: 0,
        youtubeDurationSeconds: 0,
        totalDurationSeconds: 0,
        estimatedInstagramViews: 0,
        estimatedYouTubeViews: 0,
        sessionCount: 0,
        longSessionCount: 0,
        doomscrollScore: 0,
      };
      this.dailyStats.set(dateStr, summary);
    }
    return summary;
  }

  /**
   * Record a newly qualified view event.
   */
  public processQualifiedView(event: QualifiedViewEvent): boolean {
    if (this.seenEventIds.has(event.eventId)) {
      return false; // Duplicate
    }

    this.seenEventIds.add(event.eventId);

    // Add to unsynced event queue with bounded limit
    if (this.unsyncedEvents.length >= LIMITS.MAX_UNSYNCED_EVENTS) {
      const removed = this.unsyncedEvents.shift();
      if (removed) {
        this.seenEventIds.delete(removed.eventId);
      }
    }
    this.unsyncedEvents.push(event);

    // Update today's aggregates
    const today = this.getOrCreateDailySummary(getTodayDateString(event.occurredAt));
    if (event.platform === 'instagram') {
      today.estimatedInstagramViews += 1;
    } else {
      today.estimatedYouTubeViews += 1;
    }

    return true;
  }

  /**
   * Process a completed tracking session.
   */
  public processCompletedSession(session: TrackingSession, settings: UserSettings): void {
    // Check if session already recorded
    const existingIdx = this.recentSessions.findIndex((s) => s.sessionId === session.sessionId);
    if (existingIdx >= 0) {
      this.recentSessions[existingIdx] = session;
    } else {
      if (this.recentSessions.length >= LIMITS.MAX_RECENT_SESSIONS) {
        this.recentSessions.shift();
      }
      this.recentSessions.push(session);
    }

    // Update daily totals
    const dateStr = getTodayDateString(session.startedAt);
    const summary = this.getOrCreateDailySummary(dateStr);

    if (existingIdx < 0) {
      summary.sessionCount += 1;
    }

    if (session.platform === 'instagram') {
      summary.instagramDurationSeconds += session.activeDurationSeconds;
    } else {
      summary.youtubeDurationSeconds += session.activeDurationSeconds;
    }
    summary.totalDurationSeconds = summary.instagramDurationSeconds + summary.youtubeDurationSeconds;

    // Check long session count
    if (session.activeDurationSeconds >= settings.longSessionReminderMinutes * 60) {
      summary.longSessionCount += 1;
    }

    // Recompute daily doomscroll score
    const now = new Date();
    const doomResult = DoomscrollEngine.calculateScore(
      {
        continuousDurationSeconds: session.activeDurationSeconds,
        dailyTotalDurationSeconds: summary.totalDurationSeconds,
        dailyGoalSeconds: settings.dailyShortVideoGoalMinutes * 60,
        sessionsInLastHour: this.countSessionsInWindow(session.startedAt, 60 * 60 * 1000),
        navigationEventsInSession: session.navigationEvents,
        currentHour: now.getHours(),
        longSessionCountToday: summary.longSessionCount,
      },
      settings
    );

    summary.doomscrollScore = doomResult.score;
  }

  /**
   * Count sessions started within a millisecond window before target time.
   */
  public countSessionsInWindow(targetTimestamp: number, windowMs: number): number {
    const windowStart = targetTimestamp - windowMs;
    return this.recentSessions.filter((s) => s.startedAt >= windowStart && s.startedAt <= targetTimestamp).length;
  }

  public getDailyStatsMap(): Record<string, DailySummary> {
    const obj: Record<string, DailySummary> = {};
    for (const [k, v] of this.dailyStats.entries()) {
      obj[k] = { ...v };
    }
    return obj;
  }

  public getRecentSessions(): TrackingSession[] {
    return [...this.recentSessions];
  }

  public getUnsyncedEvents(): QualifiedViewEvent[] {
    return [...this.unsyncedEvents];
  }

  public clearAllData(): void {
    this.dailyStats.clear();
    this.recentSessions = [];
    this.unsyncedEvents = [];
    this.seenEventIds.clear();
  }
}
