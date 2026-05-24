import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    const d = localStorage.getItem('dismissedNotifs');
    return d ? JSON.parse(d) : [];
  });
  const [showBanner, setShowBanner] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/reminders/notifications');
      const all = res.data.data || [];
      // Filter out dismissed ones (by id + urgency key)
      const active = all.filter(
        (n) => !dismissed.includes(`${n.id}-${n.urgency}`)
      );
      setNotifications(active);
      if (active.length > 0) setShowBanner(true);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  }, [dismissed]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const dismiss = (notifId, urgency) => {
    const key = `${notifId}-${urgency}`;
    const updated = [...dismissed, key];
    setDismissed(updated);
    localStorage.setItem('dismissedNotifs', JSON.stringify(updated));
    setNotifications((prev) => prev.filter((n) => !(n.id === notifId && n.urgency === urgency)));
  };

  const dismissAll = () => {
    const keys = notifications.map((n) => `${n.id}-${n.urgency}`);
    const updated = [...dismissed, ...keys];
    setDismissed(updated);
    localStorage.setItem('dismissedNotifs', JSON.stringify(updated));
    setNotifications([]);
    setShowBanner(false);
  };

  const refresh = () => {
    fetchNotifications();
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, showBanner, setShowBanner, dismiss, dismissAll, refresh }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
