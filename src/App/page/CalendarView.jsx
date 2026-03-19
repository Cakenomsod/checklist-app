import { useState, useMemo } from "react";

// ── helpers ──────────────────────────────────────────────────────────────────
const P_COLOR = { HIGH: '#e05555', MED: '#c47a0a', LOW: '#2f8a55' };
const P_BG    = { HIGH: '#FFECEC', MED: '#FFF6E0', LOW: '#E4F7EC' };

const isoDate = (ds) => (ds ? ds.split('T')[0] : null);

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfWeek = (year, month) => new Date(year, month, 1).getDay(); // 0=Sun

const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── TaskPill ─────────────────────────────────────────────────────────────────
const TaskPill = ({ task, listName, listColor, dark, onClick }) => {
  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
  const bg = task.completed
    ? (dark ? '#2a2a2a' : '#f0f0f0')
    : overdue ? (dark ? '#3a1010' : '#fff0f0')
    : (listColor || (dark ? '#1e2a1e' : '#eef8f1'));
  const col = task.completed
    ? (dark ? '#555' : '#bbb')
    : overdue ? '#d44'
    : (dark ? '#efefef' : '#111');

  return (
    <div
      onClick={onClick}
      title={`${task.text} — ${listName}`}
      style={{
        background: bg, color: col, borderRadius: 5,
        padding: '2px 6px', fontSize: 11, fontFamily: "'DM Sans',sans-serif",
        fontWeight: 500, cursor: 'pointer', overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textDecoration: task.completed ? 'line-through' : 'none',
        marginBottom: 2, transition: 'opacity .12s',
        opacity: task.completed ? .65 : 1,
        borderLeft: `3px solid ${P_COLOR[task.priority] || '#ccc'}`,
      }}
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
  const bdr = dark ? '#2c2c2c' : '#ececec';
  const surface = dark ? '#1c1c1c' : '#fff';
  const muted = dark ? '#444' : '#e8e8e8';
  const MAX_VISIBLE = 3;
  const extra = tasks.length - MAX_VISIBLE;

  return (
    <div
      onClick={() => onSelect(`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`)}
      style={{
        border: `1px solid ${isSelected ? (dark?'#555':'#333') : bdr}`,
        borderRadius: 9,
        padding: '7px 8px',
        minHeight: 90,
        background: isSelected ? (dark?'#222':'#fafafa') : surface,
        cursor: 'pointer',
        transition: 'border-color .12s, background .12s',
        display: 'flex', flexDirection: 'column',
        boxShadow: isSelected ? `0 0 0 1.5px ${dark?'#555':'#333'}` : 'none',
      }}
    >
      {/* Day number */}
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        background: isToday ? '#111' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: isToday ? 700 : 400,
        color: isToday ? '#fff' : (dark ? '#efefef' : '#111'),
        fontFamily: "'DM Sans',sans-serif",
        marginBottom: 4, flexShrink: 0,
      }}>
        {day}
      </div>

      {/* Task pills */}
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
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
            fontSize: 10.5, color: dark?'#555':'#aaa',
            fontFamily: "'DM Sans',sans-serif", paddingLeft: 2,
          }}>
            +{extra} more
          </div>
        )}
      </div>
    </div>
  );
};

// Make pastel colors slightly more visible in dark mode
const adjustColorForDark = (hex) => hex; // pastel colors work fine as bg in dark too

