import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { api } from './api';
import { useAuth } from './AuthContext';

export interface NotificationItem {
  id: string;
  title: string | null;
  message: string;
  requestId: string | null;
  createdAt: string;
  readAt: string | null;
}

interface NotificationsResponse {
  items: NotificationItem[];
}

interface NotificationsValue {
  items: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string;
  reload: () => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext =
  createContext<NotificationsValue | null>(null);

/**
 * Single owner of the notification list. The header badge and the
 * notifications page read from here, so they can never disagree.
 */
export function NotificationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();

  return (
    <NotificationsSession key={user?.id ?? 'signed-out'}>
      {children}
    </NotificationsSession>
  );
}

function NotificationsSession({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    let active = true;

    setLoading(true);
    setError('');

    api<NotificationsResponse>('/notifications')
      .then(result => {
        if (active) setItems(result.items ?? []);
      })
      .catch(caught => {
        if (!active) return;

        setError(
          caught instanceof Error
            ? caught.message
            : 'Unable to load your notifications.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id, revision]);

  const markRead = useCallback(async (id: string) => {
    // Optimistic: the list stays responsive, and a failure reloads it.
    setItems(current =>
      current.map(item =>
        item.id === id && !item.readAt
          ? { ...item, readAt: new Date().toISOString() }
          : item,
      ),
    );

    try {
      await api(`/notifications/${id}/read`, {});
    } catch {
      setRevision(value => value + 1);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const stamp = new Date().toISOString();

    setItems(current =>
      current.map(item => ({ ...item, readAt: item.readAt ?? stamp })),
    );

    try {
      await api('/notifications/read-all', {});
    } catch {
      setRevision(value => value + 1);
    }
  }, []);

  const unreadCount = useMemo(
    () => items.filter(item => !item.readAt).length,
    [items],
  );

  const value = useMemo<NotificationsValue>(
    () => ({
      items,
      unreadCount,
      loading,
      error,
      reload: () => setRevision(current => current + 1),
      markRead,
      markAllRead,
    }),
    [items, unreadCount, loading, error, markRead, markAllRead],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const value = useContext(NotificationsContext);

  if (!value) {
    throw new Error('NotificationsProvider is required');
  }

  return value;
}
