// src/notifications/NotificationManager.jsx
// ── Notification Manager UI ───────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import {
  REMINDER_PRESETS,
  buildOffsetMs,
  formatOffset,
} from '../function/notificationService';


const P = { fontFamily: "'DM Sans',sans-serif" };

const C = {
  ink: '#0a0a0a',
  inkSoft: '#111111',
  paper: '#fafafa',
  surface: '#ffffff',
  surfaceMuted: '#f8f8f8',
  border: '#e8e8e8',
  muted: '#888888',
  mutedSoft: '#aaaaaa',
  darkBg: '#111111',
  darkSurface: '#1e1e1e',
  darkBorder: '#2c2c2c',
  darkText: '#efefef',
  priorityMed: '#c47a0a',
  priorityMedBg: '#FFF6E0',
  priorityHighBg: '#FFECEC',
  priorityLow: '#2f8a55',
  priorityLowBg: '#E4F7EC',
  danger: '#c0392b',
  pastelBlue: '#D6E8FF',
};

const focusRing = (el, color) => {
  el.style.outline = `2px solid ${color}`;
  el.style.outlineOffset = '2px';
};
const clearFocus = (el) => {
  el.style.outline = 'none';
  el.style.outlineOffset = '';
};

// ── InAppAlert popup (shown when app is open) ─────────────────────────────────
export const InAppAlertBanner = ({ alerts, onDismiss, dark }) => {
  if (alerts.length === 0) return null;
  const txt    = dark ? C.darkText : C.inkSoft;
  const border = dark ? C.darkBorder : C.border;
  const tint   = dark ? C.darkSurface : C.priorityMedBg;
  const sub    = dark ? C.mutedSoft : C.muted;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div style={{
      position: 'fixed',
      top: isMobile ? 'auto' : 16,
      bottom: isMobile ? 'calc(72px + env(safe-area-inset-bottom, 0px))' : 'auto',
      right: isMobile ? 12 : 16,
      left: isMobile ? 12 : 'auto',
      zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      maxWidth: isMobile ? 'none' : 340,
    }}>
      {alerts.map((alert) => (
        <div key={alert.id} role="status" style={{
          background: tint,
          border: `1px solid ${border}`,
          borderTop: `2px solid ${C.priorityMed}`,
          borderRadius: 12, padding: '12px 14px',
          boxShadow: dark ? '0 8px 28px rgba(0,0,0,.28)' : '0 8px 28px rgba(0,0,0,.10)',
          animation: 'fadeUp .25s ease-out',
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: dark ? 'rgba(196,122,10,.18)' : 'rgba(196,122,10,.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, color: C.priorityMed, fontWeight: 700, ...P,
          }} aria-hidden="true">!</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...P, fontWeight: 600, fontSize: 13.5, color: txt, marginBottom: 2, lineHeight: 1.35 }}>
              {alert.taskName}
            </div>
            <div style={{ ...P, fontSize: 12, color: sub, lineHeight: 1.35 }}>
              {alert.listName ? `${alert.listName} · ` : ''}Due soon
            </div>
          </div>
          <button
            type="button"
            aria-label="Dismiss reminder"
            onClick={() => onDismiss(alert.id)}
            onFocus={(e) => focusRing(e.currentTarget, dark ? C.mutedSoft : C.inkSoft)}
            onBlur={(e) => clearFocus(e.currentTarget)}
            onMouseEnter={(e) => { e.currentTarget.style.color = txt; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = sub; }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: sub, fontSize: 18, lineHeight: 1,
              padding: 4, flexShrink: 0, borderRadius: 6, ...P,
            }}
          >×</button>
        </div>
      ))}
    </div>
  );
};

