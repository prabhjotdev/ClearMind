import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface SyncContextType {
  isSyncing: boolean;
  isOffline: boolean;
  /** Wraps an async operation, showing the sync indicator while it runs. */
  trackSync: <T>(fn: () => Promise<T>) => Promise<T>;
}

const SyncContext = createContext<SyncContextType>({
  isSyncing: false,
  isOffline: false,
  trackSync: (fn) => fn(),
});

export function useSyncContext(): SyncContextType {
  return useContext(SyncContext);
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    function handleOnline() { setIsOffline(false); }
    function handleOffline() { setIsOffline(true); }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const trackSync = useCallback(async function<T>(fn: () => Promise<T>): Promise<T> {
    setPendingCount((c) => c + 1);
    try {
      return await fn();
    } finally {
      setPendingCount((c) => c - 1);
    }
  }, []);

  return (
    <SyncContext.Provider
      value={{ isSyncing: pendingCount > 0, isOffline, trackSync }}
    >
      {children}
    </SyncContext.Provider>
  );
}
