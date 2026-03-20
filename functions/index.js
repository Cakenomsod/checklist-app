// functions/index.js
// ── Firebase Cloud Functions — Notification Scheduler ─────────────────────────
// Deploy: firebase deploy --only functions
//
// ต้องติดตั้ง: npm install web-push firebase-admin firebase-functions
// และตั้ง VAPID keys ด้วย:
//   firebase functions:config:set vapid.public="..." vapid.private="..." vapid.email="mailto:you@example.com"

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const webpush = require('web-push');

admin.initializeApp();
const db = admin.firestore();

// ── VAPID setup ───────────────────────────────────────────────────────────────
// Run once: node -e "const wp = require('web-push'); console.log(wp.generateVAPIDKeys())"
// Then set via: firebase functions:config:set vapid.public="..." vapid.private="..." vapid.email="..."
function initVapid() {
  const config = process.env;
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}



// ── Scheduled function: runs every minute ─────────────────────────────────────
exports.sendScheduledReminders = onSchedule(
  { schedule: 'every 1 minutes', timeZone: 'Asia/Bangkok' },
  async (event) => {
    initVapid();
    const now = Date.now();
    const windowMs = 60_000; // 1 minute window to catch reminders

    // Query reminders due in the last 0-60 seconds
    const snap = await db.collection('reminders')
      .where('sent', '==', false)
      .where('remindAtTimestamp', '<=', now)
      .where('remindAtTimestamp', '>=', now - windowMs)
      .get();

    if (snap.empty) return;

    const batch = db.batch();
    const pushPromises = [];

    for (const docSnap of snap.docs) {
      const reminder = docSnap.data();

      // Get user's push subscription
      const subDoc = await db.collection('pushSubscriptions').doc(reminder.userId).get();
      if (!subDoc.exists) {
        // No subscription — mark as sent anyway
        batch.update(docSnap.ref, { sent: true, sentAt: admin.firestore.FieldValue.serverTimestamp(), reason: 'no_subscription' });
        continue;
      }

      const { subscription } = subDoc.data();
      let parsedSub;
      try {
        parsedSub = typeof subscription === 'string' ? JSON.parse(subscription) : subscription;
      } catch {
        batch.update(docSnap.ref, { sent: true, reason: 'invalid_subscription' });
        continue;
      }

      const payload = JSON.stringify({
        title: `📌 ${reminder.taskName}`,
        body: reminder.listName
          ? `Due soon in "${reminder.listName}"`
          : 'You have a task due soon!',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: `reminder-${reminder.taskId}`,
        taskId: reminder.taskId,
        listId: reminder.listId,
        url: `/?task=${reminder.taskId}`,
      });

      pushPromises.push(
        webpush.sendNotification(parsedSub, payload)
          .then(() => {
            batch.update(docSnap.ref, {
              sent: true,
              sentAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          })
          .catch(async (err) => {
            console.error(`Push failed for ${reminder.userId}:`, err.statusCode, err.body);
            if (err.statusCode === 410 || err.statusCode === 404) {
              // Subscription expired — remove it
              await db.collection('pushSubscriptions').doc(reminder.userId).delete();
            }
            batch.update(docSnap.ref, {
              sent: true,
              error: err.message,
              sentAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          })
      );
    }

    await Promise.all(pushPromises);
    await batch.commit();
    console.log(`Processed ${snap.size} reminders`);
  }
);

// ── Optional: send immediate push when reminder is very close ─────────────────
// Triggered when a reminder document is created
exports.onReminderCreated = onDocumentCreated('reminders/{reminderId}', async (event) => {
  const reminder = event.data.data();
  const now = Date.now();

  // If reminder is within 2 minutes, send immediately
  if (reminder.remindAtTimestamp - now > 2 * 60 * 1000) return;

  initVapid();

  const subDoc = await db.collection('pushSubscriptions').doc(reminder.userId).get();
  if (!subDoc.exists) return;

  const { subscription } = subDoc.data();
  const parsedSub = typeof subscription === 'string' ? JSON.parse(subscription) : subscription;

  const payload = JSON.stringify({
    title: `📌 ${reminder.taskName}`,
    body: `Due soon in "${reminder.listName || 'your list'}"`,
    icon: '/icon-192.png',
    taskId: reminder.taskId,
    url: `/?task=${reminder.taskId}`,
  });

  try {
    await webpush.sendNotification(parsedSub, payload);
    await event.data.ref.update({ sent: true, sentAt: admin.firestore.FieldValue.serverTimestamp() });
  } catch (err) {
    console.error('Immediate push failed:', err);
  }
});

// ── Email reminders via Firebase Extension ────────────────────────────────────
// Install "Trigger Email" extension from Firebase Console, then:
exports.onReminderForEmail = onDocumentCreated('reminders/{reminderId}', async (event) => {
  const reminder = event.data.data();
  const now = Date.now();

  // Only send email 24h before due
  if (reminder.offsetMs !== 24 * 60 * 60 * 1000) return;

  // Get user email from Firestore
  const userDoc = await db.collection('users').doc(reminder.userId).get();
  if (!userDoc.exists) return;
  const { email, displayName } = userDoc.data();
  if (!email) return;

  // Write to 'mail' collection (Trigger Email Extension reads this)
  await db.collection('mail').add({
    to: email,
    message: {
      subject: `⏰ Reminder: "${reminder.taskName}" is due tomorrow`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #111;">📌 Task Reminder</h2>
          <p>Hi ${displayName || 'there'},</p>
          <p>Your task <strong>"${reminder.taskName}"</strong>
             ${reminder.listName ? `in list <em>${reminder.listName}</em>` : ''} 
             is due <strong>tomorrow</strong>.</p>
          <p>Due date: ${new Date(reminder.dueDate).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}</p>
          <a href="https://your-app-url.com/?task=${reminder.taskId}"
             style="display: inline-block; margin-top: 16px; padding: 12px 24px;
                    background: #111; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Open Task →
          </a>
          <p style="color: #aaa; font-size: 12px; margin-top: 24px;">Checkmate · Task Manager</p>
        </div>
      `,
    },
  });
});
