import { Types } from 'mongoose';
import { TrackingSession } from '../models/TrackingSession.js';
import { User } from '../models/User.js';

export type TimeOfDayBlock = 'NIGHT' | 'MORNING' | 'AFTERNOON' | 'EVENING';

export interface HeatmapCell {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  dayName: string;
  timeBlock: TimeOfDayBlock;
  timeBlockLabel: string;
  sessionCount: number;
  totalDurationSeconds: number;
  averageDurationSeconds: number;
  medianDurationSeconds: number;
  longSessionCount: number; // sessions >= 25 mins
}

export interface BehavioralObservation {
  id: string;
  title: string;
  observation: string;
  periodAnalyzed: string;
  sessionCount: number;
  comparisonBaseline: string;
  highlightReason: string;
  actionableSuggestion: string;
  confidence: 'HIGH' | 'MEDIUM';
}

export interface ContextDistribution {
  context: string;
  count: number;
  averageDurationSeconds: number;
  percentage: number;
}

export interface TriggerMapResult {
  sufficientData: boolean;
  minSessionsRequired: number;
  totalSessionsAnalyzed: number;
  observationPeriodDays: number;
  overallMedianDurationSeconds: number;
  overallAverageDurationSeconds: number;
  heatmap: HeatmapCell[];
  observations: BehavioralObservation[];
  contextDistribution: ContextDistribution[];
  timeBlockSummaries: Record<
    TimeOfDayBlock,
    {
      sessionCount: number;
      averageDurationSeconds: number;
      medianDurationSeconds: number;
      longSessionPercentage: number;
    }
  >;
}

export class TriggerAnalysisService {
  public static readonly MIN_SESSIONS_REQUIRED = 5;

  private static getTimeBlock(hour: number): TimeOfDayBlock {
    if (hour >= 0 && hour < 6) return 'NIGHT';
    if (hour >= 6 && hour < 12) return 'MORNING';
    if (hour >= 12 && hour < 18) return 'AFTERNOON';
    return 'EVENING';
  }

  private static getTimeBlockLabel(block: TimeOfDayBlock): string {
    switch (block) {
      case 'NIGHT':
        return '12 AM – 6 AM';
      case 'MORNING':
        return '6 AM – 12 PM';
      case 'AFTERNOON':
        return '12 PM – 6 PM';
      case 'EVENING':
        return '6 PM – 12 AM';
    }
  }

