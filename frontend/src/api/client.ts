import {
  UserProfile,
  OverviewMetrics,
  TrendDay,
  PlatformMetrics,
  HourlyBucket,
  TrackingSessionSummary,
  DeviceItem,
  GoalData,
  DoomscrollScoreBreakdown,
  DoomscrollEventItem,
  AIInsightReport,
  IntentionAdherenceMetrics,
  CurrentIntentionData,
  PersonalTriggerMapData,
  TimeReclaimedData,
  ScrollingIntentionType,
} from './types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('scrollsense_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired or invalid
      if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
        localStorage.removeItem('scrollsense_token');
        localStorage.removeItem('scrollsense_user');
      }
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Network request failed' }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth
  public async register(payload: { email: string; password: string; displayName: string; timezone?: string }): Promise<{ token: string; user: UserProfile }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async login(payload: { email: string; password: string }): Promise<{ token: string; user: UserProfile }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getMe(): Promise<{ user: UserProfile }> {
    return this.request('/auth/me');
  }

  // Analytics
  public async getOverview(): Promise<OverviewMetrics> {
    return this.request('/analytics/overview');
  }

  public async getTrends(days: 7 | 30 = 7): Promise<{ days: number; trends: TrendDay[] }> {
    return this.request(`/analytics/trends?days=${days}`);
  }

  public async getPlatforms(): Promise<{ platforms: PlatformMetrics }> {
    return this.request('/analytics/platforms');
  }

  public async getHourly(): Promise<{ hourly: HourlyBucket[] }> {
    return this.request('/analytics/hourly');
  }

  // Sessions
  public async getSessions(params: { page?: number; limit?: number; platform?: string; startDate?: string; endDate?: string } = {}): Promise<{ sessions: TrackingSessionSummary[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.platform && params.platform !== 'all') q.set('platform', params.platform);
    if (params.startDate) q.set('startDate', params.startDate);
    if (params.endDate) q.set('endDate', params.endDate);

    return this.request(`/sessions?${q.toString()}`);
  }

  public async getSessionDetails(sessionId: string): Promise<{ session: TrackingSessionSummary; events: any[] }> {
    return this.request(`/sessions/${sessionId}`);
  }

  // Devices & Pairing
  public async getDevices(): Promise<{ devices: DeviceItem[] }> {
    return this.request('/devices');
  }

  public async approvePairing(pairingCode: string): Promise<{ message: string; deviceId: string; deviceName: string }> {
    return this.request('/devices/pair/approve', {
      method: 'POST',
      body: JSON.stringify({ pairingCode }),
    });
  }

  public async revokeDevice(deviceId: string): Promise<{ message: string }> {
    return this.request(`/devices/${deviceId}`, {
      method: 'DELETE',
    });
  }

  // Goals
  public async getGoals(): Promise<{ goal: GoalData }> {
    return this.request('/goals');
  }

  public async updateGoals(payload: Partial<GoalData>): Promise<{ message: string; goal: GoalData }> {
    return this.request('/goals', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // Privacy & Data
  public async exportData(): Promise<Blob> {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/privacy/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Data export failed');
    return res.blob();
  }

  public async clearTrackingData(): Promise<{ message: string }> {
    return this.request('/privacy/data', {
      method: 'DELETE',
    });
  }

  public async deleteAccount(): Promise<{ message: string }> {
    return this.request('/privacy/account', {
      method: 'DELETE',
    });
  }

  public async getRetentionPolicy(): Promise<{ retentionDays: number; totalSessions: number; oldestRecordDate: string | null }> {
    return this.request('/privacy/retention');
  }

  public async updateRetentionPolicy(retentionDays: number): Promise<{ message: string; retentionDays: number; prunedRecords: any }> {
    return this.request('/privacy/retention', {
      method: 'PUT',
      body: JSON.stringify({ retentionDays }),
    });
  }

  public async triggerRetentionCleanup(): Promise<{ message: string; retentionDays: number; prunedRecords: any }> {
    return this.request('/privacy/cleanup', {
      method: 'POST',
    });
  }

  // Doomscroll Detection & Reminders
  public async getDoomscrollBreakdown(): Promise<DoomscrollScoreBreakdown> {
    return this.request('/doomscroll/breakdown');
  }

  public async getDoomscrollEvents(page = 1, limit = 10): Promise<{ events: DoomscrollEventItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    return this.request(`/doomscroll/events?page=${page}&limit=${limit}`);
  }

  public async updateReminderStatus(eventId: string, status: 'DISMISSED' | 'ACCEPTED'): Promise<{ message: string }> {
    return this.request(`/doomscroll/events/${eventId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }

  // AI Behavioral Insights
  public async generateAIReport(): Promise<AIInsightReport> {
    return this.request('/insights/generate', {
      method: 'POST',
    });
  }

  public async getAIReports(page = 1, limit = 5): Promise<{ reports: AIInsightReport[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    return this.request(`/insights?page=${page}&limit=${limit}`);
  }

  public async getLatestAIReport(): Promise<{ report: AIInsightReport }> {
    return this.request('/insights/latest');
  }

  public async getAIReportById(reportId: string): Promise<{ report: AIInsightReport }> {
    return this.request(`/insights/${reportId}`);
  }

  // Advanced Features: Intent-Aware Scrolling
  public async getCurrentIntention(): Promise<CurrentIntentionData> {
    return this.request('/sessions/intentions/current');
  }

  public async getIntentionAdherence(days = 14): Promise<IntentionAdherenceMetrics> {
    return this.request(`/sessions/intentions/adherence?days=${days}`);
  }

  public async setSessionIntention(
    sessionId: string,
    payload: { type: ScrollingIntentionType; plannedDurationSeconds: number }
  ): Promise<{ message: string; session: TrackingSessionSummary }> {
    return this.request(`/sessions/${sessionId}/intention`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async setSessionContext(
    sessionId: string,
    payload: { context: string }
  ): Promise<{ message: string; session: TrackingSessionSummary }> {
    return this.request(`/sessions/${sessionId}/context`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Advanced Features: Personal Doomscroll Trigger Map
  public async getTriggerMap(): Promise<PersonalTriggerMapData> {
    return this.request('/analytics/trigger-map');
  }

  public async logTriggerContext(payload: { context: string; sessionId?: string }): Promise<{ message: string; session?: TrackingSessionSummary }> {
    return this.request('/analytics/trigger-map/context', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Advanced Features: Time Reclaimed Score
  public async getTimeReclaimed(baselineDays = 14): Promise<TimeReclaimedData> {
    return this.request(`/analytics/time-reclaimed?baselineDays=${baselineDays}`);
  }
}

export const api = new ApiClient();
