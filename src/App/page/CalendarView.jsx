import { useState, useMemo } from "react";

// ── helpers ──────────────────────────────────────────────────────────────────
const P_COLOR = { HIGH: '#e05555', MED: '#c47a0a', LOW: '#2f8a55' };
const P_BG    = { HIGH: '#FFECEC', MED: '#FFF6E0', LOW: '#E4F7EC' };
const P_BG_DARK = { HIGH: '#3a1818', MED: '#3a2e14', LOW: '#1a3324' };

const isoDate = (ds) => (ds ? ds.split('T')[0] : null);

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfWeek = (year, month) => new Date(year, month, 1).getDay(); // 0=Sun

const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// Soften pastel list colors as chip fills in dark mode
const adjustColorForDark = (hex) => {
  if (!hex) return null;
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c) => Math.round(c * 0.28 + 30);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
};

// ── TaskPill ─────────────────────────────────────────────────────────────────
const TaskPill = ({ task, listName, listColor, dark, onClick }) => {
  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
  const priority = task.priority || 'LOW';
  const bg = task.completed
    ? (dark ? '#2a2a2a' : '#f0f0f0')
    : overdue ? (dark ? '#3a1010' : '#fff0f0')
    : (listColor || (dark ? '#1e2a1e' : '#eef8f1'));
  const col = task.completed
    ? (dark ? '#888888' : '#aaaaaa')
    : overdue ? (dark ? '#e05555' : '#c0392b')
    : (dark ? '#efefef' : '#0a0a0a');

  return (
    <div
      onClick={onClick}
      title={`${task.text} — ${listName}`}
      style={{
        background: bg,
        color: col,
        borderRadius: 6,
        padding: '3px 6px 3px 7px',
        fontSize: 11,
        fontFamily: "'DM Sans',sans-serif",
        fontWeight: 500,
        cursor: 'pointer',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        textDecoration: task.completed ? 'line-through' : 'none',
        marginBottom: 3,
        transition: 'opacity .12s, filter .12s',
        opacity: task.completed ? 0.65 : 1,
        // Priority as thin top accent — avoids AI side-tab borderLeft
        boxShadow: task.completed
          ? 'none'
          : `inset 0 2px 0 ${P_COLOR[priority] || '#aaaaaa'}`,
      }}
      onMouseEnter={(e) => { if (!task.completed) e.currentTarget.style.opacity = '0.88'; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = task.completed ? '0.65' : '1'; }}
    >
      {task.emoji && <span style={{ marginRight: 3 }}>{task.emoji}</span>}
      {task.text}
    </div>
  );
};

