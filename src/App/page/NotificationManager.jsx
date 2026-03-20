// src/notifications/NotificationManager.jsx
// ── Notification Manager UI ───────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import {
  REMINDER_PRESETS,
  buildOffsetMs,
  buildReminderId,
  formatOffset,
} from '../function/notificationService';


const P = { fontFamily: "'DM Sans',sans-serif" };

// ── InAppAlert popup (shown when app is open) ─────────────────────────────────
export const InAppAlertBanner = ({ alerts, onDismiss, dark }) => {
  if (alerts.length === 0) return null;
  const bg     = dark ? '#1e1e1e' : '#fff';
  const txt    = dark ? '#efefef' : '#111';
  const border = dark ? '#2c2c2c' : '#e8e8e8';

  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 340,
    }}>
      {alerts.map((alert) => (
        <div key={alert.id} style={{
          background: bg, border: `1px solid ${border}`,
          borderLeft: '4px solid #c47a0a',
          borderRadius: 12, padding: '13px 16px',
          boxShadow: '0 8px 28px rgba(0,0,0,.14)',
          animation: 'fadeUp .25s ease-out',
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>🔔</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...P, fontWeight: 600, fontSize: 13.5, color: txt, marginBottom: 2 }}>
              {alert.taskName}
            </div>
            <div style={{ ...P, fontSize: 12, color: dark ? '#666' : '#aaa' }}>
              {alert.listName ? `in "${alert.listName}"` : ''} · due soon
            </div>
          </div>
          <button onClick={() => onDismiss(alert.id)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: dark ? '#555' : '#bbb', fontSize: 18, lineHeight: 1,
            padding: '0 2px', flexShrink: 0,
          }}>×</button>
        </div>
      ))}
    </div>
  );
};

// ── Reminder row in list ──────────────────────────────────────────────────────
const ReminderChip = ({ reminder, onRemove, dark }) => {
  const muted = dark ? '#555' : '#bbb';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: dark ? '#2a2a2a' : '#f5f5f5',
      borderRadius: 99, padding: '4px 10px 4px 8px',
      fontSize: 12, color: dark ? '#efefef' : '#333',
      fontFamily: "'DM Sans',sans-serif",
    }}>
      <span style={{ fontSize: 13 }}>🔔</span>
      {formatOffset(reminder.offsetMs)}
      <button onClick={() => onRemove(reminder.id)} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: muted, fontSize: 14, lineHeight: 1, padding: 0, marginLeft: 2,
      }}>×</button>
    </div>
  );
};

// ── Main NotificationManager ──────────────────────────────────────────────────
/**
 * Props:
 *   task         — task object
 *   dueDate      — ISO string (task due date)
 *   taskReminders — reminders[] for this task (from useNotifications)
 *   isPushEnabled — bool
 *   permission   — 'granted' | 'default' | 'denied' | 'not_supported'
 *   onEnablePush — fn()
 *   onAdd        — fn({ taskId, listId, taskName, listName, dueDate, offsetMs })
 *   onRemove     — fn(reminderId)
 *   dark         — bool
 */
