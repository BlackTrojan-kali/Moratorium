import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, CheckCheck, RefreshCw } from 'lucide-react';

import { useNotifications } from '../../app/NotificationsContext';

function formatWhen(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Filter = 'all' | 'unread';

export function NotificationsPage() {
  const {
    items,
    unreadCount,
    loading,
    error,
    reload,
    markRead,
    markAllRead,
  } = useNotifications();

  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(
    () => (filter === 'unread' ? items.filter(item => !item.readAt) : items),
    [items, filter],
  );

  return (
    <div className="page">
      <header className="page-heading">
        <p className="page-heading-eyebrow">Your workspace</p>
        <h1>Notifications</h1>
        <p>
          Updates about your requests, deposits and decisions. Opening a
          notification shows the request it belongs to.
        </p>
      </header>

      <div className="page-actions" style={{ marginBottom: 22 }}>
        <button
          type="button"
          className="page-button"
          aria-pressed={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          All ({items.length})
        </button>

        <button
          type="button"
          className="page-button"
          aria-pressed={filter === 'unread'}
          onClick={() => setFilter('unread')}
        >
          Unread ({unreadCount})
        </button>

        <span style={{ flex: 1 }} />

        <button
          type="button"
          className="page-button"
          onClick={reload}
          disabled={loading}
        >
          <RefreshCw size={15} aria-hidden="true" />
          <span style={{ marginLeft: 6 }}>Refresh</span>
        </button>

        <button
          type="button"
          className="page-button page-button-primary"
          onClick={() => void markAllRead()}
          disabled={unreadCount === 0}
        >
          Mark all as read
        </button>
      </div>

      <section className="page-card" aria-busy={loading}>
        <div className="page-card-heading">
          <h2>
            {filter === 'unread' ? 'Unread notifications' : 'All notifications'}
          </h2>
        </div>

        {loading && (
          <p className="page-state" role="status">
            Loading your notifications…
          </p>
        )}

        {!loading && error && (
          <div className="page-empty">
            <p className="page-alert" role="alert">
              {error}
            </p>

            <button type="button" className="page-button" onClick={reload}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <div className="page-empty">
            <p className="page-state" role="status">
              {filter === 'unread'
                ? 'You have no unread notifications.'
                : 'You have no notifications yet. Decisions and assignments will appear here.'}
            </p>

            {filter === 'unread' && items.length > 0 && (
              <button
                type="button"
                className="page-button"
                onClick={() => setFilter('all')}
              >
                Show all notifications
              </button>
            )}
          </div>
        )}

        {visible.length > 0 && (
          <ul className="page-list">
            {visible.map(item => (
              <li
                key={item.id}
                className={`page-row notification-row${item.readAt ? '' : ' unread'}`}
              >
                <span className="page-row-icon">
                  <BellRing size={19} aria-hidden="true" />
                </span>

                <div className="page-row-copy">
                  <strong>
                    {item.title ?? 'Request update'}
                    {!item.readAt && (
                      <span className="page-badge">New</span>
                    )}
                  </strong>

                  <span>{item.message}</span>

                  <span className="notification-time">
                    {formatWhen(item.createdAt)}
                  </span>
                </div>

                <div className="page-actions">
                  {item.requestId && (
                    <Link
                      className="page-button"
                      to={`/requests/${item.requestId}`}
                      onClick={() => void markRead(item.id)}
                    >
                      Open
                    </Link>
                  )}

                  {!item.readAt && (
                    <button
                      type="button"
                      className="page-button"
                      onClick={() => void markRead(item.id)}
                    >
                      <CheckCheck size={15} aria-hidden="true" />
                      <span style={{ marginLeft: 6 }}>Mark read</span>
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
