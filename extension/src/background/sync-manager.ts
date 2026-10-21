/**
 * SyncManager
 *
 * Handles authenticated cloud synchronization for ScrollSense Chrome Extension.
 * - Manages extension pairing handshake with web dashboard
 * - Maintains offline queue of unsynced events with idempotency
 * - Automatically retries and acknowledges successful uploads
 * - Enforces user privacy controls: if cloudSyncEnabled is false, no data is uploaded.
 */

import { DevicePairingState, QualifiedViewEvent, TrackingSession } from '../shared/types';
import { StorageManager } from './storage-manager';

export class SyncManager {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncInProgress: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.triggerSync().catch(() => {});
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  /**
   * Request a new 6-character pairing code from the backend.
   */
  public async requestPairingCode(customBackendUrl?: string): Promise<{ pairingCode: string; expiresAt: string }> {
    const pairing = await StorageManager.getPairingState();
    const backendUrl = customBackendUrl || pairing.backendUrl || 'http://localhost:5000/api/v1';

    const res = await fetch(`${backendUrl}/devices/pair/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: pairing.deviceId,
        deviceName: pairing.deviceName,
        extensionVersion: '1.0.0',
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to request pairing code' }));
      throw new Error(err.error || `Server responded with ${res.status}`);
    }

    const data = await res.json();
    await StorageManager.updatePairingState({
      backendUrl,
      pendingPairingCode: data.pairingCode,
      syncStatus: 'IDLE',
      lastSyncError: undefined,
    });

    return {
      pairingCode: data.pairingCode,
      expiresAt: data.expiresAt,
    };
  }

  /**
   * Check status of pending pairing code.
   */
  public async checkPairingApproval(): Promise<{ isPaired: boolean; status: string }> {
    const pairing = await StorageManager.getPairingState();
    if (!pairing.pendingPairingCode) {
      return { isPaired: pairing.isPaired, status: pairing.isPaired ? 'APPROVED' : 'NONE' };
    }

    try {
      const res = await fetch(`${pairing.backendUrl}/devices/pair/status/${pairing.pendingPairingCode}`);
      if (!res.ok) {
        return { isPaired: false, status: 'ERROR' };
      }

      const data = await res.json();
      if (data.status === 'APPROVED' && data.deviceToken) {
        await StorageManager.updatePairingState({
          isPaired: true,
          deviceToken: data.deviceToken,
          pendingPairingCode: undefined,
          syncStatus: 'IDLE',
          lastSyncAt: Date.now(),
        });

        // Enable cloud sync and trigger first upload
        await StorageManager.updateSettings({ cloudSyncEnabled: true });
        this.triggerSync().catch(() => {});

        return { isPaired: true, status: 'APPROVED' };
      }

      return { isPaired: false, status: data.status || 'PENDING' };
    } catch {
      return { isPaired: false, status: 'NETWORK_ERROR' };
    }
  }

  /**
   * Revoke pairing and disconnect from cloud.
   */
  public async disconnect(): Promise<void> {
    await StorageManager.updatePairingState({
      isPaired: false,
      deviceToken: undefined,
      pendingPairingCode: undefined,
      syncStatus: 'UNPAIRED',
      lastSyncError: undefined,
    });
    await StorageManager.updateSettings({ cloudSyncEnabled: false });
  }

  /**
   * Synchronize queued events and active/recent sessions.
   */
  public async triggerSync(sessionToSync?: TrackingSession | null): Promise<{ success: boolean; syncedCount: number }> {
    if (this.isSyncInProgress) {
      return { success: false, syncedCount: 0 };
    }

    const [settings, pairing, data] = await Promise.all([
      StorageManager.getSettings(),
      StorageManager.getPairingState(),
      StorageManager.getAll(),
    ]);

    // Privacy & status check: never sync if cloud sync is disabled or device is unpaired
    if (!settings.cloudSyncEnabled || !pairing.isPaired || !pairing.deviceToken) {
      return { success: false, syncedCount: 0 };
    }

    if (!this.isOnline) {
      await StorageManager.updatePairingState({ syncStatus: 'OFFLINE' });
      return { success: false, syncedCount: 0 };
    }

    this.isSyncInProgress = true;
    await StorageManager.updatePairingState({ syncStatus: 'SYNCING' });

    try {
      // 1. Sync Session if provided or current session exists
      const targetSession = sessionToSync || data.currentSession;
      if (targetSession) {
        await this.uploadSession(targetSession, pairing);
      }

      // 2. Sync queued events in batches of 100
      let totalSynced = 0;
      const queue = data.unsyncedEvents || [];

      if (queue.length > 0) {
        const batch = queue.slice(0, 100);
        const res = await fetch(`${pairing.backendUrl}/events/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-Token': pairing.deviceToken,
          },
          body: JSON.stringify({ events: batch }),
        });

        if (res.status === 401) {
          // Device token revoked by user on dashboard
          await this.disconnect();
          this.isSyncInProgress = false;
          return { success: false, syncedCount: 0 };
        }

        if (!res.ok) {
          throw new Error(`Event batch upload failed: ${res.status}`);
        }

        // Successfully uploaded: acknowledge and remove from local queue
        const uploadedIds = batch.map((e) => e.eventId);
        await StorageManager.removeUnsyncedEvents(uploadedIds);
        totalSynced = batch.length;
      }

      await StorageManager.updatePairingState({
        syncStatus: 'IDLE',
        lastSyncAt: Date.now(),
        lastSyncError: undefined,
      });

      this.isSyncInProgress = false;
      return { success: true, syncedCount: totalSynced };
    } catch (err: any) {
      console.warn('[ScrollSense Sync] Cloud sync encountered an error; will retry:', err.message);
      await StorageManager.updatePairingState({
        syncStatus: 'ERROR',
        lastSyncError: err.message,
      });
      this.isSyncInProgress = false;
      return { success: false, syncedCount: 0 };
    }
  }

  private async uploadSession(session: TrackingSession, pairing: DevicePairingState): Promise<void> {
    const res = await fetch(`${pairing.backendUrl}/sessions/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Token': pairing.deviceToken!,
      },
      body: JSON.stringify({
        sessionId: session.sessionId,
        platform: session.platform,
        feedType: session.feedType,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        activeDurationSeconds: session.activeDurationSeconds,
        estimatedVideoViews: session.estimatedVideoViews,
        navigationEvents: session.navigationEvents,
        detectorVersion: session.detectorVersion,
        dataQuality: session.dataQuality,
        intention: session.intention,
        userContext: session.userContext,
      }),
    });

    if (res.status === 401) {
      await this.disconnect();
    }
  }

  public async getUnsyncedCount(): Promise<number> {
    const data = await StorageManager.getAll();
    return data.unsyncedEvents?.length || 0;
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }
}
