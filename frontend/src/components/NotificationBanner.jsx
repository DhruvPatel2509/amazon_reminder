import { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';

const urgencyStyles = {
  overdue: {
    bg: 'bg-red-950/60 border-red-800/50',
    marker: '!',
    text: 'text-red-300',
    badge: 'bg-red-900/50 text-red-200',
  },
  today: {
    bg: 'bg-orange-950/60 border-orange-800/50',
    marker: 'Today',
    text: 'text-orange-200',
    badge: 'bg-orange-900/50 text-orange-200',
  },
  tomorrow: {
    bg: 'bg-yellow-950/40 border-yellow-800/40',
    marker: 'Soon',
    text: 'text-yellow-200',
    badge: 'bg-yellow-900/50 text-yellow-200',
  },
};

export default function NotificationBanner() {
  const { notifications, showBanner, setShowBanner, dismiss, dismissAll } = useNotifications();
  const [collapsed, setCollapsed] = useState(false);

  if (!showBanner || notifications.length === 0) return null;

  return (
    <div className="border-b border-border bg-ink/90 backdrop-blur-sm animate-slide-down">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-display font-semibold text-white">
              {notifications.length} Active Reminder{notifications.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-xs text-gray-300 hover:text-white transition-colors px-2 py-1 rounded hover:bg-card"
            >
              {collapsed ? 'Show' : 'Hide'}
            </button>
            <button
              onClick={dismissAll}
              className="text-xs text-gray-300 hover:text-danger transition-colors px-2 py-1 rounded hover:bg-card"
            >
              Dismiss All
            </button>
          </div>
        </div>

        {!collapsed && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {notifications.map((notif) => {
              const style = urgencyStyles[notif.urgency] || urgencyStyles.tomorrow;
              return (
                <div
                  key={`${notif.id}-${notif.urgency}`}
                  className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5 sm:items-center sm:px-4 ${style.bg}`}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <span className="shrink-0 rounded-md border border-current px-2 py-0.5 text-xs font-display font-semibold text-white">
                      {style.marker}
                    </span>
                    <span className={`min-w-0 break-words text-sm font-body ${style.text}`}>{notif.message}</span>
                    <span className={`w-fit shrink-0 text-xs px-2 py-0.5 rounded-full font-display font-semibold uppercase ${style.badge}`}>
                      {notif.urgency}
                    </span>
                  </div>
                  <button
                    onClick={() => dismiss(notif.id, notif.urgency)}
                    className="ml-4 text-gray-300 hover:text-white transition-colors text-lg leading-none"
                  >
                    x
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
