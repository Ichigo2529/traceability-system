import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { OfflineQueueManager } from './queue';
import { SDK } from '@traceability/sdk';

interface OfflineQueueContextType {
  queue: OfflineQueueManager;
  isOnline: boolean;
  pendingCount: number;
}

const OfflineQueueContext = createContext<OfflineQueueContextType | null>(null);

export const OfflineQueueProvider: React.FC<{ client: SDK; children: React.ReactNode }> = ({ client, children }) => {
  const [queue] = useState(() => new OfflineQueueManager(client));
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor Network Status
  useEffect(() => {
    const handleOnline = () => {
        setIsOnline(true);
        queue.process(); // Trigger sync immediately
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queue]);

  // Monitor DB Count
  const pendingCount = useLiveQuery(() => db.queued_events.count()) ?? 0;

  return (
    <OfflineQueueContext.Provider value={{ queue, isOnline, pendingCount }}>
      {children}
    </OfflineQueueContext.Provider>
  );
};

export const useOfflineQueue = () => {
  const context = useContext(OfflineQueueContext);
  if (!context) {
    throw new Error('useOfflineQueue must be used within an OfflineQueueProvider');
  }
  return context;
};

export const useQueuedEvents = () => {
  return useLiveQuery(() => db.queued_events.orderBy('id').toArray()) ?? [];
};
