import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MetricCard } from '../src/components/MetricCard';
import { DoomscrollMeter } from '../src/components/DoomscrollMeter';
import { GoalProgressBar } from '../src/components/GoalProgressBar';
import { EmptyState } from '../src/components/EmptyState';
import { Navbar } from '../src/components/Navbar';
import { Sidebar } from '../src/components/Sidebar';
import { LandingPage } from '../src/pages/LandingPage';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { Clock, Layers } from 'lucide-react';

describe('ScrollSense Frontend Components', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('MetricCard', () => {
    it('renders title, value, and subtitle accurately', () => {
      render(
        <MetricCard
          title="Today's Feed Duration"
          value="45m 20s"
          subtitle="3 active browsing sessions"
          icon={Clock}
          variant="accent"
        />
      );

      expect(screen.getByText("Today's Feed Duration")).toBeInTheDocument();
      expect(screen.getByText('45m 20s')).toBeInTheDocument();
      expect(screen.getByText('3 active browsing sessions')).toBeInTheDocument();
    });
  });

  describe('DoomscrollMeter', () => {
    it('renders low risk state for score under 35', () => {
      render(<DoomscrollMeter score={20} />);

      expect(screen.getByText('Habit Risk Score')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('Within your goal')).toBeInTheDocument();
      expect(screen.getByText('Low Risk')).toBeInTheDocument();
    });

    it('renders goal exceeded alert for high score (85)', () => {
      render(<DoomscrollMeter score={85} />);

      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getByText('Goal exceeded')).toBeInTheDocument();
      expect(screen.getByText('Elevated')).toBeInTheDocument();
    });
  });

  describe('GoalProgressBar', () => {
    it('renders progress within target limits', () => {
      render(<GoalProgressBar trackedSeconds={1800} goalLimitSeconds={3600} />);

      expect(screen.getByText('Daily Short-Video Goal')).toBeInTheDocument();
      expect(screen.getByText('30m')).toBeInTheDocument();
      expect(screen.getByText('/ 60m')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText(/30m remaining/i)).toBeInTheDocument();
    });

    it('renders warning banner when daily goal is exceeded', () => {
      render(<GoalProgressBar trackedSeconds={4800} goalLimitSeconds={3600} />);

      expect(screen.getByText('80m')).toBeInTheDocument();
      expect(screen.getByText(/Goal exceeded by 20m today/i)).toBeInTheDocument();
    });
  });

  describe('EmptyState', () => {
    it('renders title, description, and triggers action button', () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          icon={Layers}
          title="No sessions found"
          description="Track short videos using the extension."
          actionText="Pair Extension"
          onAction={handleAction}
        />
      );

      expect(screen.getByText('No sessions found')).toBeInTheDocument();
      expect(screen.getByText('Track short videos using the extension.')).toBeInTheDocument();

      const button = screen.getByRole('button', { name: /Pair Extension/i });
      fireEvent.click(button);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Navbar & Sidebar Navigation', () => {
    it('renders Navbar in unauthenticated state with login link', () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <Navbar />
          </AuthProvider>
        </BrowserRouter>
      );

      expect(screen.getByText('ScrollSense')).toBeInTheDocument();
      expect(screen.getByText('Log In')).toBeInTheDocument();
      expect(screen.getByText('Get Started')).toBeInTheDocument();
    });

    it('renders Sidebar with full navigation links', () => {
      render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Session History')).toBeInTheDocument();
      expect(screen.getByText('Behavioral Analytics')).toBeInTheDocument();
      expect(screen.getByText('Goals & Limits')).toBeInTheDocument();
      expect(screen.getByText('Connected Devices')).toBeInTheDocument();
      expect(screen.getByText('Privacy & Settings')).toBeInTheDocument();
    });
  });

  describe('LandingPage', () => {
    it('renders project identity and value proposition', () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <LandingPage />
          </AuthProvider>
        </BrowserRouter>
      );

      expect(screen.getByText(/Reclaim Your Time/i)).toBeInTheDocument();
      expect(screen.getByText(/Understand your scrolling/i)).toBeInTheDocument();
      expect(screen.getByText(/Local-First/i)).toBeInTheDocument();
    });
  });

  describe('PublicPrivacyPage', () => {
    it('renders complete zero-knowledge privacy disclosures and store justifications', async () => {
      const { PublicPrivacyPage } = await import('../src/pages/PublicPrivacyPage');
      render(
        <BrowserRouter>
          <PublicPrivacyPage />
        </BrowserRouter>
      );

      expect(screen.getByText(/ScrollSense Privacy Policy/i)).toBeInTheDocument();
      expect(screen.getByText(/Zero-Knowledge & Local-First Philosophy/i)).toBeInTheDocument();
      expect(screen.getByText(/What We NEVER Collect or Transmit/i)).toBeInTheDocument();
      expect(screen.getByText(/Chrome Extension Permissions Justification/i)).toBeInTheDocument();
    });
  });
});