// ── WeekRow ───────────────────────────────────────────────────────────────────
const WeekRow = ({ weekStart, tasksByDate, dark, today, selected, onSelect, onTaskClick }) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const bdr = dark ? '#2c2c2c' : '#ececec';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
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
  const txt = dark ? '#efefef' : '#111';
  const muted = dark ? '#555' : '#bbb';
  const bdr = dark ? '#2c2c2c' : '#ececec';
  const surface = dark ? '#1c1c1c' : '#fff';

  if (!date) return null;

  const d = new Date(date + 'T00:00:00');
  const label = d.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' });
  const isToday = date === new Date().toISOString().split('T')[0];

  return (
    <div style={{
      width: 280, flexShrink: 0,
      background: surface,
      borderLeft: `1px solid ${bdr}`,
      display: 'flex', flexDirection: 'column',
      animation: 'fadeUp .15s ease-out',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '18px 18px 12px', borderBottom: `1px solid ${bdr}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{
              fontFamily: "'Lora',serif", fontSize: 17, fontWeight: 600,
              color: txt, fontStyle: 'italic',
            }}>{label}</div>
            {isToday && (
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '.08em',
                background: '#111', color: '#fff', borderRadius: 99,
                padding: '2px 8px', fontFamily: "'DM Sans',sans-serif",
                display: 'inline-block', marginTop: 4,
              }}>TODAY</span>
            )}
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: muted, fontSize: 18, padding: '2px 4px', borderRadius: 5, lineHeight: 1,
          }}>×</button>
        </div>
      </div>

      {/* Tasks list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {tasks.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 32, color: muted }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🌿</div>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13 }}>No tasks due this day</p>
          </div>
        ) : (
          tasks.map(({ task, listName, listColor, listId }) => {
            const overdue = new Date(task.dueDate) < new Date() && !task.completed;
            return (
              <div key={task.id} style={{
                background: dark ? '#1e1e1e' : '#fafafa',
                border: `1px solid ${bdr}`,
                borderRadius: 9, padding: '10px 12px', marginBottom: 8,
                borderLeft: `3px solid ${P_COLOR[task.priority]}`,
              }}>
                {/* List name */}
                <div style={{
                  fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em',
                  color: muted, fontFamily: "'DM Sans',sans-serif",
                  marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: listColor, flexShrink: 0 }} />
                  {listName.toUpperCase()}
                </div>
                {/* Task row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <button
                    onClick={() => onToggle(listId, task.id)}
                    style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                      border: `1.5px solid ${task.completed ? '#333' : '#d0d0d0'}`,
                      background: task.completed ? '#111' : 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', padding: 0, marginTop: 1,
                    }}
                  >
                    {task.completed && <span style={{ fontSize: 9, color: '#fff', fontWeight: 800 }}>✓</span>}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "'DM Sans',sans-serif", fontSize: 13.5, fontWeight: 500,
                      color: task.completed ? muted : txt,
                      textDecoration: task.completed ? 'line-through' : 'none',
                    }}>
                      {task.emoji && <span style={{ marginRight: 4 }}>{task.emoji}</span>}
                      {task.text}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 10.5, fontWeight: 600, padding: '1px 7px', borderRadius: 99,
                        color: P_COLOR[task.priority], background: P_BG[task.priority],
                      }}>{task.priority}</span>
                      {overdue && !task.completed && (
                        <span style={{
                          fontSize: 10.5, padding: '1px 7px', borderRadius: 99,
                          color: '#d44', background: '#fff0f0', fontWeight: 600,
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

  const txt = dark ? '#efefef' : '#111';
  const muted = dark ? '#555' : '#bbb';
  const bdr = dark ? '#2c2c2c' : '#ececec';
  const surface = dark ? '#1c1c1c' : '#fff';

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
      display: 'flex', height: '100%', overflow: 'hidden',
      fontFamily: "'DM Sans',sans-serif",
    }}>

      {/* ── Calendar area ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: 'clamp(20px,2vw,36px) clamp(24px,2.5vw,44px)' }}>

        {/* ── Header row ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <h2 style={{
            fontFamily: "'Lora',serif", fontSize: 'clamp(22px,1.8vw,30px)',
            color: txt, margin: 0, fontWeight: 600, fontStyle: 'italic', flexShrink: 0,
          }}>Calendar</h2>

          {/* View toggle */}
          <div style={{
            display: 'flex', background: dark ? '#1e1e1e' : '#f0f0f0',
            borderRadius: 8, padding: 3, gap: 2,
          }}>
            {['month', 'week'].map(v => (
              <button key={v} onClick={() => setViewMode(v)} style={{
                padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontFamily: "'DM Sans',sans-serif", fontSize: 12.5, fontWeight: 600,
                background: viewMode === v ? (dark ? '#333' : '#fff') : 'transparent',
                color: viewMode === v ? txt : muted,
                boxShadow: viewMode === v ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
                transition: 'all .15s',
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
              padding: '6px 10px', borderRadius: 8, border: `1px solid ${bdr}`,
              background: dark ? '#1e1e1e' : '#fff', color: txt,
              fontFamily: "'DM Sans',sans-serif", fontSize: 12.5, outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="all">All Lists</option>
            {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>

          {/* Nav arrows */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
            <button
              onClick={() => viewMode === 'month' ? prevMonth() : setWeekOffset(w => w - 1)}
              style={{
                background: dark ? '#1e1e1e' : '#f5f5f5', border: `1px solid ${bdr}`,
                borderRadius: 7, width: 30, height: 30, cursor: 'pointer',
                color: txt, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >‹</button>
            <span style={{
              fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600,
              color: txt, minWidth: 160, textAlign: 'center',
            }}>
              {viewMode === 'month' ? `${MONTH_NAMES[month]} ${year}` : weekLabel}
            </span>
            <button
              onClick={() => viewMode === 'month' ? nextMonth() : setWeekOffset(w => w + 1)}
              style={{
                background: dark ? '#1e1e1e' : '#f5f5f5', border: `1px solid ${bdr}`,
                borderRadius: 7, width: 30, height: 30, cursor: 'pointer',
                color: txt, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >›</button>
            <button
              onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setWeekOffset(0); }}
              style={{
                background: 'none', border: `1px solid ${bdr}`, borderRadius: 7,
                padding: '4px 11px', cursor: 'pointer', fontSize: 12,
                color: muted, fontFamily: "'DM Sans',sans-serif", marginLeft: 4,
              }}
            >Today</button>
          </div>
        </div>

        {/* ── Day labels ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(7,1fr)',
          gap: 6, marginBottom: 6,
        }}>
          {DAY_LABELS.map(d => (
            <div key={d} style={{
              textAlign: 'center', fontSize: 11, fontWeight: 700,
              color: muted, letterSpacing: '.06em', padding: '4px 0',
              fontFamily: "'DM Sans',sans-serif",
            }}>{d}</div>
          ))}
        </div>

        {/* ── Month grid ── */}
        {viewMode === 'month' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
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
