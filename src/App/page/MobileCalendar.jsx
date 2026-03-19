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

  const txt    = dark ? '#efefef' : '#111';
  const muted  = dark ? '#555'    : '#bbb';
  const bdr    = dark ? '#2c2c2c' : '#ececec';
  const surface = dark ? '#1c1c1c' : '#fff';
  const bg     = dark ? '#141414' : '#f5f5f4';

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
    // pad to full weeks
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

  return (
    <div style={{ padding: '0 0 120px', background: bg, minHeight: '100%' }}>

      {/* ── Month nav ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 18px 10px',
      }}>
        <button onClick={prevMonth} style={{
          background: dark ? '#1e1e1e' : '#f0f0f0', border: 'none', borderRadius: 9,
          width: 36, height: 36, cursor: 'pointer', fontSize: 17, color: txt,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: "'Lora',serif", fontSize: 19, fontWeight: 600,
            color: txt, fontStyle: 'italic',
          }}>{MONTH_NAMES[month]}</div>
          <div style={{ fontSize: 12, color: muted, fontFamily: "'DM Sans',sans-serif" }}>{year}</div>
        </div>
        <button onClick={nextMonth} style={{
          background: dark ? '#1e1e1e' : '#f0f0f0', border: 'none', borderRadius: 9,
          width: 36, height: 36, cursor: 'pointer', fontSize: 17, color: txt,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>›</button>
      </div>

      {/* ── Calendar grid ── */}
      <div style={{ padding: '0 12px' }}>
        {/* Day labels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
          {DAY_LABELS.map(d => (
            <div key={d} style={{
              textAlign: 'center', fontSize: 10.5, fontWeight: 700,
              color: muted, letterSpacing: '.05em', padding: '4px 0',
              fontFamily: "'DM Sans',sans-serif",
            }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
          {monthGrid.map((day, i) => {
            if (!day) return <div key={`b-${i}`} />;
            const key = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const dayTasks = tasksByDate[key] || [];
            const isToday = key === todayStr;
            const isSelected = key === selectedDate;
            const hasOverdue = dayTasks.some(t => !t.task.completed && new Date(t.task.dueDate) < today);
            const hasTask = dayTasks.length > 0;

            return (
              <div
                key={key}
                onClick={() => setSelectedDate(key)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '6px 2px 8px', borderRadius: 10, cursor: 'pointer',
                  background: isSelected
                    ? '#111'
                    : isToday
                      ? (dark ? '#2a2a2a' : '#f0f0f0')
                      : 'transparent',
                  transition: 'background .12s',
                }}
              >
                <span style={{
                  fontFamily: "'DM Sans',sans-serif",
                  fontSize: 14, fontWeight: isToday || isSelected ? 700 : 400,
                  color: isSelected ? '#fff' : isToday ? txt : txt,
                  lineHeight: 1,
                }}>{day}</span>

                {/* Dot indicators */}
                <div style={{ display: 'flex', gap: 2, marginTop: 4, height: 5 }}>
                  {hasTask && !isSelected && (
                    <>
                      <div style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: hasOverdue ? '#d44' : P_COLOR.MED,
                      }} />
                      {dayTasks.length > 1 && (
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: muted }} />
                      )}
                    </>
                  )}
                  {isSelected && hasTask && (
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,.6)' }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Divider + task count strip ── */}
      <div style={{
        margin: '14px 14px 0', padding: '10px 14px',
        background: surface, borderRadius: 12,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        border: `1px solid ${bdr}`,
      }}>
        <span style={{
          fontFamily: "'Lora',serif", fontSize: 14, color: txt,
          fontWeight: 600, fontStyle: 'italic',
        }}>{selDateLabel}</span>
        {selectedDate === todayStr && (
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '.07em',
            background: '#111', color: '#fff', borderRadius: 99, padding: '2px 8px',
            fontFamily: "'DM Sans',sans-serif",
          }}>TODAY</span>
        )}
        {selectedTasks.length > 0 && (
          <span style={{
            fontSize: 12, color: muted, fontFamily: "'DM Sans',sans-serif",
          }}>{selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* ── Task list for selected day ── */}
      <div style={{ padding: '10px 14px' }}>
        {selectedTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0', color: muted }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🌿</div>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13 }}>No tasks due this day</p>
          </div>
        ) : (
          selectedTasks.map(({ task, listId, listName, listColor }) => {
            const overdue = new Date(task.dueDate) < today && !task.completed;
            return (
              <div key={task.id} style={{
                background: surface,
                border: `1px solid ${bdr}`,
                borderLeft: `3px solid ${P_COLOR[task.priority]}`,
                borderRadius: 12, padding: '12px 14px', marginBottom: 8,
              }}>
                {/* List badge */}
                <div style={{
                  fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em',
                  color: muted, fontFamily: "'DM Sans',sans-serif",
                  marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: listColor }} />
                  {listName}
                </div>

                {/* Task row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <button
                    onClick={() => onToggleTask && onToggleTask(listId, task.id)}
                    style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                      border: `2px solid ${task.completed ? (dark?'#ccc':'#333') : '#d0d0d0'}`,
                      background: task.completed ? (dark?'#ccc':'#111') : 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', padding: 0, marginTop: 1,
                    }}
                  >
                    {task.completed && <span style={{ fontSize: 10, color: dark?'#111':'#fff', fontWeight: 800 }}>✓</span>}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "'DM Sans',sans-serif", fontSize: 15, fontWeight: 500,
                      color: task.completed ? muted : txt,
                      textDecoration: task.completed ? 'line-through' : 'none',
                    }}>
                      {task.emoji && <span style={{ marginRight: 4 }}>{task.emoji}</span>}
                      {task.text}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                        color: P_COLOR[task.priority], background: P_BG[task.priority],
                      }}>{task.priority}</span>
                      {overdue && !task.completed && (
                        <span style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 99,
                          color: '#d44', background: '#fff0f0', fontWeight: 600,
                        }}>Overdue</span>
                      )}
                      {task.completed && (
                        <span style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 99,
                          color: '#2f8a55', background: '#e4f7ec', fontWeight: 600,
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
