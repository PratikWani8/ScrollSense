import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncManager } from '../../src/background/sync-manager';
import { StorageManager } from '../../src/background/storage-manager';

describe('SyncManager & Pairing Controls', () => {
  let syncManager: SyncManager;

  beforeEach(async () => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.clear();
    }
    await StorageManager.initialize();
    syncManager = new SyncManager();
  });

  it('initializes with offline awareness and default unpaired state', async () => {
    expect(syncManager.getOnlineStatus()).toBe(true);

    const pairing = await StorageManager.getPairingState();
    expect(pairing.isPaired).toBe(false);
    expect(pairing.syncStatus).toBe('UNPAIRED');
  });

  it('does NOT trigger cloud upload when cloudSyncEnabled is false (privacy preservation)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    // Default: cloudSyncEnabled is false
    const res = await syncManager.triggerSync();
    expect(res.success).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it('disconnects and resets device credentials on disconnect()', async () => {
    await StorageManager.updatePairingState({
      isPaired: true,
      deviceToken: 'token_123',
      syncStatus: 'IDLE',
    });
    await StorageManager.updateSettings({ cloudSyncEnabled: true });

    await syncManager.disconnect();

    const pairing = await StorageManager.getPairingState();
    expect(pairing.isPaired).toBe(false);
    expect(pairing.deviceToken).toBeUndefined();
    expect(pairing.syncStatus).toBe('UNPAIRED');

    const settings = await StorageManager.getSettings();
    expect(settings.cloudSyncEnabled).toBe(false);
  });
});
