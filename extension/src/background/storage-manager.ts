/**
 * StorageManager
 *
 * Typed local storage manager for Chrome Extension Manifest V3.
 * Manages versioned schema, migrations, durable session persistence,
 * and bounded local queues.
 */

import {
  StorageSchemaV1,
  UserSettings,
  DevicePairingState,
  TrackingSession,
  DailySummary,
  QualifiedViewEvent,
} from '../shared/types';
import {
  STORAGE_SCHEMA_VERSION,
  DEFAULT_USER_SETTINGS,
  DEFAULT_PAIRING_STATE,
  STORAGE_KEYS,
  LIMITS,
} from '../shared/constants';
import { generateUUID } from '../tracking/deduplication';

export class StorageManager {
  private static isChromeStorageAvailable(): boolean {
    return (
      typeof chrome !== 'undefined' &&
      !!chrome.storage &&
      !!chrome.storage.local
    );
  }

  /**
   * Initialize and run schema migrations if necessary.
   */
  public static async initialize(): Promise<StorageSchemaV1> {
    const data = await this.getAll();
    if (!data.schemaVersion || data.schemaVersion < STORAGE_SCHEMA_VERSION) {
      return await this.migrateSchema(data);
    }
    return data;
  }

  /**
   * Fetch complete storage schema.
   */
  public static async getAll(): Promise<StorageSchemaV1> {
    if (!this.isChromeStorageAvailable()) {
      return this.getDefaultSchema();
    }

    return new Promise((resolve) => {
      chrome.storage.local.get(null, (result) => {
        if (chrome.runtime.lastError || !result || Object.keys(result).length === 0) {
          resolve(this.getDefaultSchema());
        } else {
          resolve({
            schemaVersion: result.schemaVersion || STORAGE_SCHEMA_VERSION,
            settings: { ...DEFAULT_USER_SETTINGS, ...(result.settings || {}) },
            pairing: result.pairing || { ...DEFAULT_PAIRING_STATE, deviceId: generateUUID() },
            currentSession: result.currentSession || null,
            recentSessions: result.recentSessions || [],
            unsyncedEvents: result.unsyncedEvents || [],
            dailyStats: result.dailyStats || {},
            activeSessionRecovery: result.activeSessionRecovery,
          });
        }
      });
    });
  }

  /**
   * Migrate storage schema across versions.
   */
  private static async migrateSchema(oldData: Partial<StorageSchemaV1>): Promise<StorageSchemaV1> {
    const migrated: StorageSchemaV1 = {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      settings: { ...DEFAULT_USER_SETTINGS, ...(oldData.settings || {}) },
      pairing: oldData.pairing || { ...DEFAULT_PAIRING_STATE, deviceId: generateUUID() },
      currentSession: oldData.currentSession || null,
      recentSessions: oldData.recentSessions || [],
      unsyncedEvents: oldData.unsyncedEvents || [],
      dailyStats: oldData.dailyStats || {},
      activeSessionRecovery: oldData.activeSessionRecovery,
    };

    await this.setAll(migrated);
    return migrated;
  }

  /**
   * Get device pairing state.
   */
  public static async getPairingState(): Promise<DevicePairingState> {
    const data = await this.getAll();
    return data.pairing || { ...DEFAULT_PAIRING_STATE, deviceId: generateUUID() };
  }

  /**
   * Update device pairing state.
   */
  public static async updatePairingState(updates: Partial<DevicePairingState>): Promise<DevicePairingState> {
    const current = await this.getPairingState();
    const updated: DevicePairingState = { ...current, ...updates };
    await this.set(STORAGE_KEYS.PAIRING, updated);
    return updated;
  }

  /**
   * Acknowledge and clear successfully uploaded events.
   */
  public static async removeUnsyncedEvents(eventIds: string[]): Promise<void> {
    const data = await this.getAll();
    const idSet = new Set(eventIds);
    const remaining = (data.unsyncedEvents || []).filter((e) => !idSet.has(e.eventId));
    await this.set(STORAGE_KEYS.UNSYNCED_EVENTS, remaining);
  }

  /**
   * Save complete schema.
   */
  public static async setAll(data: StorageSchemaV1): Promise<void> {
    if (!this.isChromeStorageAvailable()) return;

    return new Promise((resolve, reject) => {
      chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get user settings.
   */
  public static async getSettings(): Promise<UserSettings> {
    const data = await this.getAll();
    return data.settings;
  }

  /**
   * Update partial user settings.
   */
  public static async updateSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
    const data = await this.getAll();
    const newSettings: UserSettings = {
      ...data.settings,
      ...updates,
    };
    await this.set(STORAGE_KEYS.SETTINGS, newSettings);
    return newSettings;
  }

  /**
   * Save active session recovery snapshot for service worker suspension.
   */
  public static async saveRecoverySnapshot(
    recovery: StorageSchemaV1['activeSessionRecovery']
  ): Promise<void> {
    await this.set(STORAGE_KEYS.RECOVERY_META, recovery);
  }

  /**
   * Clear active session recovery snapshot.
   */
  public static async clearRecoverySnapshot(): Promise<void> {
    await this.remove(STORAGE_KEYS.RECOVERY_META);
  }

  /**
   * Save current active session state.
   */
  public static async saveCurrentSession(session: TrackingSession | null): Promise<void> {
    await this.set(STORAGE_KEYS.CURRENT_SESSION, session);
  }

  /**
   * Append a completed session and update daily summaries.
   */
  public static async saveCompletedSession(
    session: TrackingSession,
    dailyStats: Record<string, DailySummary>
  ): Promise<void> {
    const data = await this.getAll();
    const recent = [session, ...(data.recentSessions || [])].slice(0, LIMITS.MAX_RECENT_SESSIONS);

    await this.setMultiple({
      [STORAGE_KEYS.CURRENT_SESSION]: null,
      [STORAGE_KEYS.RECENT_SESSIONS]: recent,
      [STORAGE_KEYS.DAILY_STATS]: dailyStats,
      [STORAGE_KEYS.RECOVERY_META]: null,
    });
  }

  /**
   * Append unsynced qualified view event.
   */
  public static async appendUnsyncedEvent(event: QualifiedViewEvent): Promise<void> {
    const data = await this.getAll();
    const updated = [...(data.unsyncedEvents || []), event].slice(-LIMITS.MAX_UNSYNCED_EVENTS);
    await this.set(STORAGE_KEYS.UNSYNCED_EVENTS, updated);
  }

  /**
   * Clear all local tracking and analytics data (privacy control).
   */
  public static async clearAllTrackingData(): Promise<void> {
    const current = await this.getAll();
    const resetData: StorageSchemaV1 = {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      settings: current.settings,
      currentSession: null,
      recentSessions: [],
      unsyncedEvents: [],
      dailyStats: {},
      activeSessionRecovery: undefined,
    };
    await this.setAll(resetData);
  }

  // Low level helpers
  private static async set(key: string, value: unknown): Promise<void> {
    if (!this.isChromeStorageAvailable()) return;
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  private static async setMultiple(items: Record<string, unknown>): Promise<void> {
    if (!this.isChromeStorageAvailable()) return;
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(items, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  private static async remove(key: string): Promise<void> {
    if (!this.isChromeStorageAvailable()) return;
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, () => resolve());
    });
  }

  public static getDefaultSchema(): StorageSchemaV1 {
    return {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      settings: { ...DEFAULT_USER_SETTINGS },
      currentSession: null,
      recentSessions: [],
      unsyncedEvents: [],
      dailyStats: {},
    };
  }
}
