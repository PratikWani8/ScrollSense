import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimeReclaimedCard } from '../src/components/TimeReclaimedCard';
import { IntentAwareSection } from '../src/components/IntentAwareSection';
import { PersonalTriggerMap } from '../src/components/PersonalTriggerMap';
import {
  TimeReclaimedData,
  CurrentIntentionData,
  IntentionAdherenceMetrics,
  PersonalTriggerMapData,
} from '../src/api/types';

describe('Advanced Digital Wellbeing Features UI Components', () => {
  describe('TimeReclaimedCard', () => {
    it('renders calibration empty state when baseline data is insufficient', () => {
      const data: TimeReclaimedData = {
        hasSufficientBaseline: false,
        baselineDaysCount: 1,
        baselineAverageSeconds: 1800,
        todayActualSeconds: 600,
        todayTimeReclaimedSeconds: 0,
        isTodayPositive: true,
        weeklyBaselineExpectedSeconds: 0,
        weeklyActualSeconds: 0,
        weeklyTimeReclaimedSeconds: 0,
        isWeeklyPositive: true,
        dailyHistory: [],
      };

      render(<TimeReclaimedCard data={data} />);

      expect(screen.getByText('Time Reclaimed Score')).toBeInTheDocument();
      expect(screen.getByText('Calibrating Baseline')).toBeInTheDocument();
      expect(screen.getByText(/at least 2 complete historical days/i)).toBeInTheDocument();
    });

    it('renders positive time reclaimed score and weekly balance', () => {
      const data: TimeReclaimedData = {
        hasSufficientBaseline: true,
        baselineDaysCount: 7,
        baselineAverageSeconds: 2400, // 40m
        todayActualSeconds: 900, // 15m
        todayTimeReclaimedSeconds: 1500, // +25m
        isTodayPositive: true,
        weeklyBaselineExpectedSeconds: 16800,
        weeklyActualSeconds: 7200,
        weeklyTimeReclaimedSeconds: 9600,
        isWeeklyPositive: true,
        dailyHistory: [
          {
            date: '2026-03-01',
            actualSeconds: 1200,
            baselineExpectedSeconds: 2400,
            timeReclaimedSeconds: 1200,
            isPositive: true,
          },
        ],
      };

      render(<TimeReclaimedCard data={data} />);

      expect(screen.getByText('Time Reclaimed Score')).toBeInTheDocument();
      expect(screen.getByText('+25m')).toBeInTheDocument();
      expect(screen.getByText('Reclaimed')).toBeInTheDocument();
      expect(screen.getByText(/Compassionate wellbeing/i)).toBeInTheDocument();
    });
  });

  describe('IntentAwareSection', () => {
    it('renders active intention and adherence breakdown', () => {
      const currentIntention: CurrentIntentionData = {
        hasActiveIntention: true,
        session: {
          sessionId: 'test-session-1',
          platform: 'instagram',
          feedType: 'instagram_reels',
          startedAt: new Date().toISOString(),
          activeDurationSeconds: 400,
          estimatedVideoViews: 10,
          navigationEvents: 12,
          detectorVersion: '1.0.0',
          dataQuality: 'HIGH',
          intention: {
            type: 'Learning',
            plannedDurationSeconds: 600, // 10m
            isExceeded: false,
            reminderSent: false,
            setAt: new Date().toISOString(),
          },
        },
      };

      const adherence: IntentionAdherenceMetrics = {
        totalSessionsWithIntent: 10,
        successfulSessions: 8,
        adherenceRatePercentage: 80,
        intentBreakdown: {
          Learning: {
            count: 5,
            adheredCount: 5,
            adherenceRate: 100,
            totalPlannedSeconds: 3000,
            totalActualSeconds: 2400,
          },
        },
      };

      render(
        <IntentAwareSection
          currentIntention={currentIntention}
          adherenceMetrics={adherence}
        />
      );

      expect(screen.getByText('Intent-Aware Scrolling')).toBeInTheDocument();
      expect(screen.getByText('80% Intention Adherence')).toBeInTheDocument();
      expect(screen.getByText('🎯 Learning')).toBeInTheDocument();
      expect(screen.getByText('On Track')).toBeInTheDocument();
      expect(screen.getByText('Learning')).toBeInTheDocument();
    });

    it('allows user to set intention and triggers callback', async () => {
      const onSet = vi.fn().mockResolvedValue(undefined);

      render(
        <IntentAwareSection
          currentIntention={null}
          adherenceMetrics={null}
          onSetIntention={onSet}
        />
      );

      expect(screen.getByText('Set Active Intent')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Set Active Intent'));

      expect(onSet).toHaveBeenCalledWith('Taking a Short Break', 600);
    });
  });

  describe('PersonalTriggerMap', () => {
    it('shows calibration threshold when under 5 sessions', () => {
      const data: PersonalTriggerMapData = {
        hasSufficientData: false,
        totalSessionsAnalyzed: 3,
        requiredSessions: 5,
        heatmap: [],
        timeBlockAverages: {},
        dayOfWeekAverages: {},
        peakDoomscrollTimeBlocks: [],
        contextDistribution: {},
        observations: [],
      };

      render(<PersonalTriggerMap data={data} />);

      expect(screen.getByText('Personal Doomscroll Trigger Map')).toBeInTheDocument();
      expect(screen.getByText('3 / 5 Sessions')).toBeInTheDocument();
      expect(screen.getByText(/minimum of 5 tracked sessions/i)).toBeInTheDocument();
    });

    it('renders 7x4 daypart heatmap and triggers context logging', () => {
      const onLog = vi.fn().mockResolvedValue(undefined);
      const data: PersonalTriggerMapData = {
        hasSufficientData: true,
        totalSessionsAnalyzed: 8,
        requiredSessions: 5,
        heatmap: [
          {
            dayOfWeek: 1,
            dayLabel: 'Mon',
            timeBlock: 'Evening',
            sessionCount: 3,
            totalDurationSeconds: 4500,
            averageDurationSeconds: 1500,
            medianDurationSeconds: 1400,
            prolongedSessionCount: 1,
            prolongedSessionRate: 0.33,
          },
        ],
        timeBlockAverages: {},
        dayOfWeekAverages: {},
        peakDoomscrollTimeBlocks: ['Evening'],
        contextDistribution: {
          Boredom: 4,
          Procrastination: 2,
        },
        observations: [
          'Sessions during Evening (18–24) average 25m with elevated dwell time.',
        ],
      };

      render(<PersonalTriggerMap data={data} onLogContext={onLog} />);

      expect(screen.getByText('Personal Doomscroll Trigger Map')).toBeInTheDocument();
      expect(screen.getByText('DAYPART HEATMAP MATRIX')).toBeInTheDocument();
      expect(screen.getByText('Peak Vulnerability: Evening')).toBeInTheDocument();
      expect(screen.getByText(/Sessions during Evening/i)).toBeInTheDocument();

      // Click mindful trigger check-in button
      const boredomBtn = screen.getByRole('button', { name: 'Boredom' });
      fireEvent.click(boredomBtn);
      expect(onLog).toHaveBeenCalledWith('Boredom');
    });
  });
});