// ── DayCell ───────────────────────────────────────────────────────────────────
const DayCell = ({ day, year, month, tasks, dark, today, selected, onSelect, onTaskClick }) => {
  const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  const isSelected = selected === `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const bdr = dark ? '#2c2c2c' : '#e8e8e8';
  const surface = dark ? '#1e1e1e' : '#ffffff';
  const selectedBg = dark ? '#2c2c2c' : '#f8f8f8';
  const MAX_VISIBLE = 3;
  const extra = tasks.length - MAX_VISIBLE;
  const hasTasks = tasks.length > 0;

  return (
    <div
      onClick={() => onSelect(`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`)}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.background = dark ? '#2c2c2c' : '#fafafa';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isSelected ? selectedBg : surface;
      }}
      style={{
        border: `1px solid ${isSelected ? (dark ? '#888888' : '#0a0a0a') : bdr}`,
        borderRadius: 10,
        padding: '8px 8px 6px',
        minHeight: 96,
        background: isSelected ? selectedBg : surface,
        cursor: 'pointer',
        transition: 'border-color .12s, background .12s',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: isSelected
          ? (dark ? '0 0 0 1px #888888' : '0 0 0 1px #0a0a0a')
          : 'none',
      }}
    >
      {/* Day number */}
      <div style={{
        width: 26,
        height: 26,
        borderRadius: '50%',
        background: isToday
          ? (dark ? '#efefef' : '#0a0a0a')
          : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: isToday || isSelected ? 700 : 400,
        color: isToday
          ? (dark ? '#0a0a0a' : '#fafafa')
          : (dark ? '#efefef' : '#0a0a0a'),
        fontFamily: "'DM Sans',sans-serif",
        marginBottom: 5,
        flexShrink: 0,
        alignSelf: 'flex-start',
      }}>
        {day}
      </div>

      {/* Task pills / empty hint */}
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {hasTasks ? (
          <>
            {tasks.slice(0, MAX_VISIBLE).map(t => (
              <TaskPill
                key={t.task.id}
                task={t.task}
                listName={t.listName}
                listColor={dark ? adjustColorForDark(t.listColor) : t.listColor}
                dark={dark}
                onClick={(e) => { e.stopPropagation(); onTaskClick(t.task, t.listId); }}
              />
            ))}
            {extra > 0 && (
              <div style={{
                fontSize: 10.5,
                color: dark ? '#aaaaaa' : '#888888',
                fontFamily: "'DM Sans',sans-serif",
                paddingLeft: 2,
                fontWeight: 500,
                marginTop: 1,
              }}>
                +{extra} more
              </div>
            )}
          </>
        ) : (
          <div style={{
            flex: 1,
            minHeight: 28,
          }} aria-hidden />
        )}
      </div>
    </div>
  );
};

// ── WeekRow ───────────────────────────────────────────────────────────────────
const WeekRow = ({ weekStart, tasksByDate, dark, today, selected, onSelect, onTaskClick }) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
      {days.map(d => {
        const key = d.toISOString().split('T')[0];
        const tasks = tasksByDate[key] || [];
        return (
          <DayCell
            key={key}
            day={d.getDate()}
            year={d.getFullYear()}
            month={d.getMonth()}
            tasks={tasks}
            dark={dark}
            today={today}
            selected={selected}
            onSelect={onSelect}
            onTaskClick={onTaskClick}
          />
        );
      })}
    </div>
  );
};

// ── SidePanel (tasks for selected day) ───────────────────────────────────────
const SidePanel = ({ date, tasks, dark, onClose, onToggle, currentUser }) => {
  const txt = dark ? '#efefef' : '#0a0a0a';
  const muted = dark ? '#aaaaaa' : '#888888';
  const bdr = dark ? '#2c2c2c' : '#e8e8e8';
  const surface = dark ? '#1e1e1e' : '#ffffff';

  if (!date) return null;

  const d = new Date(date + 'T00:00:00');
  const label = d.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' });
  const isToday = date === new Date().toISOString().split('T')[0];

  return (
    <div style={{
      width: 288,
      flexShrink: 0,
      background: surface,
      borderLeft: `1px solid ${bdr}`,
      display: 'flex',
      flexDirection: 'column',
      animation: 'fadeUp .15s ease-out',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 18px 14px', borderBottom: `1px solid ${bdr}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <div style={{
              fontFamily: "'Lora',serif",
              fontSize: 17,
              fontWeight: 600,
              color: txt,
              fontStyle: 'italic',
              lineHeight: 1.25,
            }}>{label}</div>
            {isToday && (
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '.08em',
                background: dark ? '#efefef' : '#0a0a0a',
                color: dark ? '#0a0a0a' : '#fafafa',
                borderRadius: 99,
                padding: '2px 8px',
                fontFamily: "'DM Sans',sans-serif",
                display: 'inline-block',
                marginTop: 6,
              }}>TODAY</span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close day panel"
            style={{
              background: dark ? '#1e1e1e' : '#f8f8f8',
              border: `1px solid ${bdr}`,
              cursor: 'pointer',
              color: muted,
              fontSize: 16,
              padding: '4px 8px',
              borderRadius: 8,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >×</button>
        </div>
      </div>

      {/* Tasks list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 18px' }}>
        {tasks.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 12px 24px',
            color: muted,
          }}>
            <p style={{
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 13,
              margin: 0,
              lineHeight: 1.45,
              color: muted,
            }}>
              No tasks due this day
            </p>
            <p style={{
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 12,
              margin: '6px 0 0',
              color: dark ? '#888888' : '#aaaaaa',
              lineHeight: 1.4,
            }}>
              Select another day or add a due date to a task
            </p>
          </div>
        ) : (
          tasks.map(({ task, listName, listColor, listId }) => {
            const overdue = new Date(task.dueDate) < new Date() && !task.completed;
            const priority = task.priority || 'LOW';
            const cardTint = task.completed
              ? (dark ? '#1a1a1a' : '#f8f8f8')
              : dark
                ? P_BG_DARK[priority]
                : P_BG[priority];
            return (
              <div key={task.id} style={{
                background: cardTint,
                border: `1px solid ${bdr}`,
                borderRadius: 10,
                padding: '11px 12px 12px',
                marginBottom: 8,
                // Thin top priority accent instead of side-tab border
                boxShadow: `inset 0 2px 0 ${P_COLOR[priority]}`,
              }}>
                {/* List name */}
                <div style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '.08em',
                  color: muted,
                  fontFamily: "'DM Sans',sans-serif",
                  marginBottom: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <div style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: listColor,
                    flexShrink: 0,
                  }} />
                  {listName.toUpperCase()}
                </div>
                {/* Task row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <button
                    onClick={() => onToggle(listId, task.id)}
                    aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      flexShrink: 0,
                      border: `1.5px solid ${task.completed ? (dark ? '#efefef' : '#0a0a0a') : (dark ? '#888888' : '#aaaaaa')}`,
                      background: task.completed ? (dark ? '#efefef' : '#0a0a0a') : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      marginTop: 1,
                    }}
                  >
                    {task.completed && (
                      <span style={{
                        fontSize: 9,
                        color: dark ? '#0a0a0a' : '#ffffff',
                        fontWeight: 800,
                      }}>✓</span>
                    )}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "'DM Sans',sans-serif",
                      fontSize: 13.5,
                      fontWeight: 500,
                      color: task.completed ? muted : txt,
                      textDecoration: task.completed ? 'line-through' : 'none',
                      lineHeight: 1.35,
                    }}>
                      {task.emoji && <span style={{ marginRight: 4 }}>{task.emoji}</span>}
                      {task.text}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 99,
                        color: P_COLOR[priority],
                        background: dark ? '#111111' : '#ffffff',
                      }}>{priority}</span>
                      {overdue && !task.completed && (
                        <span style={{
                          fontSize: 10.5,
                          padding: '2px 8px',
                          borderRadius: 99,
                          color: dark ? '#e05555' : '#c0392b',
                          background: dark ? '#111111' : '#FFECEC',
                          fontWeight: 600,
                        }}>Overdue</span>
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
};

// ── MAIN CalendarView ─────────────────────────────────────────────────────────
export default function CalendarView({ lists, dark, currentUser, onToggleTask }) {
  const today = useMemo(() => new Date(), []);
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week'
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [weekOffset, setWeekOffset] = useState(0); // weeks from current week
  const [selectedDate, setSelectedDate] = useState(null);
  const [filterListId, setFilterListId] = useState('all');

  const txt = dark ? '#efefef' : '#0a0a0a';
  const muted = dark ? '#aaaaaa' : '#888888';
  const bdr = dark ? '#2c2c2c' : '#e8e8e8';
  const chrome = dark ? '#1e1e1e' : '#f8f8f8';

  // ── Build tasksByDate ────────────────────────────────────────────────────────
  const filteredLists = useMemo(() =>
    filterListId === 'all' ? lists : lists.filter(l => l.id === filterListId),
  [lists, filterListId]);

  const tasksByDate = useMemo(() => {
    const map = {};
    filteredLists.forEach(list => {
      (list.tasks || []).forEach(task => {
        if (!task.dueDate) return;
        const key = isoDate(task.dueDate);
        if (!map[key]) map[key] = [];
        map[key].push({
          task,
          listId: list.id,
          listName: list.name,
          listColor: list.color,
        });
      });
    });
    return map;
  }, [filteredLists]);

  // ── Navigation ───────────────────────────────────────────────────────────────
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // Week start: Monday of (current week + weekOffset)
  const weekStart = useMemo(() => {
    const d = new Date(today);
    const dayOfWeek = d.getDay(); // 0=Sun
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    d.setDate(d.getDate() + diffToMon + weekOffset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [today, weekOffset]);

  // ── Month grid ───────────────────────────────────────────────────────────────
  const monthGrid = useMemo(() => {
    const days = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfWeek(year, month);
    const cells = [];
    // leading blanks
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(d);
    return cells;
  }, [year, month]);

  // ── Selected day tasks ────────────────────────────────────────────────────────
  const selectedTasks = selectedDate ? (tasksByDate[selectedDate] || []) : [];

  // ── Week range label ─────────────────────────────────────────────────────────
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart); d.setDate(d.getDate() + 6); return d;
  }, [weekStart]);
  const weekLabel = useMemo(() => {
    const fmt = (d) => d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
    return `${fmt(weekStart)} – ${fmt(weekEnd)}, ${weekEnd.getFullYear()}`;
  }, [weekStart, weekEnd]);

  const handleTaskClick = (task, listId) => {
    // just show the side panel with that date
    if (task.dueDate) setSelectedDate(isoDate(task.dueDate));
  };

  const handleToggle = (listId, taskId) => {
    onToggleTask && onToggleTask(listId, taskId);
  };

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      overflow: 'hidden',
      fontFamily: "'DM Sans',sans-serif",
    }}>

      {/* ── Calendar area ── */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 'clamp(20px,2vw,36px) clamp(24px,2.5vw,44px)',
      }}>

        {/* ── Header row ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}>
          <h2 style={{
            fontFamily: "'Lora',serif",
            fontSize: 'clamp(22px,1.8vw,28px)',
            color: txt,
            margin: 0,
            fontWeight: 600,
            fontStyle: 'italic',
            flexShrink: 0,
          }}>Calendar</h2>

          {/* View toggle */}
          <div style={{
            display: 'flex',
            background: dark ? '#2c2c2c' : '#f0f0f0',
            borderRadius: 8,
            padding: 3,
            gap: 2,
          }}>
            {['month', 'week'].map(v => (
              <button key={v} onClick={() => setViewMode(v)} style={{
                padding: '5px 14px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'DM Sans',sans-serif",
                fontSize: 12.5,
                fontWeight: 600,
                background: viewMode === v ? (dark ? '#1e1e1e' : '#ffffff') : 'transparent',
                color: viewMode === v ? txt : muted,
                boxShadow: viewMode === v ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                transition: 'background .15s, color .15s, box-shadow .15s',
              }}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          {/* List filter */}
          <select
            value={filterListId}
            onChange={e => setFilterListId(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: `1px solid ${bdr}`,
              background: dark ? '#1e1e1e' : '#ffffff',
              color: txt,
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 12.5,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Lists</option>
            {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>

          {/* Nav arrows */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
            <button
              onClick={() => viewMode === 'month' ? prevMonth() : setWeekOffset(w => w - 1)}
              aria-label="Previous"
              style={{
                background: chrome,
                border: `1px solid ${bdr}`,
                borderRadius: 8,
                width: 32,
                height: 32,
                cursor: 'pointer',
                color: txt,
                fontSize: 15,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >‹</button>
            <span style={{
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 14,
              fontWeight: 600,
              color: txt,
              minWidth: 168,
              textAlign: 'center',
            }}>
              {viewMode === 'month' ? `${MONTH_NAMES[month]} ${year}` : weekLabel}
            </span>
            <button
              onClick={() => viewMode === 'month' ? nextMonth() : setWeekOffset(w => w + 1)}
              aria-label="Next"
              style={{
                background: chrome,
                border: `1px solid ${bdr}`,
                borderRadius: 8,
                width: 32,
                height: 32,
                cursor: 'pointer',
                color: txt,
                fontSize: 15,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >›</button>
            <button
              onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setWeekOffset(0); }}
              style={{
                background: 'none',
                border: `1px solid ${bdr}`,
                borderRadius: 8,
                padding: '5px 12px',
                cursor: 'pointer',
                fontSize: 12,
                color: muted,
                fontFamily: "'DM Sans',sans-serif",
                marginLeft: 4,
                fontWeight: 500,
              }}
            >Today</button>
          </div>
        </div>

        {/* ── Day labels ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7,1fr)',
          gap: 8,
          marginBottom: 8,
        }}>
          {DAY_LABELS.map(d => (
            <div key={d} style={{
              textAlign: 'center',
              fontSize: 10,
              fontWeight: 600,
              color: muted,
              letterSpacing: '.08em',
              padding: '4px 0',
              fontFamily: "'DM Sans',sans-serif",
              textTransform: 'uppercase',
            }}>{d}</div>
          ))}
        </div>

        {/* ── Month grid ── */}
        {viewMode === 'month' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
            {monthGrid.map((day, i) => {
              if (!day) return <div key={`blank-${i}`} />;
              const key = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              return (
                <DayCell
                  key={key}
                  day={day}
                  year={year}
                  month={month}
                  tasks={tasksByDate[key] || []}
                  dark={dark}
                  today={today}
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  onTaskClick={handleTaskClick}
                />
              );
            })}
          </div>
        )}

        {/* ── Week view ── */}
        {viewMode === 'week' && (
          <WeekRow
            weekStart={weekStart}
            tasksByDate={tasksByDate}
            dark={dark}
            today={today}
            selected={selectedDate}
            onSelect={setSelectedDate}
            onTaskClick={handleTaskClick}
          />
        )}
      </div>

      {/* ── Side panel ── */}
      {selectedDate && (
        <SidePanel
          date={selectedDate}
          tasks={selectedTasks}
          dark={dark}
          currentUser={currentUser}
          onClose={() => setSelectedDate(null)}
          onToggle={handleToggle}
        />
      )}
    </div>
  );
}
