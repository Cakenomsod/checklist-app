import { useState, useMemo } from "react";

const P_COLOR = { HIGH: '#e05555', MED: '#c47a0a', LOW: '#2f8a55' };
const P_BG    = { HIGH: '#FFECEC', MED: '#FFF6E0', LOW: '#E4F7EC' };

const isoDate = (ds) => (ds ? ds.split('T')[0] : null);
const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const DAY_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfWeek = (year, month) => new Date(year, month, 1).getDay();

// ── MobileCalendar ────────────────────────────────────────────────────────────
export default function MobileCalendar({ lists, dark, currentUser, onToggleTask }) {
  const today = useMemo(() => new Date(), []);
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]);

  const txt     = dark ? '#efefef' : '#111111';
  const muted   = dark ? '#888888' : '#888888';
  const mutedSoft = dark ? '#aaaaaa' : '#aaaaaa';
  const bdr     = dark ? '#2c2c2c' : '#e8e8e8';
  const surface = dark ? '#1e1e1e' : '#ffffff';
  const surfaceMuted = dark ? '#252525' : '#f8f8f8';
  const bg      = dark ? '#111111' : '#fafafa';
  const ink     = '#111111';

  // ── tasksByDate ──────────────────────────────────────────────────────────────
  const tasksByDate = useMemo(() => {
    const map = {};
    lists.forEach(list => {
      (list.tasks || []).forEach(task => {
        if (!task.dueDate) return;
        const key = isoDate(task.dueDate);
        if (!map[key]) map[key] = [];
        map[key].push({ task, listId: list.id, listName: list.name, listColor: list.color });
      });
    });
    return map;
  }, [lists]);

  // ── month grid ───────────────────────────────────────────────────────────────
  const monthGrid = useMemo(() => {
    const days = getDaysInMonth(year, month);
    const first = getFirstDayOfWeek(year, month);
    const cells = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  // ── nav ──────────────────────────────────────────────────────────────────────
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const selectedTasks = tasksByDate[selectedDate] || [];

  const selDateLabel = useMemo(() => {
    if (!selectedDate) return '';
    const d = new Date(selectedDate + 'T00:00:00');
    return d.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' });
  }, [selectedDate]);

  const todayStr = today.toISOString().split('T')[0];

  const navBtn = {
    background: surfaceMuted,
    border: `1px solid ${bdr}`,
    borderRadius: 10,
    width: 44,
    height: 44,
    cursor: 'pointer',
    fontSize: 20,
    color: txt,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'DM Sans',sans-serif",
    WebkitTapHighlightColor: 'transparent',
    transition: 'background .12s ease-out, border-color .12s ease-out',
  };

  return (
    <div style={{ padding: '0 0 120px', background: bg, minHeight: '100%' }}>

      {/* ── Month nav ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 16px 12px',
      }}>
        <button type="button" aria-label="Previous month" onClick={prevMonth} style={navBtn}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: "'Lora',serif", fontSize: 20, fontWeight: 600,
            color: txt, fontStyle: 'italic', lineHeight: 1.2,
          }}>{MONTH_NAMES[month]}</div>
          <div style={{
            fontSize: 12, color: muted, marginTop: 2,
            fontFamily: "'DM Sans',sans-serif", letterSpacing: '.02em',
          }}>{year}</div>
        </div>
        <button type="button" aria-label="Next month" onClick={nextMonth} style={navBtn}>›</button>
      </div>

      {/* ── Calendar grid ── */}
      <div style={{ padding: '0 12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 6 }}>
          {DAY_LABELS.map(d => (
            <div key={d} style={{
              textAlign: 'center', fontSize: 10, fontWeight: 600,
              color: muted, letterSpacing: '.08em', padding: '6px 0',
              fontFamily: "'DM Sans',sans-serif", textTransform: 'uppercase',
            }}>{d}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {monthGrid.map((day, i) => {
            if (!day) return <div key={`b-${i}`} />;
            const key = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const dayTasks = tasksByDate[key] || [];
            const isToday = key === todayStr;
            const isSelected = key === selectedDate;
            const hasOverdue = dayTasks.some(t => !t.task.completed && new Date(t.task.dueDate) < today);
            const hasTask = dayTasks.length > 0;

            return (
              <button
                type="button"
                key={key}
                aria-label={`${MONTH_NAMES[month]} ${day}${isToday ? ', today' : ''}${hasTask ? `, ${dayTasks.length} tasks` : ''}`}
                aria-pressed={isSelected}
                onClick={() => setSelectedDate(key)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 44, padding: '8px 2px 10px', borderRadius: 10,
                  cursor: 'pointer',
                  border: isSelected
                    ? `1.5px solid ${ink}`
                    : isToday
                      ? `1.5px solid ${dark ? '#555555' : '#111111'}`
                      : '1.5px solid transparent',
                  background: isSelected
                    ? ink
                    : isToday
                      ? surfaceMuted
                      : 'transparent',
                  boxShadow: isSelected
                    ? (dark ? '0 1px 0 rgba(255,255,255,.06)' : '0 1px 3px rgba(0,0,0,.08)')
                    : 'none',
                  transition: 'background .12s ease-out, border-color .12s ease-out, box-shadow .12s ease-out',
                  WebkitTapHighlightColor: 'transparent',
                  font: 'inherit',
                }}
              >
                <span style={{
                  fontFamily: "'DM Sans',sans-serif",
                  fontSize: 14, fontWeight: isToday || isSelected ? 700 : 500,
                  color: isSelected ? '#fafafa' : txt,
                  lineHeight: 1,
                }}>{day}</span>

                <div style={{ display: 'flex', gap: 3, marginTop: 5, height: 5, alignItems: 'center' }}>
                  {hasTask && (
                    <>
                      <div style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: isSelected
                          ? 'rgba(255,255,255,.65)'
                          : hasOverdue ? '#e05555' : P_COLOR.MED,
                      }} />
                      {dayTasks.length > 1 && (
                        <div style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: isSelected ? 'rgba(255,255,255,.35)' : mutedSoft,
                        }} />
                      )}
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Date strip ── */}
      <div style={{
        margin: '16px 14px 0', padding: '12px 14px',
        background: surface, borderRadius: 12,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 10, border: `1px solid ${bdr}`,
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontFamily: "'Lora',serif", fontSize: 15, color: txt,
            fontWeight: 600, fontStyle: 'italic', lineHeight: 1.25,
          }}>{selDateLabel}</div>
          {selectedDate === todayStr && (
            <span style={{
              display: 'inline-block', marginTop: 6,
              fontSize: 10, fontWeight: 600, letterSpacing: '.08em',
              background: ink, color: '#fafafa', borderRadius: 99, padding: '3px 8px',
              fontFamily: "'DM Sans',sans-serif",
            }}>TODAY</span>
          )}
        </div>
        {selectedTasks.length > 0 && (
          <span style={{
            flexShrink: 0, fontSize: 12, color: muted,
            fontFamily: "'DM Sans',sans-serif", fontWeight: 500,
          }}>{selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* ── Task list for selected day ── */}
      <div style={{ padding: '12px 14px' }}>
        {selectedTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 12px', color: muted }}>
            <div style={{ fontSize: 28, marginBottom: 10, lineHeight: 1 }} aria-hidden>🌿</div>
            <p style={{
              fontFamily: "'DM Sans',sans-serif", fontSize: 14, margin: 0,
              color: muted, lineHeight: 1.4,
            }}>No tasks due this day</p>
          </div>
        ) : (
          selectedTasks.map(({ task, listId, listName, listColor }) => {
            const overdue = new Date(task.dueDate) < today && !task.completed;
            const prio = task.priority || 'MED';
            const cardBg = task.completed
              ? surface
              : (dark ? surface : P_BG[prio]);

            return (
              <div key={task.id} style={{
                background: cardBg,
                border: `1px solid ${bdr}`,
                borderTop: `2px solid ${P_COLOR[prio]}`,
                borderRadius: 12,
                padding: '14px',
                marginBottom: 10,
              }}>
                {/* List badge */}
                <div style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '.08em',
                  color: muted, fontFamily: "'DM Sans',sans-serif",
                  marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
                  textTransform: 'uppercase',
                }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: listColor || P_COLOR.MED, flexShrink: 0,
                  }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {listName}
                  </span>
                </div>

                {/* Task row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <button
                    type="button"
                    aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                    onClick={() => onToggleTask && onToggleTask(listId, task.id)}
                    style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      border: `2px solid ${task.completed
                        ? (dark ? '#efefef' : '#111111')
                        : (dark ? '#555555' : '#aaaaaa')}`,
                      background: task.completed
                        ? (dark ? '#efefef' : '#111111')
                        : 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', padding: 0, marginTop: 0,
                      WebkitTapHighlightColor: 'transparent',
                      transition: 'background .12s ease-out, border-color .12s ease-out',
                    }}
                  >
                    {task.completed && (
                      <span style={{
                        fontSize: 12, color: dark ? '#111111' : '#fafafa', fontWeight: 800,
                        lineHeight: 1,
                      }}>✓</span>
                    )}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "'DM Sans',sans-serif", fontSize: 15, fontWeight: 500,
                      color: task.completed ? muted : txt,
                      textDecoration: task.completed ? 'line-through' : 'none',
                      lineHeight: 1.35,
                    }}>
                      {task.emoji && <span style={{ marginRight: 5 }}>{task.emoji}</span>}
                      {task.text}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99,
                        color: P_COLOR[prio],
                        background: P_BG[prio],
                        fontFamily: "'DM Sans',sans-serif",
                      }}>{prio}</span>
                      {overdue && !task.completed && (
                        <span style={{
                          fontSize: 11, padding: '3px 9px', borderRadius: 99,
                          color: '#c0392b',
                          background: '#FFECEC',
                          fontWeight: 600,
                          fontFamily: "'DM Sans',sans-serif",
                        }}>Overdue</span>
                      )}
                      {task.completed && (
                        <span style={{
                          fontSize: 11, padding: '3px 9px', borderRadius: 99,
                          color: '#2f8a55',
                          background: '#E4F7EC',
                          fontWeight: 600,
                          fontFamily: "'DM Sans',sans-serif",
                        }}>Done ✓</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
