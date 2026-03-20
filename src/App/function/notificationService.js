// src/notifications/notificationService.js
// ── Core notification service ─────────────────────────────────────────────────

import { db } from '../../firebase';
import {
  collection, doc, setDoc, deleteDoc, getDocs,
  query, where, serverTimestamp, onSnapshot,
} from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// VAPID Public Key — แทนที่ด้วย key ของคุณจาก Firebase Console
// Project Settings → Cloud Messaging → Web Push certificates → Key pair
// ─────────────────────────────────────────────────────────────────────────────
export const VAPID_PUBLIC_KEY = 'BK8pgJr3t03bLcgIzdrPkXXOR0RNx0-W9rVtr9ZqIOor1iq5fKnU5EqMy-26DBb3OXV7mf4Tqq1KMcIPA1cxInY';

// ── Helpers ───────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// ── Permission ────────────────────────────────────────────────────────────────

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return { granted: false, reason: 'not_supported' };
  }
  if (Notification.permission === 'granted') {
    return { granted: true };
  }
  const permission = await Notification.requestPermission();
  return {
    granted: permission === 'granted',
    reason: permission === 'denied' ? 'denied' : 'dismissed',
  };
}

export function getPermissionStatus() {
  if (!('Notification' in window)) return 'not_supported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

// ── Service Worker Registration ───────────────────────────────────────────────

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker not supported in this browser');
  }
  const registration = await navigator.serviceWorker.register('/sw.js', {
    scope: '/',
  });
  // Wait for SW to be active
  await navigator.serviceWorker.ready;
  return registration;
}

// ── Push Subscription ─────────────────────────────────────────────────────────

export async function subscribeToPush(userId) {
  const registration = await registerServiceWorker();
  const { granted } = await requestNotificationPermission();
  if (!granted) throw new Error('Notification permission not granted');

  // Check existing subscription first
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  // Save subscription to Firestore
  await saveSubscriptionToFirestore(userId, subscription);
  return subscription;
}

export async function unsubscribeFromPush(userId) {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
  }
  // Remove from Firestore
  await deleteDoc(doc(db, 'pushSubscriptions', userId));
}

async function saveSubscriptionToFirestore(userId, subscription) {
  await setDoc(doc(db, 'pushSubscriptions', userId), {
    userId,
    subscription: JSON.stringify(subscription),
    endpoint: subscription.endpoint,
    updatedAt: serverTimestamp(),
    userAgent: navigator.userAgent,
  });
}

// ── Reminders CRUD ────────────────────────────────────────────────────────────

/**
 * Create or update a reminder for a task.
 * @param {object} opts
 * @param {string} opts.userId
 * @param {string} opts.taskId
 * @param {string} opts.listId
 * @param {string} opts.taskName
 * @param {string} opts.listName
 * @param {Date}   opts.dueDate      — task due date
 * @param {number} opts.offsetMs     — ms before due date to fire (e.g. 3600000 = 1h before)
 * @param {string} opts.reminderId   — unique id for this reminder (taskId + offset)
 */
export async function saveReminder({
  userId, taskId, listId, taskName, listName, dueDate, offsetMs, reminderId,
}) {
  if (!dueDate) throw new Error('Task has no due date');
  const remindAt = new Date(new Date(dueDate).getTime() - offsetMs);
  if (remindAt <= new Date()) {
    // Already past — don't save
    return null;
  }

  const data = {
    userId,
    taskId,
    listId,
    taskName,
    listName,
    dueDate: dueDate instanceof Date ? dueDate.toISOString() : dueDate,
    remindAt: remindAt.toISOString(),
    remindAtTimestamp: remindAt.getTime(),
    offsetMs,
    sent: false,
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'reminders', reminderId), data);
  return data;
}

export async function deleteReminder(reminderId) {
  await deleteDoc(doc(db, 'reminders', reminderId));
}

export async function deleteAllRemindersForTask(taskId, userId) {
  const q = query(
    collection(db, 'reminders'),
    where('taskId', '==', taskId),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

/**
 * Listen to reminders for a user (realtime).
 * Returns unsubscribe function.
 */
export function subscribeToReminders(userId, callback) {
  const q = query(
    collection(db, 'reminders'),
    where('userId', '==', userId),
    where('sent', '==', false)
  );
  return onSnapshot(q, (snap) => {
    const reminders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(reminders);
  });
}

// ── In-App Notification Check ─────────────────────────────────────────────────
// Polls every 30s when app is open — shows browser Notification directly
// (no backend needed for this part)

let inAppInterval = null;

export function startInAppNotificationCheck(userId, onNotify) {
  if (inAppInterval) clearInterval(inAppInterval);

  const check = async () => {
    if (Notification.permission !== 'granted') return;
    const now = Date.now();
    const q = query(
      collection(db, 'reminders'),
      where('userId', '==', userId),
      where('sent', '==', false)
    );
    const snap = await getDocs(q);
    for (const docSnap of snap.docs) {
      const r = docSnap.data();
      if (r.remindAtTimestamp <= now) {
        // Fire notification
        const title = `📌 ${r.taskName}`;
        const body = r.listName
          ? `Due in your list "${r.listName}"`
          : 'Task is due soon!';

        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          // Use SW notification (better on mobile)
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification(title, {
            body,
            icon: '/icon-192.png',
            tag: docSnap.id,
            data: { taskId: r.taskId },
          });
        } else {
          // Fallback: browser Notification API
          new Notification(title, { body, icon: '/icon-192.png' });
        }

        // Mark as sent
        await setDoc(doc(db, 'reminders', docSnap.id), { sent: true }, { merge: true });

        // Also call in-app callback (for popup UI)
        onNotify?.({ ...r, id: docSnap.id });
      }
    }
  };

  check(); // run immediately
  inAppInterval = setInterval(check, 30_000);
  return () => clearInterval(inAppInterval);
}

// ── Preset offset helpers ─────────────────────────────────────────────────────

export const REMINDER_PRESETS = [
  { label: 'At time of due',  offsetMs: 0 },
  { label: '5 min before',   offsetMs: 5 * 60 * 1000 },
  { label: '15 min before',  offsetMs: 15 * 60 * 1000 },
  { label: '30 min before',  offsetMs: 30 * 60 * 1000 },
  { label: '1 hour before',  offsetMs: 60 * 60 * 1000 },
  { label: '3 hours before', offsetMs: 3 * 60 * 60 * 1000 },
  { label: '1 day before',   offsetMs: 24 * 60 * 60 * 1000 },
  { label: '3 days before',  offsetMs: 3 * 24 * 60 * 60 * 1000 },
  { label: '1 week before',  offsetMs: 7 * 24 * 60 * 60 * 1000 },
];

export function buildOffsetMs({ days = 0, hours = 0, minutes = 0 }) {
  return ((days * 24 + hours) * 60 + minutes) * 60 * 1000;
}

export function buildReminderId(taskId, offsetMs) {
  return `${taskId}_${offsetMs}`;
}

export function formatOffset(offsetMs) {
  if (offsetMs === 0) return 'At due time';
  const totalMin = offsetMs / 60000;
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (mins) parts.push(`${mins}m`);
  return parts.join(' ') + ' before';
}