// ── Reminder row in list ──────────────────────────────────────────────────────
const ReminderChip = ({ reminder, onRemove, dark }) => {
  const txt = dark ? C.darkText : C.inkSoft;
  const muted = dark ? C.mutedSoft : C.muted;
  const chipBg = dark ? C.darkSurface : C.surfaceMuted;
  const chipBdr = dark ? C.darkBorder : C.border;

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: chipBg,
      border: `1px solid ${chipBdr}`,
      borderRadius: 99, padding: '5px 8px 5px 10px',
      fontSize: 12.5, color: txt, ...P,
    }}>
      <span style={{ fontSize: 11, color: C.priorityMed, fontWeight: 700 }} aria-hidden="true">●</span>
      <span>{formatOffset(reminder.offsetMs)}</span>
      <button
        type="button"
        aria-label={`Remove ${formatOffset(reminder.offsetMs)} reminder`}
        onClick={() => onRemove(reminder.id)}
        onFocus={(e) => focusRing(e.currentTarget, dark ? C.mutedSoft : C.inkSoft)}
        onBlur={(e) => clearFocus(e.currentTarget)}
        onMouseEnter={(e) => { e.currentTarget.style.color = C.danger; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = muted; }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: muted, fontSize: 15, lineHeight: 1, padding: '0 2px',
          borderRadius: 4, ...P,
        }}
      >×</button>
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
  const [hoveredSeg, setHoveredSeg] = useState(null);
  const [hoveredPreset, setHoveredPreset] = useState(null);
  const [hoveredSub, setHoveredSub] = useState(null);

  const txt   = dark ? C.darkText : C.inkSoft;
  const muted = dark ? C.mutedSoft : C.muted;
  const bdr   = dark ? C.darkBorder : C.border;
  const surf  = dark ? C.darkSurface : C.surfaceMuted;
  const focus = dark ? C.mutedSoft : C.inkSoft;

  const hasDueDate = !!dueDate;
  const existingOffsets = new Set(taskReminders.map((r) => r.offsetMs));

  const addPreset = useCallback(async (preset) => {
    if (!hasDueDate && preset.offsetMs > 0) {
      setMsg('Set a due date on this task first');
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
    setMsg('Reminder set');
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
          setMsg('Enter at least 1 minute');
          return;
        }
      } else {
        // exact date/time reminder
        if (!exactDate) { setMsg('Pick a date'); return; }
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
      setMsg('Reminder set');
      setCustomDays(''); setCustomHours(''); setCustomMins('');
      setExactDate(''); setExactTime('');
    } catch (err) {
      setMsg(err.message || 'Could not save reminder');
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(''), 2500);
    }
  }, [customType, customDays, customHours, customMins, exactDate, exactTime,
      existingOffsets, onAdd, task, listId, listName, dueDate, hasDueDate]);

  const numInput = (value, setter, placeholder, label) => (
    <input
      type="number" min="0" value={value}
      onChange={(e) => setter(e.target.value)}
      placeholder={placeholder}
      aria-label={label}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = focus;
        focusRing(e.currentTarget, focus);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = bdr;
        clearFocus(e.currentTarget);
      }}
      style={{
        width: 56, padding: '7px 8px', borderRadius: 8, textAlign: 'center',
        border: `1px solid ${bdr}`, background: surf, color: txt,
        fontSize: 14, outline: 'none', ...P,
      }}
    />
  );

  const bannerBase = {
    borderRadius: 10,
    padding: '11px 13px',
    fontSize: 12.5,
    lineHeight: 1.45,
    ...P,
  };

  const msgIsOk = msg === 'Reminder set' || msg === 'Already added';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Push permission banner ── */}
      {permission === 'not_supported' && (
        <div role="status" style={{
          ...bannerBase,
          background: dark ? C.darkSurface : C.priorityMedBg,
          border: `1px solid ${bdr}`,
          color: C.priorityMed,
        }}>
          This browser does not support push notifications. In-app alerts still appear while Checkmate is open.
        </div>
      )}
      {permission === 'default' && (
        <div style={{
          ...bannerBase,
          background: dark ? C.darkSurface : C.pastelBlue,
          border: `1px solid ${bdr}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 12.5, color: dark ? C.darkText : C.inkSoft, lineHeight: 1.4, ...P }}>
            Allow browser notifications to get reminders when Checkmate is closed.
          </span>
          <button
            type="button"
            onClick={onEnablePush}
            onFocus={(e) => focusRing(e.currentTarget, focus)}
            onBlur={(e) => clearFocus(e.currentTarget)}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            style={{
              background: C.inkSoft, color: C.paper, border: 'none', borderRadius: 8,
              padding: '7px 12px', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, ...P, flexShrink: 0,
            }}
          >Enable</button>
        </div>
      )}
      {permission === 'denied' && (
        <div role="status" style={{
          ...bannerBase,
          background: dark ? C.darkSurface : C.priorityHighBg,
          border: `1px solid ${bdr}`,
          color: C.danger,
        }}>
          Notifications are blocked for this site. Allow them in browser settings to receive push reminders.
        </div>
      )}

      {/* ── No due date warning ── */}
      {!hasDueDate && (
        <div role="status" style={{
          ...bannerBase,
          background: dark ? C.darkSurface : C.priorityMedBg,
          border: `1px solid ${bdr}`,
          color: C.priorityMed,
        }}>
          Add a due date to unlock “before due” reminders. Exact-time reminders still work without one.
        </div>
      )}

      {/* ── Active reminders ── */}
      <div>
        <div style={{
          fontSize: 10, fontWeight: 600, color: muted,
          letterSpacing: '.08em', marginBottom: 8, ...P,
        }}>ACTIVE REMINDERS</div>
        {taskReminders.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {taskReminders.map((r) => (
              <ReminderChip key={r.id} reminder={r} onRemove={onRemove} dark={dark} />
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: muted, lineHeight: 1.4, ...P }}>
            No reminders yet. Pick a quick option or set a custom time below.
          </div>
        )}
      </div>

      {/* ── Mode toggle ── */}
      <div
        role="tablist"
        aria-label="Reminder type"
        style={{
          display: 'flex',
          background: dark ? C.darkSurface : C.surfaceMuted,
          border: `1px solid ${bdr}`,
          borderRadius: 10, padding: 3, gap: 2,
        }}
      >
        {[['preset', 'Quick'], ['custom', 'Custom']].map(([m, label]) => {
          const selected = mode === m;
          const hovered = hoveredSeg === m;
          return (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setMode(m)}
              onMouseEnter={() => setHoveredSeg(m)}
              onMouseLeave={() => setHoveredSeg(null)}
              onFocus={(e) => focusRing(e.currentTarget, focus)}
              onBlur={(e) => clearFocus(e.currentTarget)}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: selected
                  ? (dark ? '#2a2a2a' : C.surface)
                  : hovered
                    ? (dark ? C.darkBorder : C.border)
                    : 'transparent',
                color: selected ? txt : muted,
                fontWeight: selected ? 600 : 400, fontSize: 13, ...P,
                boxShadow: selected ? (dark ? '0 1px 2px rgba(0,0,0,.35)' : '0 1px 3px rgba(0,0,0,.08)') : 'none',
                transition: 'background .12s ease-out, color .12s ease-out',
              }}
            >{label}</button>
          );
        })}
      </div>

      {/* ── Preset pills ── */}
      {mode === 'preset' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {REMINDER_PRESETS.map((preset) => {
            const added = existingOffsets.has(preset.offsetMs);
            const disabled = (!hasDueDate && preset.offsetMs > 0) || busy;
            const hovered = hoveredPreset === preset.offsetMs && !added && !disabled;
            return (
              <button
                key={preset.offsetMs}
                type="button"
                onClick={() => !added && !disabled && addPreset(preset)}
                disabled={disabled}
                aria-pressed={added}
                onMouseEnter={() => setHoveredPreset(preset.offsetMs)}
                onMouseLeave={() => setHoveredPreset(null)}
                onFocus={(e) => focusRing(e.currentTarget, focus)}
                onBlur={(e) => clearFocus(e.currentTarget)}
                style={{
                  padding: '7px 13px', borderRadius: 99, fontSize: 12.5,
                  cursor: disabled ? 'not-allowed' : added ? 'default' : 'pointer',
                  border: `1px solid ${
                    added
                      ? C.priorityLow
                      : disabled
                        ? bdr
                        : hovered
                          ? txt
                          : bdr
                  }`,
                  background: added
                    ? (dark ? C.darkSurface : C.priorityLowBg)
                    : hovered
                      ? (dark ? C.darkBorder : C.surfaceMuted)
                      : 'transparent',
                  color: added
                    ? C.priorityLow
                    : disabled
                      ? muted
                      : txt,
                  fontWeight: added ? 600 : 400, ...P,
                  transition: 'background .12s ease-out, border-color .12s ease-out',
                  opacity: disabled && !added ? 0.55 : 1,
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
          <div role="group" aria-label="Custom reminder timing" style={{ display: 'flex', gap: 8 }}>
            {[['before', 'Before due'], ['exact', 'Exact time']].map(([v, label]) => {
              const selected = customType === v;
              const hovered = hoveredSub === v && !selected;
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setCustomType(v)}
                  onMouseEnter={() => setHoveredSub(v)}
                  onMouseLeave={() => setHoveredSub(null)}
                  onFocus={(e) => focusRing(e.currentTarget, focus)}
                  onBlur={(e) => clearFocus(e.currentTarget)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: 12.5,
                    border: `1px solid ${selected ? txt : hovered ? muted : bdr}`,
                    background: selected
                      ? (dark ? '#2a2a2a' : C.surfaceMuted)
                      : hovered
                        ? (dark ? C.darkBorder : C.border)
                        : 'transparent',
                    color: selected ? txt : muted,
                    fontWeight: selected ? 600 : 400, ...P,
                    transition: 'background .12s ease-out, border-color .12s ease-out',
                  }}
                >{label}</button>
              );
            })}
          </div>

          {customType === 'before' ? (
            <div>
              <div style={{ fontSize: 12, color: muted, marginBottom: 8, lineHeight: 1.4, ...P }}>
                How long before the due date?
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {numInput(customDays, setCustomDays, '0', 'Days before due')}
                  <span style={{ fontSize: 12, color: muted, ...P }}>days</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {numInput(customHours, setCustomHours, '0', 'Hours before due')}
                  <span style={{ fontSize: 12, color: muted, ...P }}>hrs</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {numInput(customMins, setCustomMins, '0', 'Minutes before due')}
                  <span style={{ fontSize: 12, color: muted, ...P }}>min</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 12, color: muted, marginBottom: 8, lineHeight: 1.4, ...P }}>
                Remind me at this date and time
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  type="date"
                  value={exactDate}
                  onChange={(e) => setExactDate(e.target.value)}
                  aria-label="Reminder date"
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = focus;
                    focusRing(e.currentTarget, focus);
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = bdr;
                    clearFocus(e.currentTarget);
                  }}
                  style={{
                    flex: 1, minWidth: 120, padding: '8px 10px', borderRadius: 8,
                    border: `1px solid ${bdr}`, background: surf, color: txt,
                    outline: 'none', fontSize: 13, ...P,
                  }}
                />
                <input
                  type="time"
                  value={exactTime}
                  onChange={(e) => setExactTime(e.target.value)}
                  aria-label="Reminder time"
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = focus;
                    focusRing(e.currentTarget, focus);
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = bdr;
                    clearFocus(e.currentTarget);
                  }}
                  style={{
                    width: 105, padding: '8px 10px', borderRadius: 8,
                    border: `1px solid ${bdr}`, background: surf, color: txt,
                    outline: 'none', fontSize: 13, ...P,
                  }}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={addCustom}
            disabled={busy}
            onFocus={(e) => focusRing(e.currentTarget, focus)}
            onBlur={(e) => clearFocus(e.currentTarget)}
            onMouseEnter={(e) => { if (!busy) e.currentTarget.style.opacity = '0.88'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            style={{
              background: C.inkSoft, color: C.paper, border: 'none', borderRadius: 9,
              padding: '10px', cursor: busy ? 'wait' : 'pointer',
              fontSize: 13.5, fontWeight: 600, ...P,
              opacity: busy ? 0.7 : 1,
              transition: 'opacity .12s ease-out',
            }}
          >
            {busy ? 'Saving…' : 'Add reminder'}
          </button>
        </div>
      )}

      {/* ── Status message ── */}
      {msg && (
        <div
          role="status"
          aria-live="polite"
          style={{
            fontSize: 12.5,
            color: msgIsOk && msg === 'Reminder set'
              ? C.priorityLow
              : msg === 'Already added'
                ? muted
                : C.priorityMed,
            ...P,
            animation: 'fadeUp .2s ease-out',
            lineHeight: 1.4,
          }}
        >{msg === 'Reminder set' ? '✓ Reminder set' : msg}</div>
      )}
    </div>
  );
}