export default function NotificationManager({
  task,
  listId,
  listName,
  dueDate,
  taskReminders = [],
  isPushEnabled,
  permission,
  onEnablePush,
  onAdd,
  onRemove,
  dark,
}) {
  const [mode, setMode] = useState('preset'); // 'preset' | 'custom'
  const [customDays, setCustomDays] = useState('');
  const [customHours, setCustomHours] = useState('');
  const [customMins, setCustomMins] = useState('');
  const [customType, setCustomType] = useState('before'); // 'before' | 'exact'
  const [exactDate, setExactDate] = useState('');
  const [exactTime, setExactTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const txt   = dark ? '#efefef' : '#111';
  const muted = dark ? '#555'    : '#bbb';
  const bdr   = dark ? '#2c2c2c' : '#e8e8e8';
  const surf  = dark ? '#1e1e1e' : '#f8f8f8';

  const hasDueDate = !!dueDate;
  const existingOffsets = new Set(taskReminders.map((r) => r.offsetMs));

  const addPreset = useCallback(async (preset) => {
    if (!hasDueDate && preset.offsetMs > 0) {
      setMsg('⚠️ Please set a due date on the task first');
      return;
    }
    if (existingOffsets.has(preset.offsetMs)) {
      setMsg('Already added');
      return;
    }
    setBusy(true);
    setMsg('');
    await onAdd({
      taskId: task.id,
      listId,
      taskName: task.text,
      listName,
      dueDate,
      offsetMs: preset.offsetMs,
    });
    setMsg('✓ Reminder set');
    setBusy(false);
    setTimeout(() => setMsg(''), 2000);
  }, [hasDueDate, existingOffsets, onAdd, task, listId, listName, dueDate]);

  const addCustom = useCallback(async () => {
    setBusy(true);
    setMsg('');
    try {
      let offsetMs;
      if (customType === 'before') {
        offsetMs = buildOffsetMs({
          days: Number(customDays) || 0,
          hours: Number(customHours) || 0,
          minutes: Number(customMins) || 0,
        });
        if (offsetMs === 0 && !hasDueDate) {
          setMsg('⚠️ Enter at least 1 minute');
          return;
        }
      } else {
        // exact date/time reminder
        if (!exactDate) { setMsg('⚠️ Pick a date'); return; }
        const exactMs = new Date(`${exactDate}T${exactTime || '09:00'}`).getTime();
        const dueMs   = hasDueDate ? new Date(dueDate).getTime() : Date.now() + 365 * 86400000;
        offsetMs = Math.max(0, dueMs - exactMs);
      }

      if (existingOffsets.has(offsetMs)) {
        setMsg('Already added');
        return;
      }

      await onAdd({
        taskId: task.id,
        listId,
        taskName: task.text,
        listName,
        dueDate: dueDate || new Date(Date.now() + offsetMs).toISOString(),
        offsetMs,
      });
      setMsg('✓ Reminder set');
      setCustomDays(''); setCustomHours(''); setCustomMins('');
      setExactDate(''); setExactTime('');
    } catch (err) {
      setMsg('⚠️ ' + err.message);
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(''), 2500);
    }
  }, [customType, customDays, customHours, customMins, exactDate, exactTime,
      existingOffsets, onAdd, task, listId, listName, dueDate, hasDueDate]);

  const numInput = (value, setter, placeholder) => (
    <input
      type="number" min="0" value={value}
      onChange={(e) => setter(e.target.value)}
      placeholder={placeholder}
      style={{
        width: 56, padding: '7px 8px', borderRadius: 8, textAlign: 'center',
        border: `1px solid ${bdr}`, background: surf, color: txt,
        fontSize: 14, outline: 'none', ...P,
      }}
    />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Push permission banner ── */}
      {permission === 'not_supported' && (
        <div style={{ background: dark ? '#2a2a1a' : '#fffbe6', borderRadius: 10, padding: '10px 13px', fontSize: 12.5, color: '#a07000', ...P }}>
          ⚠️ Your browser doesn't support push notifications. In-app alerts still work when the app is open.
        </div>
      )}
      {permission === 'default' && (
        <div style={{ background: dark ? '#1a2535' : '#eef4ff', borderRadius: 10, padding: '10px 13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, color: dark ? '#7aabff' : '#2a5fb0', ...P }}>
            🔔 Enable push to get notified even when the app is closed
          </span>
          <button onClick={onEnablePush} style={{
            background: '#2a5fb0', color: '#fff', border: 'none', borderRadius: 7,
            padding: '6px 12px', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, ...P, flexShrink: 0,
          }}>Enable</button>
        </div>
      )}
      {permission === 'denied' && (
        <div style={{ background: dark ? '#2a1a1a' : '#fff0f0', borderRadius: 10, padding: '10px 13px', fontSize: 12.5, color: '#c0392b', ...P }}>
          🚫 Notifications are blocked. Please enable them in browser settings.
        </div>
      )}

      {/* ── No due date warning ── */}
      {!hasDueDate && (
        <div style={{ background: dark ? '#2a2420' : '#fff8ec', borderRadius: 10, padding: '10px 13px', fontSize: 12.5, color: '#a06000', ...P }}>
          ⏰ Set a due date on the task to use "before due" reminders.
        </div>
      )}

      {/* ── Active reminders ── */}
      {taskReminders.length > 0 && (
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: muted, letterSpacing: '.08em', marginBottom: 7, ...P }}>ACTIVE REMINDERS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {taskReminders.map((r) => (
              <ReminderChip key={r.id} reminder={r} onRemove={onRemove} dark={dark} />
            ))}
          </div>
        </div>
      )}

      {/* ── Mode toggle ── */}
      <div style={{ display: 'flex', background: dark ? '#1e1e1e' : '#f0f0f0', borderRadius: 9, padding: 3, gap: 2 }}>
        {[['preset', 'Quick'], ['custom', 'Custom']].map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex: 1, padding: '6px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: mode === m ? (dark ? '#333' : '#fff') : 'transparent',
            color: mode === m ? txt : muted,
            fontWeight: mode === m ? 600 : 400, fontSize: 13, ...P,
            boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
          }}>{label}</button>
        ))}
      </div>

      {/* ── Preset pills ── */}
      {mode === 'preset' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {REMINDER_PRESETS.map((preset) => {
            const added = existingOffsets.has(preset.offsetMs);
            const disabled = !hasDueDate && preset.offsetMs > 0;
            return (
              <button
                key={preset.offsetMs}
                onClick={() => !added && !disabled && addPreset(preset)}
                disabled={disabled || busy}
                style={{
                  padding: '7px 13px', borderRadius: 99, fontSize: 12.5, cursor: disabled ? 'not-allowed' : added ? 'default' : 'pointer',
                  border: `1.5px solid ${added ? '#2f8a55' : disabled ? (dark?'#2a2a2a':'#e8e8e8') : bdr}`,
                  background: added ? (dark ? '#162218' : '#e8f7ee') : 'transparent',
                  color: added ? '#2f8a55' : disabled ? (dark?'#333':'#ccc') : txt,
                  fontWeight: added ? 600 : 400, ...P,
                  transition: 'all .12s',
                }}
              >
                {added ? '✓ ' : ''}{preset.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Custom inputs ── */}
      {mode === 'custom' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Sub-mode */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[['before', '⏳ Before due'], ['exact', '📅 Exact time']].map(([v, label]) => (
              <button key={v} onClick={() => setCustomType(v)} style={{
                flex: 1, padding: '7px', borderRadius: 8, cursor: 'pointer', fontSize: 12.5,
                border: `1.5px solid ${customType === v ? txt : bdr}`,
                background: customType === v ? (dark ? '#333' : '#f0f0f0') : 'transparent',
                color: txt, fontWeight: customType === v ? 600 : 400, ...P,
              }}>{label}</button>
            ))}
          </div>

          {customType === 'before' ? (
            <div>
              <div style={{ fontSize: 11, color: muted, marginBottom: 8, ...P }}>Remind me this long before due date:</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {numInput(customDays, setCustomDays, '0')}
                  <span style={{ fontSize: 12, color: muted, ...P }}>days</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {numInput(customHours, setCustomHours, '0')}
                  <span style={{ fontSize: 12, color: muted, ...P }}>hrs</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {numInput(customMins, setCustomMins, '0')}
                  <span style={{ fontSize: 12, color: muted, ...P }}>min</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 11, color: muted, marginBottom: 8, ...P }}>Remind me at this exact date & time:</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input type="date" value={exactDate} onChange={(e) => setExactDate(e.target.value)}
                  style={{ flex: 1, minWidth: 120, padding: '8px 10px', borderRadius: 8, border: `1px solid ${bdr}`, background: surf, color: txt, outline: 'none', fontSize: 13, ...P }} />
                <input type="time" value={exactTime} onChange={(e) => setExactTime(e.target.value)}
                  style={{ width: 105, padding: '8px 10px', borderRadius: 8, border: `1px solid ${bdr}`, background: surf, color: txt, outline: 'none', fontSize: 13, ...P }} />
              </div>
            </div>
          )}

          <button onClick={addCustom} disabled={busy} style={{
            background: '#111', color: '#fafafa', border: 'none', borderRadius: 9,
            padding: '10px', cursor: busy ? 'wait' : 'pointer',
            fontSize: 13.5, fontWeight: 600, ...P,
          }}>
            {busy ? 'Saving…' : '+ Add Reminder'}
          </button>
        </div>
      )}

      {/* ── Status message ── */}
      {msg && (
        <div style={{
          fontSize: 12.5, color: msg.startsWith('✓') ? '#2f8a55' : '#a06000',
          ...P, animation: 'fadeUp .2s ease-out',
        }}>{msg}</div>
      )}
    </div>
  );
}
