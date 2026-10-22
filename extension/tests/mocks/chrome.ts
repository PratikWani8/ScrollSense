/**
 * Chrome API Mocks for Unit & Integration Tests
 */

export class MockStorageArea {
  private store: Record<string, any> = {};

  public get(keys: any, callback?: (items: any) => void): Promise<any> {
    let result: Record<string, any> = {};
    if (keys === null || keys === undefined) {
      result = { ...this.store };
    } else if (typeof keys === 'string') {
      result = { [keys]: this.store[keys] };
    } else if (Array.isArray(keys)) {
      keys.forEach((k) => {
        result[k] = this.store[k];
      });
    } else if (typeof keys === 'object') {
      Object.keys(keys).forEach((k) => {
        result[k] = this.store[k] !== undefined ? this.store[k] : keys[k];
      });
    }

    if (callback) {
      callback(result);
    }
    return Promise.resolve(result);
  }

  public set(items: Record<string, any>, callback?: () => void): Promise<void> {
    Object.assign(this.store, items);
    if (callback) {
      callback();
    }
    return Promise.resolve();
  }

  public remove(keys: string | string[], callback?: () => void): Promise<void> {
    const arr = Array.isArray(keys) ? keys : [keys];
    arr.forEach((k) => delete this.store[k]);
    if (callback) {
      callback();
    }
    return Promise.resolve();
  }

  public clear(callback?: () => void): Promise<void> {
    this.store = {};
    if (callback) {
      callback();
    }
    return Promise.resolve();
  }

  public _dump(): Record<string, any> {
    return { ...this.store };
  }
}

export function createMockChrome() {
  const localStorage = new MockStorageArea();
  const listeners: Record<string, Function[]> = {};

  function addListener(eventKey: string, fn: Function) {
    if (!listeners[eventKey]) listeners[eventKey] = [];
    listeners[eventKey].push(fn);
  }

  function emit(eventKey: string, ...args: any[]) {
    if (listeners[eventKey]) {
      listeners[eventKey].forEach((fn) => fn(...args));
    }
  }

  return {
    storage: {
      local: localStorage,
    },
    runtime: {
      lastError: null as any,
      sendMessage: (message: any, callback?: Function) => {
        if (callback) callback({ success: true });
      },
      onMessage: {
        addListener: (fn: Function) => addListener('runtime.onMessage', fn),
      },
    },
    tabs: {
      query: (queryInfo: any, callback: Function) => {
        callback([{ id: 101, windowId: 1, active: true, url: 'https://www.instagram.com/reels/' }]);
      },
      get: (tabId: number, callback: Function) => {
        callback({ id: tabId, windowId: 1, active: true, url: 'https://www.instagram.com/reels/' });
      },
      onActivated: {
        addListener: (fn: Function) => addListener('tabs.onActivated', fn),
      },
      onUpdated: {
        addListener: (fn: Function) => addListener('tabs.onUpdated', fn),
      },
      onRemoved: {
        addListener: (fn: Function) => addListener('tabs.onRemoved', fn),
      },
    },
    windows: {
      WINDOW_ID_NONE: -1,
      onFocusChanged: {
        addListener: (fn: Function) => addListener('windows.onFocusChanged', fn),
      },
    },
    alarms: {
      create: () => {},
      onAlarm: {
        addListener: (fn: Function) => addListener('alarms.onAlarm', fn),
      },
    },
    action: {
      setBadgeText: () => {},
      setBadgeBackgroundColor: () => {},
    },
    notifications: {
      create: (id: string, options: any, callback?: Function) => {
        if (callback) callback(id);
      },
    },
    _emit: emit,
    _listeners: listeners,
  };
}