  private static getDayName(day: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day] || 'Unknown';
  }

  private static calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }

  public static async analyze(
    userId: string | Types.ObjectId,
    windowDays: number = 30
  ): Promise<TriggerMapResult> {
    const user = await User.findById(userId).select('timezone');
    const tz = user?.timezone || 'Asia/Kolkata';

    const startDate = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    const sessions = await TrackingSession.find({
      userId,
      startedAt: { $gte: startDate },
      activeDurationSeconds: { $gt: 0 },
    })
      .sort({ startedAt: -1 })
      .lean();

    const totalSessions = sessions.length;

    // Initialize 7 x 4 heatmap matrix
    const timeBlocks: TimeOfDayBlock[] = ['NIGHT', 'MORNING', 'AFTERNOON', 'EVENING'];
    const matrix: Map<string, { durations: number[]; longCount: number }> = new Map();

    for (let day = 0; day < 7; day++) {
      for (const block of timeBlocks) {
        matrix.set(`${day}-${block}`, { durations: [], longCount: 0 });
      }
    }

    const blockDurations: Record<TimeOfDayBlock, number[]> = {
      NIGHT: [],
      MORNING: [],
      AFTERNOON: [],
      EVENING: [],
    };

    const contextMap: Map<string, number[]> = new Map();
    const allDurations: number[] = [];

    for (const session of sessions) {
      allDurations.push(session.activeDurationSeconds);

      // Convert startedAt to user's timezone hour and day of week
      let localHour = 12;
      let localDay = 0;

      try {
        const hourStr = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          hour: 'numeric',
          hourCycle: 'h23',
        }).format(session.startedAt);
        localHour = parseInt(hourStr, 10);

        const dayFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          weekday: 'narrow',
        });
        // Or get day index directly using date object in tz
        const dateParts = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
        }).formatToParts(session.startedAt);
        const y = Number(dateParts.find((p) => p.type === 'year')?.value);
        const m = Number(dateParts.find((p) => p.type === 'month')?.value);
        const d = Number(dateParts.find((p) => p.type === 'day')?.value);
        localDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
      } catch {
        localHour = session.startedAt.getHours();
        localDay = session.startedAt.getDay();
      }

      const block = this.getTimeBlock(localHour);
      const key = `${localDay}-${block}`;
      const cellData = matrix.get(key);

      if (cellData) {
        cellData.durations.push(session.activeDurationSeconds);
        if (session.activeDurationSeconds >= 25 * 60) {
          cellData.longCount++;
        }
      }

      blockDurations[block].push(session.activeDurationSeconds);

      if (session.userContext) {
        const ctx = session.userContext.trim();
        if (!contextMap.has(ctx)) {
          contextMap.set(ctx, []);
        }
        contextMap.get(ctx)!.push(session.activeDurationSeconds);
      }
    }

    // Build Heatmap Array
    const heatmap: HeatmapCell[] = [];
    for (let day = 0; day < 7; day++) {
      for (const block of timeBlocks) {
        const cell = matrix.get(`${day}-${block}`)!;
        const count = cell.durations.length;
        const total = cell.durations.reduce((a, b) => a + b, 0);
        const avg = count > 0 ? Math.round(total / count) : 0;
        const med = this.calculateMedian(cell.durations);

        heatmap.push({
          dayOfWeek: day,
          dayName: this.getDayName(day),
          timeBlock: block,
          timeBlockLabel: this.getTimeBlockLabel(block),
          sessionCount: count,
          totalDurationSeconds: total,
          averageDurationSeconds: avg,
          medianDurationSeconds: med,
          longSessionCount: cell.longCount,
        });
      }
    }

    // Build Block Summaries
    const timeBlockSummaries: Record<
      TimeOfDayBlock,
      {
        sessionCount: number;
        averageDurationSeconds: number;
        medianDurationSeconds: number;
        longSessionPercentage: number;
      }
    > = {
      NIGHT: { sessionCount: 0, averageDurationSeconds: 0, medianDurationSeconds: 0, longSessionPercentage: 0 },
      MORNING: { sessionCount: 0, averageDurationSeconds: 0, medianDurationSeconds: 0, longSessionPercentage: 0 },
      AFTERNOON: { sessionCount: 0, averageDurationSeconds: 0, medianDurationSeconds: 0, longSessionPercentage: 0 },
      EVENING: { sessionCount: 0, averageDurationSeconds: 0, medianDurationSeconds: 0, longSessionPercentage: 0 },
    };

    for (const block of timeBlocks) {
      const durs = blockDurations[block];
      const count = durs.length;
      const total = durs.reduce((a, b) => a + b, 0);
      const longCount = durs.filter((d) => d >= 25 * 60).length;

      timeBlockSummaries[block] = {
        sessionCount: count,
        averageDurationSeconds: count > 0 ? Math.round(total / count) : 0,
        medianDurationSeconds: this.calculateMedian(durs),
        longSessionPercentage: count > 0 ? Math.round((longCount / count) * 100) : 0,
      };
    }

    // Context Distribution
    const contextDistribution: ContextDistribution[] = [];
    for (const [context, durs] of contextMap.entries()) {
      const count = durs.length;
      const total = durs.reduce((a, b) => a + b, 0);
      contextDistribution.push({
        context,
        count,
        averageDurationSeconds: Math.round(total / count),
        percentage: totalSessions > 0 ? Math.round((count / totalSessions) * 100) : 0,
      });
    }

    const overallMedian = this.calculateMedian(allDurations);
    const overallAvg =
      totalSessions > 0 ? Math.round(allDurations.reduce((a, b) => a + b, 0) / totalSessions) : 0;

    // Generate Deterministic Observations
    const observations: BehavioralObservation[] = [];

    if (totalSessions >= this.MIN_SESSIONS_REQUIRED) {
      // 1. Time-of-day comparison (e.g. Evening or Night vs overall median)
      const eveningCount = timeBlockSummaries.EVENING.sessionCount;
      const eveningMedian = timeBlockSummaries.EVENING.medianDurationSeconds;
      if (eveningCount >= 3 && eveningMedian > overallMedian * 1.25) {
        observations.push({
          id: 'obs-evening-prolonged',
          title: 'Evening Session Duration',
          observation: `Across ${eveningCount} evening sessions (6 PM – 12 AM), your median session lasted ${Math.round(
            eveningMedian / 60
          )} minutes.`,
          periodAnalyzed: `Last ${windowDays} days`,
          sessionCount: eveningCount,
          comparisonBaseline: `Overall median of ${Math.round(overallMedian / 60)} minutes across all dayparts`,
          highlightReason: 'Evening sessions show a noticeable increase in duration relative to your daily baseline.',
          actionableSuggestion:
            'Consider experimenting with an evening intention reminder or enabling quiet hours starting at 9 PM.',
          confidence: 'HIGH',
        });
      }

      // 2. Late-night browsing pattern
      const nightCount = timeBlockSummaries.NIGHT.sessionCount;
      if (nightCount >= 2) {
        observations.push({
          id: 'obs-late-night',
          title: 'Late Night Feed Engagement',
          observation: `${nightCount} sessions occurred between 12 AM and 6 AM, averaging ${Math.round(
            timeBlockSummaries.NIGHT.averageDurationSeconds / 60
          )} minutes.`,
          periodAnalyzed: `Last ${windowDays} days`,
          sessionCount: nightCount,
          comparisonBaseline: 'Daytime usage patterns',
          highlightReason: 'Feed usage during biological rest windows is correlated with longer continuous dwell times.',
          actionableSuggestion:
            'Try charging your devices outside of arm’s reach from bed to support restful sleep hygiene.',
          confidence: nightCount >= 4 ? 'HIGH' : 'MEDIUM',
        });
      }

      // 3. Weekend vs Weekday patterns
      const weekendSessions = sessions.filter((s) => {
        const d = s.startedAt.getDay();
        return d === 0 || d === 6;
      });
      const weekdaySessions = sessions.filter((s) => {
        const d = s.startedAt.getDay();
        return d >= 1 && d <= 5;
      });

      if (weekendSessions.length >= 3 && weekdaySessions.length >= 3) {
        const weekendMedian = this.calculateMedian(weekendSessions.map((s) => s.activeDurationSeconds));
        const weekdayMedian = this.calculateMedian(weekdaySessions.map((s) => s.activeDurationSeconds));

        if (weekendMedian > weekdayMedian * 1.3) {
          observations.push({
            id: 'obs-weekend-surge',
            title: 'Weekend Scrolling Duration',
            observation: `Weekend sessions had a median duration of ${Math.round(
              weekendMedian / 60
            )}m compared to ${Math.round(weekdayMedian / 60)}m on weekdays.`,
            periodAnalyzed: `Last ${windowDays} days`,
            sessionCount: weekendSessions.length,
            comparisonBaseline: `Weekday median (${Math.round(weekdayMedian / 60)}m)`,
            highlightReason: 'Unstructured weekend blocks often exhibit extended browsing duration.',
            actionableSuggestion:
              'Plan an intentional offline leisure activity on Saturday mornings before opening short-video feeds.',
            confidence: 'HIGH',
          });
        }
      }

      // 4. Optional user context insight
      if (contextDistribution.length > 0) {
        const topContext = [...contextDistribution].sort((a, b) => b.count - a.count)[0];
        if (topContext.count >= 2) {
          observations.push({
            id: 'obs-self-reported-context',
            title: `Self-Reported Pattern: ${topContext.context}`,
            observation: `You noted "${topContext.context}" in ${topContext.count} sessions, with an average length of ${Math.round(
              topContext.averageDurationSeconds / 60
            )} minutes.`,
            periodAnalyzed: `Last ${windowDays} days`,
            sessionCount: topContext.count,
            comparisonBaseline: `All sessions with self-reported context`,
            highlightReason: 'Self-reported check-ins help identify the emotional or cognitive states preceding browsing.',
            actionableSuggestion:
              `When you notice ${topContext.context.toLowerCase()} next time, pause for 60 seconds of mindful breathing before opening the feed.`,
            confidence: 'HIGH',
          });
        }
      }
    }

    return {
      sufficientData: totalSessions >= this.MIN_SESSIONS_REQUIRED,
      minSessionsRequired: this.MIN_SESSIONS_REQUIRED,
      totalSessionsAnalyzed: totalSessions,
      observationPeriodDays: windowDays,
      overallMedianDurationSeconds: overallMedian,
      overallAverageDurationSeconds: overallAvg,
      heatmap,
      observations,
      contextDistribution,
      timeBlockSummaries,
    };
  }
}
