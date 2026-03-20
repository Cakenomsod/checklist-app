// src/notifications/useNotifications.js
// ── React hook for notifications ──────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  subscribeToPush,
  unsubscribeFromPush,
  getPermissionStatus,
  requestNotificationPermission,
  subscribeToReminders,
  saveReminder,
  deleteReminder,
  deleteAllRemindersForTask,
  startInAppNotificationCheck,
  buildReminderId,
} from './notificationService';

export function useNotifications(userId) {
  const [permission, setPermission] = useState(getPermissionStatus());
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [reminders, setReminders] = useState([]);           // pending reminders
  const [inAppAlerts, setInAppAlerts] = useState([]);       // for popup UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const stopCheckRef = useRef(null);

  // ── Subscribe to reminders from Firestore ──────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToReminders(userId, setReminders);
    return unsub;
  }, [userId]);

  // ── Start in-app check loop ────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || permission !== 'granted') return;
    const stop = startInAppNotificationCheck(userId, (alert) => {
      setInAppAlerts((prev) => [alert, ...prev]);
    });
    stopCheckRef.current = stop;
    return stop;
  }, [userId, permission]);

  // ── Check if push is currently subscribed ─────────────────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsPushEnabled(!!sub);
      });
    });
  }, []);

  // ── Listen for SW messages (task open requests) ───────────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event) => {
      if (event.data?.type === 'OPEN_TASK') {
        // App can listen to this via a separate context/event if needed
        window.dispatchEvent(new CustomEvent('checkmate:open-task', {
          detail: { taskId: event.data.taskId },
        }));
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  // ── Enable push notifications ──────────────────────────────────────────────
  const enablePush = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      await subscribeToPush(userId);
      setIsPushEnabled(true);
      setPermission('granted');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // ── Disable push notifications ─────────────────────────────────────────────
  const disablePush = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await unsubscribeFromPush(userId);
      setIsPushEnabled(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // ── Add reminder ───────────────────────────────────────────────────────────
  const addReminder = useCallback(async ({
    taskId, listId, taskName, listName, dueDate, offsetMs,
  }) => {
    if (!userId) return;
    const reminderId = buildReminderId(taskId, offsetMs);
    try {
      await saveReminder({
        userId, taskId, listId, taskName, listName, dueDate, offsetMs, reminderId,
      });
    } catch (err) {
      setError(err.message);
    }
  }, [userId]);

  // ── Remove one reminder ────────────────────────────────────────────────────
  const removeReminder = useCallback(async (reminderId) => {
    try {
      await deleteReminder(reminderId);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // ── Remove all reminders for a task ───────────────────────────────────────
  const removeTaskReminders = useCallback(async (taskId) => {
    if (!userId) return;
    try {
      await deleteAllRemindersForTask(taskId, userId);
    } catch (err) {
      setError(err.message);
    }
  }, [userId]);

  // ── Dismiss in-app alert ───────────────────────────────────────────────────
  const dismissAlert = useCallback((id) => {
    setInAppAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // ── Get reminders for a specific task ────────────────────────────────────
  const getTaskReminders = useCallback((taskId) => {
    return reminders.filter((r) => r.taskId === taskId);
  }, [reminders]);

  return {
    permission,
    isPushEnabled,
    reminders,
    inAppAlerts,
    loading,
    error,
    enablePush,
    disablePush,
    addReminder,
    removeReminder,
    removeTaskReminders,
    dismissAlert,
    getTaskReminders,
  };
}
