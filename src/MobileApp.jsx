import { useState, useCallback, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import {
  useLists,
  updateListInDB, deleteListInDB, sendListInvite,
  useListInvites, acceptListInvite, declineListInvite,
  pushActivityToDB, useActivity, createListInDB, updateListOrder,
} from "./useFirestore";
import FriendPanel, { useFriends, useFriendRequests } from "./FriendSystem";
import ProfileModal from "./ProfileModal";

// ── Shared constants (copied from App.jsx) ────────────────────────────────────
const PASTEL_COLORS = ['#FFD6E0','#D6E8FF','#D6FFE4','#FFF3D6','#E8D6FF','#FFE4D6'];
const PRIORITIES    = ['HIGH','MED','LOW'];
const P_COLOR = { HIGH:'#e05555', MED:'#c47a0a', LOW:'#2f8a55' };
const P_BG    = { HIGH:'#FFECEC', MED:'#FFF6E0', LOW:'#E4F7EC' };
const EMOJIS_LIST   = ['📌','✈️','🏠','🛒','📚','💪','🎨','🎵','🍕','☕','🎯','🔑','💡','📝','🧳','🛡️','📧'];
const REACTIONS_LIST= ['👍','🔥','❤️','🎉','😂'];
const CATEGORIES    = ['Travel','Shopping','Education','Work','Health','Personal','Events','Other'];

const genId = () => Math.random().toString(36).substr(2,9);
const ts    = () => new Date().toISOString();

const timeAgo = (iso) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const fmtDate = (ds) => {
  if (!ds) return null;
  const date = new Date(ds);
  const diff = Math.floor((date - new Date()) / 86400000);
  const timeStr = ds.includes('T') ? ` ${date.toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})}` : '';
  if (diff < 0)  return { label: `Overdue${timeStr}`, urgent: true };
  if (diff === 0) return { label: `Today${timeStr}`, urgent: true };
  if (diff === 1) return { label: `Tomorrow${timeStr}`, urgent: false };
  return { label: `${date.toLocaleDateString('en',{month:'short',day:'numeric'})}${timeStr}`, urgent: false };
};

const USERS = [
  { id:'way',  name:'Way',  avatar:'🌿', color:'#D6FFE4' },
  { id:'bell', name:'Bell', avatar:'🔔', color:'#FFD6E0' },
  { id:'john', name:'John', avatar:'⚡', color:'#D6E8FF' },
  { id:'alex', name:'Alex', avatar:'🌙', color:'#E8D6FF' },
];
const getUser = (id) => USERS.find(u => u.id === id) || USERS[0];

// ── Mobile-specific CSS ───────────────────────────────────────────────────────
const MCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; -webkit-tap-highlight-color: transparent; }

  @keyframes fadeUp   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideUp  { from{transform:translateY(100%)} to{transform:translateY(0)} }
  @keyframes slideIn  { from{transform:translateX(-100%)} to{transform:translateX(0)} }
  @keyframes fall     { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(108vh) rotate(540deg);opacity:0} }
  @keyframes shimmer  { 0%,100%{opacity:1} 50%{opacity:.3} }

  ::-webkit-scrollbar { display: none; }
  input, select, textarea { font-family: 'DM Sans', sans-serif; -webkit-appearance: none; }
  button { -webkit-tap-highlight-color: transparent; }

  /* safe area support */
  .safe-bottom { padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px)); }
  .safe-top    { padding-top:    calc(0px + env(safe-area-inset-top, 0px)); }
`;

// ── Mini components ───────────────────────────────────────────────────────────
const Avatar = ({ userId, size = 36 }) => {
  const u = getUser(userId);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: u.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.44, border: '1.5px solid rgba(0,0,0,.07)', flexShrink: 0,
      userSelect: 'none',
    }}>{u.avatar}</div>
  );
};

const PBadge = ({ p }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 11, fontWeight: 600, padding: '2px 8px 2px 6px', borderRadius: 20,
    color: P_COLOR[p], background: P_BG[p], letterSpacing: '.03em',
    flexShrink: 0, fontFamily: "'DM Sans',sans-serif",
  }}>
    <span style={{ width: 5, height: 5, borderRadius: '50%', background: P_COLOR[p], display: 'inline-block' }} />
    {p}
  </span>
);

const ProgressBar = ({ tasks }) => {
  const total = tasks.length, done = tasks.filter(t => t.completed).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'rgba(0,0,0,.1)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: '#111', transition: 'width .4s ease' }} />
      </div>
      <span style={{ fontSize: 12, color: 'rgba(0,0,0,.4)', fontFamily: "'DM Sans',sans-serif", fontWeight: 500, flexShrink: 0 }}>
        {done}/{total}
      </span>
    </div>
  );
};

// ── Confetti ──────────────────────────────────────────────────────────────────
const Confetti = ({ active }) => {
  if (!active) return null;
  return <>
    {Array.from({ length: 40 }, (_, i) => (
      <div key={i} style={{
        position: 'fixed', top: '-12px', left: `${Math.random() * 100}vw`,
        width: `${5 + Math.random() * 8}px`, height: `${5 + Math.random() * 8}px`,
        background: PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)],
        borderRadius: Math.random() > .5 ? '50%' : '3px',
        animation: `fall ${1.5 + Math.random() * 2}s ease-in forwards`,
        animationDelay: `${Math.random()}s`, zIndex: 9999, pointerEvents: 'none',
      }} />
    ))}
  </>;
};

// ── Drawer (slide-up sheet) ───────────────────────────────────────────────────
const Drawer = ({ open, onClose, children, title, maxHeight = '85vh' }) => {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
        zIndex: 900, backdropFilter: 'blur(3px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: '#fff', borderRadius: '20px 20px 0 0',
          maxHeight, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          animation: 'slideUp .28s cubic-bezier(.34,1.2,.64,1)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: '#ddd' }} />
        </div>
        {title && (
          <div style={{ padding: '4px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Lora',serif", fontSize: 18, fontWeight: 600, color: '#111', fontStyle: 'italic' }}>{title}</span>
            <button onClick={onClose} style={{ background: '#f2f2f2', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', fontSize: 15, color: '#888' }}>✕</button>
          </div>
        )}
        <div style={{ overflow: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// ── Task row (mobile-optimised) ───────────────────────────────────────────────
const MobileTaskItem = ({ task, currentUser, onToggle, onDelete, onReact, onOpenDetail }) => {
  const di = fmtDate(task.dueDate);
  const [showRx, setShowRx] = useState(false);

  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '13px 15px',
      marginBottom: 8, boxShadow: '0 1px 4px rgba(0,0,0,.06)',
      display: 'flex', gap: 12, alignItems: 'flex-start',
      opacity: task.completed ? .6 : 1, transition: 'opacity .2s',
      position: 'relative',
    }}>
      {/* Checkbox — big touch target */}
      <button
        onClick={() => onToggle(task.id)}
        style={{
          width: 26, height: 26, borderRadius: 8, flexShrink: 0, marginTop: 1,
          border: `2px solid ${task.completed ? '#111' : '#d0d0d0'}`,
          background: task.completed ? '#111' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all .15s', padding: 0,
        }}
      >
        {task.completed && <span style={{ fontSize: 12, color: '#fff', fontWeight: 800, lineHeight: 1 }}>✓</span>}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
          {task.emoji && <span style={{ fontSize: 15 }}>{task.emoji}</span>}
          <span style={{
            fontFamily: "'DM Sans',sans-serif", fontWeight: 500, fontSize: 15,
            color: task.completed ? '#bbb' : '#111',
            textDecoration: task.completed ? 'line-through' : 'none',
            flex: 1, minWidth: 0,
          }}>{task.text}</span>
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <PBadge p={task.priority} />
          {di && (
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 20,
              background: di.urgent ? '#FFF0F0' : '#f5f5f5',
              color: di.urgent ? '#d44' : '#aaa',
              fontFamily: "'DM Sans',sans-serif",
            }}>{di.label}</span>
          )}
          {task.assignee && !task.completed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Avatar userId={task.assignee} size={16} />
              <span style={{ fontSize: 11, color: '#aaa', fontFamily: "'DM Sans',sans-serif" }}>{task.assigneeName || task.assignee}</span>
            </div>
          )}
        </div>

        {/* Reactions + comments */}
        {(Object.values(task.reactions).some(a => a.length > 0) || task.comments.length > 0) && (
          <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
            {REACTIONS_LIST.map(em => {
              const us = task.reactions[em] || [];
              return us.length > 0 ? (
                <button key={em} onClick={() => onReact(task.id, em)} style={{
                  background: us.includes(currentUser.id) ? '#f0f0f0' : 'transparent',
                  border: '1px solid #ebebeb', borderRadius: 99,
                  padding: '2px 8px', fontSize: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 2,
                }}>{em}<span style={{ fontSize: 11 }}>{us.length}</span></button>
              ) : null;
            })}
            {task.comments.length > 0 && (
              <button onClick={() => onOpenDetail(task)} style={{
                background: 'none', border: 'none', color: '#bbb',
                fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2,
              }}>💬 {task.comments.length}</button>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <button
          onClick={() => setShowRx(v => !v)}
          style={{
            background: '#f5f5f5', border: 'none', borderRadius: 8,
            width: 34, height: 34, cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >😊</button>
        <button
          onClick={() => onOpenDetail(task)}
          style={{
            background: '#f5f5f5', border: 'none', borderRadius: 8,
            width: 34, height: 34, cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#888',
          }}
        >···</button>
        <button
          onClick={() => onDelete(task.id)}
          style={{
            background: '#fff0f0', border: 'none', borderRadius: 8,
            width: 34, height: 34, cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#d44',
          }}
        >×</button>
      </div>

      {/* Reaction picker */}
      {showRx && (
        <div style={{
          position: 'absolute', right: 8, top: 54, zIndex: 200,
          background: '#fff', border: '1px solid #ebebeb', borderRadius: 12,
          padding: '8px 10px', display: 'flex', gap: 6,
          boxShadow: '0 8px 24px rgba(0,0,0,.12)',
        }}>
          {REACTIONS_LIST.map(em => (
            <button key={em} onClick={() => { onReact(task.id, em); setShowRx(false); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, padding: '2px 3px', borderRadius: 8 }}
            >{em}</button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── List selector panel (slide-in from left) ──────────────────────────────────
const ListPanel = ({ open, onClose, lists, selId, onSelect, onNewList, dark }) => {
  const personal = lists.filter(l => !l.isGroup);
  const group = lists.filter(l => l.isGroup);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 800, backdropFilter: 'blur(2px)' }}
        />
      )}
      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: 'min(82vw, 320px)',
        background: '#111',
        zIndex: 810,
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .3s cubic-bezier(.4,0,.2,1)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {/* Logo */}
        <div style={{ padding: '52px 20px 16px', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: '#fff', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#111' }}>✓</div>
            <span style={{ fontFamily: "'Lora',serif", fontSize: 20, color: '#e8e8e8', letterSpacing: '-.02em', fontStyle: 'italic' }}>checkmate</span>
          </div>
        </div>

        {/* List scroll area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
          {/* Personal */}
          <div style={{ fontSize: 10, fontWeight: 700, color: '#333', letterSpacing: '.12em', padding: '4px 10px 8px', fontFamily: "'DM Sans',sans-serif" }}>PERSONAL</div>
          {personal.map(l => (
            <button key={l.id} onClick={() => { onSelect(l.id); onClose(); }}
              style={{
                width: '100%', textAlign: 'left', background: selId === l.id ? 'rgba(255,255,255,.1)' : 'transparent',
                border: 'none', borderRadius: 10, padding: '12px 14px',
                cursor: 'pointer', color: selId === l.id ? '#f0f0f0' : '#555',
                fontFamily: "'DM Sans',sans-serif", fontSize: 15,
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2,
              }}
            >
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span>
              {l.isPrivate && <span style={{ fontSize: 10, color: '#333' }}>🔒</span>}
              {l.tasks && (
                <span style={{ fontSize: 11, color: '#3a3a3a', fontFamily: "'DM Sans',sans-serif" }}>
                  {l.tasks.filter(t => t.completed).length}/{l.tasks.length}
                </span>
              )}
            </button>
          ))}

          {/* Group */}
          {group.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#333', letterSpacing: '.12em', padding: '12px 10px 8px', fontFamily: "'DM Sans',sans-serif" }}>GROUP</div>
              {group.map(l => (
                <button key={l.id} onClick={() => { onSelect(l.id); onClose(); }}
                  style={{
                    width: '100%', textAlign: 'left', background: selId === l.id ? 'rgba(255,255,255,.1)' : 'transparent',
                    border: 'none', borderRadius: 10, padding: '12px 14px',
                    cursor: 'pointer', color: selId === l.id ? '#f0f0f0' : '#555',
                    fontFamily: "'DM Sans',sans-serif", fontSize: 15,
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2,
                  }}
                >
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span>
                  <div style={{ display: 'flex' }}>
                    {(l.members || []).slice(0, 3).map((m, i) => (
                      <div key={m} style={{
                        marginLeft: i > 0 ? -5 : 0, width: 18, height: 18, borderRadius: '50%',
                        background: getUser(m).color, fontSize: 9,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1.5px solid #111',
                      }}>{getUser(m).avatar}</div>
                    ))}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>

        {/* New list button */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,.07)' }}>
          <button onClick={() => { onNewList(); onClose(); }}
            style={{
              width: '100%', background: 'rgba(255,255,255,.07)', border: '1px dashed rgba(255,255,255,.15)',
              borderRadius: 10, padding: '13px 16px', cursor: 'pointer',
              color: '#666', fontFamily: "'DM Sans',sans-serif", fontSize: 15,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <span style={{ color: '#555', fontSize: 18 }}>＋</span> New List
          </button>
        </div>
      </div>
    </>
  );
};

// ── AI Suggestions (mobile) ───────────────────────────────────────────────────
const AISuggestions = ({ listName, onAddTask, onClose }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514', max_tokens: 300,
            messages: [{ role: 'user', content: `Give exactly 6 short checklist items for a list called "${listName}". Return ONLY a valid JSON array of 6 strings. No markdown, no extra text.` }],
          }),
        });
        const d = await res.json();
        const raw = d.content.map(c => c.text || '').join('').replace(/```json|```/g, '').trim();
        setItems(JSON.parse(raw));
      } catch {
        setItems(['Research options', 'Set a deadline', 'Create a budget', 'Assign responsibilities', 'Review progress', 'Finalize and submit']);
      } finally { setLoading(false); }
    })();
  }, [listName]);

  return (
    <div style={{ padding: '8px 16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <span>✨</span>
        <span style={{ fontFamily: "'Lora',serif", fontSize: 15, color: '#111', fontStyle: 'italic' }}>AI Suggestions</span>
        {loading && <span style={{ fontSize: 12, color: '#bbb', animation: 'shimmer 1.4s ease infinite' }}>thinking…</span>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {loading
          ? Array.from({ length: 4 }, (_, i) => (
            <div key={i} style={{ height: 36, width: 80 + i * 22, borderRadius: 99, background: '#f0f0f0', animation: `shimmer 1.4s ease ${i * .1}s infinite` }} />
          ))
          : items.map((s, i) => (
            <button key={i} onClick={() => { if (!added.includes(i)) { onAddTask(s); setAdded(a => [...a, i]); } }}
              style={{
                padding: '8px 14px', borderRadius: 99, fontFamily: "'DM Sans',sans-serif", fontSize: 14,
                cursor: 'pointer', fontWeight: added.includes(i) ? 600 : 400,
                border: `1.5px solid ${added.includes(i) ? '#111' : '#ddd'}`,
                background: added.includes(i) ? '#111' : 'transparent',
                color: added.includes(i) ? '#fff' : '#333',
              }}
            >{added.includes(i) ? '✓ ' : ''}{s}</button>
          ))
        }
      </div>
      <button onClick={onClose} style={{
        width: '100%', marginTop: 16, padding: '11px', borderRadius: 10,
        border: '1px solid #eee', background: 'transparent', color: '#bbb',
        fontFamily: "'DM Sans',sans-serif", fontSize: 14, cursor: 'pointer',
      }}>Close</button>
    </div>
  );
};

// ── Create / Edit List modal (mobile) ─────────────────────────────────────────
const ListFormDrawer = ({ open, onClose, existing, currentUser, friends, onCreate, onSave }) => {
  const isEdit = !!existing;
  const [name, setName] = useState(existing?.name || '');
  const [cat, setCat] = useState(existing?.category || 'Personal');
  const [color, setColor] = useState(existing?.color || PASTEL_COLORS[0]);
  const [isPrivate, setIsPrivate] = useState(existing?.isPrivate || false);
  const [selFriends, setSelFriends] = useState(
    isEdit ? (existing.memberIds || []).filter(id => id !== currentUser.id) : []
  );

  // reset when opening
  useEffect(() => {
    if (open) {
      setName(existing?.name || '');
      setCat(existing?.category || 'Personal');
      setColor(existing?.color || PASTEL_COLORS[0]);
      setIsPrivate(existing?.isPrivate || false);
      setSelFriends(isEdit ? (existing.memberIds || []).filter(id => id !== currentUser.id) : []);
    }
  }, [open, existing]);

  const toggleFriend = uid => setSelFriends(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    const memberIds = [currentUser.id, ...selFriends];
    if (isEdit) {
      onSave({ ...existing, name: name.trim(), category: cat, color, isPrivate, isGroup: selFriends.length > 0, members: memberIds, memberIds });
    } else {
      onCreate({ id: genId(), name: name.trim(), category: cat, color, isPrivate, isGroup: selFriends.length > 0, members: memberIds, memberIds, selectedFriends: selFriends, createdBy: currentUser.id, createdAt: ts(), tasks: [] });
    }
    onClose();
  };

  const inp = { width: '100%', padding: '13px 15px', borderRadius: 11, border: '1px solid #eee', background: '#f8f8f8', color: '#111', fontFamily: "'DM Sans',sans-serif", fontSize: 15, outline: 'none' };

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? 'Edit List' : 'New List'} maxHeight="92vh">
      <div style={{ padding: '4px 20px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#bbb', letterSpacing: '.08em', marginBottom: 7, fontFamily: "'DM Sans',sans-serif" }}>LIST NAME</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Trip to Japan 🗾" style={inp} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#bbb', letterSpacing: '.08em', marginBottom: 7, fontFamily: "'DM Sans',sans-serif" }}>CATEGORY</div>
          <select value={cat} onChange={e => setCat(e.target.value)} style={{ ...inp, appearance: 'none' }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#bbb', letterSpacing: '.08em', marginBottom: 9, fontFamily: "'DM Sans',sans-serif" }}>COLOR</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {PASTEL_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{
                width: 34, height: 34, borderRadius: '50%', background: c, border: 'none',
                outline: color === c ? '3px solid #111' : '2px solid transparent',
                outlineOffset: 2, cursor: 'pointer',
              }} />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setIsPrivate(v => !v)} style={{
            width: 44, height: 26, borderRadius: 13, border: 'none', padding: 0,
            background: isPrivate ? '#111' : '#ddd', position: 'relative', cursor: 'pointer',
          }}>
            <div style={{ position: 'absolute', top: 3, left: isPrivate ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
          </button>
          <span style={{ fontSize: 15, color: '#333', fontFamily: "'DM Sans',sans-serif" }}>🔒 Private (เฉพาะคุณเห็น)</span>
        </div>
        {!isPrivate && friends.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#bbb', letterSpacing: '.08em', marginBottom: 9, fontFamily: "'DM Sans',sans-serif" }}>{isEdit ? 'MEMBERS' : 'INVITE FRIENDS'}</div>
            {friends.map(f => (
              <div key={f.uid} onClick={() => toggleFriend(f.uid)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px',
                borderRadius: 11, cursor: 'pointer', marginBottom: 4,
                background: selFriends.includes(f.uid) ? '#f2f2f2' : 'transparent',
              }}>
                {f.avatar ? <img src={f.avatar} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                  : <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#dde8f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤</div>}
                <span style={{ flex: 1, fontSize: 15, color: '#111', fontFamily: "'DM Sans',sans-serif" }}>{f.name}</span>
                {selFriends.includes(f.uid) && <span style={{ color: '#3a8f56', fontWeight: 700, fontSize: 16 }}>✓</span>}
              </div>
            ))}
          </div>
        )}
        <button onClick={handleSubmit} style={{
          width: '100%', padding: '15px', borderRadius: 13, background: '#111',
          color: '#fff', border: 'none', cursor: 'pointer',
          fontFamily: "'DM Sans',sans-serif", fontSize: 16, fontWeight: 600, marginTop: 4,
        }}>{isEdit ? 'Save Changes' : 'Create List'}</button>
      </div>
    </Drawer>
  );
};

// ── Task Detail Drawer ────────────────────────────────────────────────────────
const TaskDetailDrawer = ({ task, open, onClose, currentUser, onUpdate, onSave, onReact, friends, listMembers }) => {
  const [tab, setTab] = useState('detail');
  const [editText, setEditText] = useState('');
  const [editPrio, setEditPrio] = useState('MED');
  const [editAssignee, setEditAssignee] = useState('');
  const [editDue, setEditDue] = useState('');
  const [editTime, setEditTime] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (task) {
      setEditText(task.text);
      setEditPrio(task.priority);
      setEditAssignee(task.assignee || '');
      setEditDue(task.dueDate ? task.dueDate.split('T')[0] : '');
      setEditTime(task.dueDate?.includes('T') ? task.dueDate.split('T')[1]?.slice(0, 5) : '');
      setTab('detail');
    }
  }, [task]);

  if (!task) return null;

  const allUsers = [
    { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar },
    ...friends.map(f => ({ id: f.uid, name: f.name, avatar: f.avatar })),
  ];
  const getUserById = uid => allUsers.find(u => u.id === uid) || { id: uid, name: 'Unknown', avatar: null };
  const memberUsers = listMembers.map(uid => allUsers.find(u => u.id === uid)).filter(Boolean);

  const save = () => {
    const assigneeUser = memberUsers.find(u => u.id === editAssignee);
    onSave({ ...task, text: editText, priority: editPrio, assignee: editAssignee || null, assigneeName: assigneeUser?.name || null, dueDate: editDue ? (editTime ? `${editDue}T${editTime}` : editDue) : null });
  };

  const addComment = () => {
    if (!comment.trim()) return;
    onUpdate({ ...task, comments: [...task.comments, { id: genId(), userId: currentUser.id, text: comment.trim(), createdAt: ts() }] });
    setComment('');
  };

  const inp = { width: '100%', padding: '12px 14px', borderRadius: 11, border: '1px solid #eee', background: '#f8f8f8', color: '#111', fontFamily: "'DM Sans',sans-serif", fontSize: 15, outline: 'none' };

  return (
    <Drawer open={open} onClose={onClose} maxHeight="92vh">
      {/* Task title */}
      <div style={{ padding: '4px 20px 0' }}>
        <input value={editText} onChange={e => setEditText(e.target.value)}
          style={{ width: '100%', fontFamily: "'Lora',serif", fontSize: 20, color: '#111', background: 'none', border: 'none', outline: 'none', fontWeight: 600 }} />
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #eee', marginTop: 10 }}>
          {['detail', 'comments'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 18px', fontFamily: "'DM Sans',sans-serif", fontSize: 14,
              fontWeight: tab === t ? 600 : 400, color: tab === t ? '#111' : '#bbb',
              borderBottom: tab === t ? '2px solid #111' : '2px solid transparent',
            }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}{t === 'comments' && task.comments.length > 0 ? ` (${task.comments.length})` : ''}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px 32px' }}>
        {tab === 'detail' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Priority */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#bbb', letterSpacing: '.08em', marginBottom: 9, fontFamily: "'DM Sans',sans-serif" }}>PRIORITY</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {PRIORITIES.map(p => (
                  <button key={p} onClick={() => setEditPrio(p)} style={{
                    flex: 1, padding: '10px 0', borderRadius: 99, fontSize: 13,
                    cursor: 'pointer', fontWeight: 600,
                    border: `1.5px solid ${editPrio === p ? P_COLOR[p] : '#eee'}`,
                    background: editPrio === p ? P_BG[p] : 'transparent',
                    color: editPrio === p ? P_COLOR[p] : '#bbb',
                  }}>{p}</button>
                ))}
              </div>
            </div>
            {/* Assignee */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#bbb', letterSpacing: '.08em', marginBottom: 9, fontFamily: "'DM Sans',sans-serif" }}>ASSIGN TO</div>
              <select value={editAssignee} onChange={e => setEditAssignee(e.target.value)} style={{ ...inp, appearance: 'none' }}>
                <option value="">Unassigned</option>
                {memberUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            {/* Due date */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#bbb', letterSpacing: '.08em', marginBottom: 9, fontFamily: "'DM Sans',sans-serif" }}>DUE DATE</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="date" value={editDue} onChange={e => setEditDue(e.target.value)} style={{ ...inp }} />
                <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} style={{ ...inp, width: 120 }} />
              </div>
            </div>
            {/* Reactions */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#bbb', letterSpacing: '.08em', marginBottom: 9, fontFamily: "'DM Sans',sans-serif" }}>REACTIONS</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {REACTIONS_LIST.map(em => {
                  const us = task.reactions[em] || [];
                  return (
                    <button key={em} onClick={() => onReact(task.id, em)} style={{
                      background: us.includes(currentUser.id) ? '#f0f0f0' : 'transparent',
                      border: '1.5px solid #eee', borderRadius: 99, padding: '7px 14px',
                      cursor: 'pointer', fontSize: 15, display: 'flex', gap: 5, alignItems: 'center',
                    }}>{em}{us.length > 0 && <span style={{ fontSize: 13 }}>{us.length}</span>}</button>
                  );
                })}
              </div>
            </div>
            <button onClick={save} style={{
              width: '100%', padding: '15px', borderRadius: 13, background: '#111',
              color: '#fff', border: 'none', cursor: 'pointer',
              fontFamily: "'DM Sans',sans-serif", fontSize: 16, fontWeight: 600,
            }}>Save Changes</button>
          </div>
        )}

        {tab === 'comments' && (
          <div>
            {task.comments.length === 0 && (
              <p style={{ color: '#bbb', fontSize: 14, fontFamily: "'DM Sans',sans-serif", padding: '8px 0' }}>No comments yet. Be the first!</p>
            )}
            {task.comments.map(c => {
              const u = getUserById(c.userId);
              return (
                <div key={c.id} style={{ display: 'flex', gap: 11, marginBottom: 16 }}>
                  {u.avatar
                    ? <img src={u.avatar} style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }} alt="" />
                    : <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#dde8f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>👤</div>}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 5 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#111', fontFamily: "'DM Sans',sans-serif" }}>{u.name}</span>
                      <span style={{ fontSize: 12, color: '#bbb' }}>{timeAgo(c.createdAt)}</span>
                    </div>
                    <div style={{ background: '#f5f5f5', borderRadius: '3px 12px 12px 12px', padding: '10px 13px' }}>
                      <p style={{ fontSize: 14, color: '#111', fontFamily: "'DM Sans',sans-serif", margin: 0, lineHeight: 1.5 }}>{c.text}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div style={{ display: 'flex', gap: 9, marginTop: 12 }}>
              {currentUser.avatar
                ? <img src={currentUser.avatar} style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }} alt="" />
                : <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#dde8f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>👤</div>}
              <input value={comment} onChange={e => setComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addComment()}
                placeholder="Write a comment…"
                style={{ ...inp, flex: 1 }} />
              <button onClick={addComment} style={{
                background: '#111', color: '#fff', border: 'none', borderRadius: 11,
                padding: '12px 16px', cursor: 'pointer', fontSize: 14,
                fontFamily: "'DM Sans',sans-serif", fontWeight: 500, flexShrink: 0,
              }}>Send</button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};

// ── Activity view (mobile) ────────────────────────────────────────────────────
const MobileActivityView = ({ activity, currentUser, friends }) => {
  const actionColor = a => a === 'completed' ? '#2f8a55' : a === 'added' ? '#2a5fb0' : '#888';
  const getActivityUser = (userId) => {
    if (userId === currentUser.id) return currentUser;
    const f = friends.find(f => f.uid === userId);
    return f ? { id: f.uid, name: f.name, avatar: f.avatar } : { id: userId, name: 'Someone', avatar: null };
  };

  return (
    <div style={{ padding: '20px 16px 120px' }}>
      <h2 style={{ fontFamily: "'Lora',serif", fontSize: 26, color: '#111', margin: '0 0 4px', fontStyle: 'italic' }}>Activity</h2>
      <p style={{ color: '#bbb', fontSize: 13, fontFamily: "'DM Sans',sans-serif", marginBottom: 24, marginTop: 4 }}>Everything happening across your lists</p>
      {activity.length === 0 && (
        <div style={{ textAlign: 'center', padding: '44px 0', color: '#bbb' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>⚡</div>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14 }}>ยังไม่มี activity</p>
        </div>
      )}
      {activity.map((a, i) => {
        const u = getActivityUser(a.userId);
        return (
          <div key={a.id} style={{ display: 'flex', gap: 12, marginBottom: 18, position: 'relative' }}>
            {i < activity.length - 1 && <div style={{ position: 'absolute', left: 16, top: 34, bottom: -10, width: 1, background: '#eee' }} />}
            {u.avatar
              ? <img src={u.avatar} style={{ width: 33, height: 33, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }} alt="" />
              : <div style={{ width: 33, height: 33, borderRadius: '50%', background: '#dde8f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>👤</div>}
            <div style={{ paddingTop: 4 }}>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: '#111', margin: '0 0 2px', lineHeight: 1.5 }}>
                <strong>{u.name}</strong>
                <span style={{ color: actionColor(a.action) }}> {a.action} </span>
                <span style={{ fontStyle: 'italic', color: '#aaa' }}>"{a.target}"</span>
              </p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: '#bbb', margin: 0 }}>
                {a.listName} · {a.createdAt?.toMillis ? timeAgo(new Date(a.createdAt.toMillis()).toISOString()) : timeAgo(a.createdAt)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Leaderboard view (mobile) ─────────────────────────────────────────────────
const MobileLeaderboard = ({ lists, currentUser, friends }) => {
  const people = [currentUser, ...friends.map(f => ({ id: f.uid, name: f.name, avatar: f.avatar }))];
  const medals = ['🥇', '🥈', '🥉'];
  const scores = people.map(p => {
    const completed = lists.flatMap(l => l.tasks).filter(t => t.completedBy === p.id).length;
    const added = lists.flatMap(l => l.tasks).filter(t => t.createdBy === p.id).length;
    return { ...p, completed, added, score: completed * 2 + added };
  }).sort((a, b) => b.score - a.score);

  return (
    <div style={{ padding: '20px 16px 120px' }}>
      <h2 style={{ fontFamily: "'Lora',serif", fontSize: 26, color: '#111', margin: '0 0 4px', fontStyle: 'italic' }}>Leaderboard 🏆</h2>
      <p style={{ color: '#bbb', fontSize: 13, fontFamily: "'DM Sans',sans-serif", marginBottom: 24, marginTop: 4 }}>คะแนนจากการทำและสร้าง tasks</p>
      {scores.map((s, i) => (
        <div key={s.id} style={{
          background: '#fff', borderRadius: 14, padding: '14px 18px', marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: i === 0 ? '0 2px 12px rgba(0,0,0,.06)' : '0 1px 4px rgba(0,0,0,.04)',
        }}>
          <div style={{ fontSize: 22, width: 28, flexShrink: 0 }}>{medals[i] || <span style={{ fontSize: 14, color: '#bbb', fontWeight: 600 }}>{i + 1}</span>}</div>
          {s.avatar
            ? <img src={s.avatar} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
            : <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#dde8f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>👤</div>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#111', fontFamily: "'DM Sans',sans-serif" }}>{s.name}</div>
            <div style={{ fontSize: 12, color: '#bbb', fontFamily: "'DM Sans',sans-serif", marginTop: 2 }}>✅ {s.completed} · ➕ {s.added}</div>
          </div>
          <div style={{ fontFamily: "'Lora',serif", fontSize: 24, color: '#111', fontWeight: 600 }}>{s.score}</div>
        </div>
      ))}
    </div>
  );
};

// ── MAIN MOBILE APP ───────────────────────────────────────────────────────────
export default function MobileApp({ firebaseUser }) {
  const firestoreLists = useLists(firebaseUser?.uid ?? null);
  const [lists, setLists] = useState([]);
  const [activity, setActivity] = useState([]);
  const [selId, setSelId] = useState(null);
  const [dark] = useState(false); // mobile always light for now
  const [tab, setTab] = useState('lists');  // 'lists' | 'activity' | 'leaderboard' | 'profile'
  const [showPanel, setShowPanel] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [taskDetail, setTaskDetail] = useState(null);
  const [confetti, setConfetti] = useState(false);
  const [newText, setNewText] = useState('');
  const [newPrio, setNewPrio] = useState('MED');
  const [expandAdd, setExpandAdd] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showInvites, setShowInvites] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const currentUser = firebaseUser ? {
    id: firebaseUser.uid,
    name: firebaseUser.displayName,
    avatar: firebaseUser.photoURL,
    email: firebaseUser.email,
  } : { id: '', name: '', avatar: '', email: '' };

  // Hooks
  const friends = useFriends(currentUser.id);
  const listInvites = useListInvites(currentUser.id);
  const friendRequests = useFriendRequests(currentUser.id);
  const friendIds = friends.map(f => f.uid);
  const firestoreActivity = useActivity(firebaseUser?.uid, friendIds);

  useEffect(() => {
    const sorted = [...firestoreLists].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    setLists(sorted);
    if (!selId && sorted.length > 0) setSelId(sorted[0].id);
  }, [firestoreLists]);

  useEffect(() => {
    if (firestoreActivity.length > 0) setActivity(firestoreActivity);
  }, [firestoreActivity]);

  const updateList = useCallback((id, fn) => {
    setLists(prev => {
      const updated = prev.map(l => l.id === id ? fn(l) : l);
      const newList = updated.find(l => l.id === id);
      if (newList) updateListInDB(id, newList);
      return updated;
    });
  }, []);

  const pushActivity = useCallback((userId, action, target, listName) => {
    const item = { id: genId(), userId, action, target, listName, createdAt: new Date().toISOString() };
    setActivity(prev => [item, ...prev].slice(0, 50));
    if (firebaseUser?.uid) pushActivityToDB(firebaseUser.uid, { userId, action, target, listName });
  }, [firebaseUser]);

  const sel = lists.find(l => l.id === selId);

  const toggleTask = useCallback((taskId) => {
    const list = lists.find(l => l.id === selId); if (!list) return;
    const task = list.tasks.find(t => t.id === taskId); if (!task) return;
    const wasCompleted = task.completed;
    updateList(selId, l => {
      const newTasks = l.tasks.map(t => t.id !== taskId ? t : {
        ...t, completed: !t.completed,
        completedBy: !t.completed ? currentUser.id : null,
        completedAt: !t.completed ? ts() : null,
      });
      const allDone = newTasks.length > 0 && newTasks.every(t => t.completed);
      if (allDone) { setConfetti(true); setTimeout(() => setConfetti(false), 3500); }
      return { ...l, tasks: newTasks };
    });
    pushActivity(currentUser.id, wasCompleted ? 'uncompleted' : 'completed', task.text, list.name);
  }, [lists, selId, currentUser, updateList, pushActivity]);

  const addTask = useCallback(() => {
    if (!newText.trim() || !selId) return;
    const task = {
      id: genId(), text: newText.trim(), completed: false,
      completedBy: null, completedAt: null, assignee: null, assigneeName: null,
      priority: newPrio, dueDate: null,
      emoji: EMOJIS_LIST[Math.floor(Math.random() * 5)],
      reactions: {}, comments: [], createdBy: currentUser.id, createdAt: ts(),
    };
    const list = lists.find(l => l.id === selId);
    updateList(selId, l => ({ ...l, tasks: [...l.tasks, task] }));
    pushActivity(currentUser.id, 'added', task.text, list?.name || '');
    setNewText(''); setNewPrio('MED'); setExpandAdd(false);
  }, [newText, newPrio, selId, lists, currentUser, updateList, pushActivity]);

  const deleteTask = useCallback((taskId) => {
    updateList(selId, l => ({ ...l, tasks: l.tasks.filter(t => t.id !== taskId) }));
  }, [selId, updateList]);

  const reactToTask = useCallback((taskId, emoji) => {
    updateList(selId, l => ({
      ...l, tasks: l.tasks.map(t => {
        if (t.id !== taskId) return t;
        const us = t.reactions[emoji] || [];
        return { ...t, reactions: { ...t.reactions, [emoji]: us.includes(currentUser.id) ? us.filter(u => u !== currentUser.id) : [...us, currentUser.id] } };
      }),
    }));
  }, [selId, currentUser, updateList]);

  const updateTask = useCallback((ut) => {
    updateList(selId, l => ({ ...l, tasks: l.tasks.map(t => t.id === ut.id ? ut : t) }));
    setTaskDetail(ut);
  }, [selId, updateList]);

  const createList = useCallback(async (data) => {
    const { selectedFriends: inviteFriends = [], ...listData } = data;
    const id = await createListInDB(listData);
    for (const friendUid of inviteFriends) {
      await sendListInvite(currentUser, friendUid, { ...listData, id });
    }
    setSelId(id);
    setTab('lists');
    pushActivity(currentUser.id, 'created list', data.name, data.name);
  }, [currentUser, pushActivity]);

  const deleteList = useCallback((id) => {
    deleteListInDB(id);
    setLists(prev => prev.filter(l => l.id !== id));
    if (selId === id) setSelId(lists.find(l => l.id !== id)?.id || null);
  }, [lists, selId]);

  const bg = '#f5f5f4';
  const notifCount = friendRequests.length + listInvites.length;

  return (
    <>
      <style>{MCSS}</style>
      <Confetti active={confetti} />

      {/* Modals / Drawers */}
      <ListFormDrawer
        open={showCreate} onClose={() => setShowCreate(false)}
        existing={null} currentUser={currentUser} friends={friends}
        onCreate={createList}
      />
      <ListFormDrawer
        open={!!editingList} onClose={() => setEditingList(null)}
        existing={editingList} currentUser={currentUser} friends={friends}
        onSave={(updated) => { updateList(updated.id, () => updated); setEditingList(null); }}
      />
      {showProfile && (
        <ProfileModal currentUser={currentUser} dark={false} onClose={() => setShowProfile(false)} onUpdate={() => setShowProfile(false)} />
      )}
      {showFriends && <FriendPanel currentUser={currentUser} dark={false} onClose={() => setShowFriends(false)} />}

      {/* Invites drawer */}
      <Drawer open={showInvites} onClose={() => setShowInvites(false)} title="📬 List Invites">
        <div style={{ padding: '4px 20px 40px' }}>
          {listInvites.length === 0 && (
            <p style={{ color: '#bbb', fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>ไม่มี invite ตอนนี้ครับ</p>
          )}
          {listInvites.map(inv => (
            <div key={inv.listId} style={{ background: inv.listColor || '#D6E8FF', borderRadius: 14, padding: '15px 17px', marginBottom: 10 }}>
              <div style={{ fontFamily: "'Lora',serif", fontSize: 17, color: '#111', marginBottom: 4, fontWeight: 600 }}>{inv.listName}</div>
              <div style={{ fontSize: 13, color: 'rgba(0,0,0,.45)', marginBottom: 13, fontFamily: "'DM Sans',sans-serif" }}>invited by {inv.invitedBy}</div>
              <div style={{ display: 'flex', gap: 9 }}>
                <button onClick={async () => { await acceptListInvite(firebaseUser.uid, inv); setShowInvites(false); }}
                  style={{ background: '#111', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 18px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600 }}>✓ Join</button>
                <button onClick={async () => { await declineListInvite(firebaseUser.uid, inv.listId); }}
                  style={{ background: 'rgba(200,50,50,.1)', color: '#c0392b', border: 'none', borderRadius: 9, padding: '10px 15px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 14 }}>✕ Decline</button>
              </div>
            </div>
          ))}
        </div>
      </Drawer>

      {/* Task detail drawer */}
      <TaskDetailDrawer
        task={taskDetail} open={!!taskDetail}
        onClose={() => setTaskDetail(null)}
        currentUser={currentUser}
        onUpdate={updateTask}
        onSave={(updated) => { updateTask(updated); setTaskDetail(null); }}
        onReact={reactToTask}
        friends={friends}
        listMembers={sel?.memberIds || []}
      />

      {/* List Panel (slide-in drawer) */}
      <ListPanel
        open={showPanel} onClose={() => setShowPanel(false)}
        lists={lists} selId={selId}
        onSelect={(id) => { setSelId(id); setTab('lists'); }}
        onNewList={() => setShowCreate(true)}
      />

      {/* ── MAIN SCROLL AREA ── */}
      <div style={{
        height: '100dvh', background: bg, display: 'flex', flexDirection: 'column',
        fontFamily: "'DM Sans',sans-serif", overflow: 'hidden',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>

        {/* ── TOP BAR ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '13px 16px 11px',
          background: tab === 'lists' && sel ? sel.color : bg,
          borderBottom: tab !== 'lists' ? '1px solid #eee' : 'none',
          transition: 'background .3s',
          flexShrink: 0,
        }}>
          {/* Hamburger */}
          <button
            onClick={() => setShowPanel(v => !v)}
            style={{
              width: 42, height: 42, borderRadius: 11,
              background: 'rgba(0,0,0,.07)', border: 'none',
              cursor: 'pointer', fontSize: 18, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >☰</button>

          {/* Title */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {tab === 'lists' && sel ? (
              <>
                <div style={{ fontFamily: "'Lora',serif", fontSize: 19, color: '#111', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sel.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,.4)', marginTop: 1, fontFamily: "'DM Sans',sans-serif" }}>{sel.category}</div>
              </>
            ) : tab === 'lists' ? (
              <span style={{ fontFamily: "'Lora',serif", fontSize: 19, color: '#888', fontStyle: 'italic' }}>No list selected</span>
            ) : (
              <span style={{ fontFamily: "'Lora',serif", fontSize: 19, color: '#111', fontWeight: 600 }}>
                {tab === 'activity' ? 'Activity' : tab === 'leaderboard' ? 'Leaderboard' : 'Profile'}
              </span>
            )}
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
            {notifCount > 0 && (
              <button onClick={() => setShowInvites(true)} style={{
                width: 42, height: 42, borderRadius: 11, background: '#d44',
                border: 'none', cursor: 'pointer', color: '#fff',
                fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif",
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{notifCount}</button>
            )}
            {tab === 'lists' && sel && (
              <button onClick={() => setEditingList(sel)} style={{
                width: 42, height: 42, borderRadius: 11,
                background: 'rgba(0,0,0,.07)', border: 'none',
                cursor: 'pointer', fontSize: 17, color: '#555',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✏️</button>
            )}
            <button
              onClick={() => setShowProfile(true)}
              style={{
                width: 42, height: 42, borderRadius: 11,
                background: 'rgba(0,0,0,.07)', border: 'none',
                cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
              }}
            >
              {currentUser.avatar
                ? <img src={currentUser.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                : <span style={{ fontSize: 20 }}>👤</span>
              }
            </button>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* Activity / Leaderboard tabs */}
          {tab === 'activity' && <MobileActivityView activity={activity} currentUser={currentUser} friends={friends} />}
          {tab === 'leaderboard' && <MobileLeaderboard lists={lists} currentUser={currentUser} friends={friends} />}

          {/* Lists tab */}
          {tab === 'lists' && (
            <div style={{ padding: '16px 16px 160px' }}>
              {!sel && (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#bbb' }}>
                  <div style={{ fontSize: 48, marginBottom: 14 }}>📋</div>
                  <p style={{ fontFamily: "'Lora',serif", fontSize: 18, color: '#999', fontStyle: 'italic', marginBottom: 20 }}>Pick or create a list</p>
                  <button onClick={() => setShowCreate(true)} style={{
                    background: '#111', color: '#fff', border: 'none', borderRadius: 12,
                    padding: '13px 28px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
                    fontSize: 15, fontWeight: 600,
                  }}>+ Create List</button>
                </div>
              )}

              {sel && (
                <>
                  {/* Progress row */}
                  <div style={{ marginBottom: 14 }}>
                    <ProgressBar tasks={sel.tasks} />
                  </div>

                  {/* Tasks */}
                  {sel.tasks.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#bbb' }}>
                      <div style={{ fontSize: 36, marginBottom: 10 }}>🌱</div>
                      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14 }}>Empty list — add your first task!</p>
                    </div>
                  )}

                  {sel.tasks.map(task => (
                    <MobileTaskItem
                      key={task.id} task={task} currentUser={currentUser}
                      onToggle={toggleTask} onDelete={deleteTask}
                      onReact={reactToTask} onOpenDetail={setTaskDetail}
                    />
                  ))}

                  {/* AI Suggest button */}
                  {!showAI && (
                    <button onClick={() => setShowAI(true)} style={{
                      width: '100%', background: 'none',
                      border: '1.5px dashed #ddd', borderRadius: 12, padding: '13px',
                      cursor: 'pointer', color: '#bbb', fontFamily: "'DM Sans',sans-serif",
                      fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: 7, marginTop: 4,
                    }}>✨ AI Suggest for this list</button>
                  )}
                  {showAI && (
                    <Drawer open={showAI} onClose={() => setShowAI(false)} title="✨ AI Suggestions">
                      <AISuggestions
                        listName={sel.name}
                        onClose={() => setShowAI(false)}
                        onAddTask={(text) => {
                          const task = { id: genId(), text, completed: false, completedBy: null, completedAt: null, assignee: null, priority: 'MED', dueDate: null, emoji: '📌', reactions: {}, comments: [], createdBy: currentUser.id, createdAt: ts() };
                          updateList(selId, l => ({ ...l, tasks: [...l.tasks, task] }));
                          pushActivity(currentUser.id, 'added', text, sel.name);
                        }}
                      />
                    </Drawer>
                  )}

                  {/* Delete list */}
                  <button onClick={() => deleteList(sel.id)} style={{
                    width: '100%', background: 'rgba(200,50,50,.06)',
                    border: '1px solid rgba(200,50,50,.15)', borderRadius: 12, padding: '13px',
                    cursor: 'pointer', color: '#c0392b', fontFamily: "'DM Sans',sans-serif",
                    fontSize: 14, marginTop: 10,
                  }}>Delete this list</button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── ADD TASK BAR (fixed above bottom nav, only on lists tab) ── */}
        {tab === 'lists' && sel && (
          <div style={{
            position: 'fixed', bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
            left: 0, right: 0, zIndex: 500,
            padding: '10px 16px',
            background: 'rgba(245,245,244,.96)',
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid rgba(0,0,0,.07)',
          }}>
            {expandAdd && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 9, flexWrap: 'wrap', animation: 'fadeUp .15s ease-out' }}>
                {PRIORITIES.map(p => (
                  <button key={p} onClick={() => setNewPrio(p)} style={{
                    padding: '6px 13px', borderRadius: 99, fontSize: 12, cursor: 'pointer', fontWeight: 600,
                    border: `1.5px solid ${newPrio === p ? P_COLOR[p] : '#ddd'}`,
                    background: newPrio === p ? P_BG[p] : 'transparent',
                    color: newPrio === p ? P_COLOR[p] : '#bbb',
                  }}>{p}</button>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, border: '1.5px solid #ddd', flexShrink: 0 }} />
              <input
                value={newText}
                onChange={e => setNewText(e.target.value)}
                onFocus={() => setExpandAdd(true)}
                onKeyDown={e => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') { setExpandAdd(false); setNewText(''); } }}
                placeholder="Add a task…"
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: '#111',
                }}
              />
              {newText && (
                <button onClick={addTask} style={{
                  background: '#111', color: '#fff', border: 'none', borderRadius: 9,
                  padding: '8px 17px', cursor: 'pointer', fontSize: 14,
                  fontFamily: "'DM Sans',sans-serif", fontWeight: 600, flexShrink: 0,
                }}>Add</button>
              )}
            </div>
          </div>
        )}

        {/* ── BOTTOM NAV ── */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 600,
          background: '#111',
          borderTop: '1px solid rgba(255,255,255,.06)',
          display: 'flex',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>
          {[
            { id: 'lists', icon: '📋', label: 'Lists' },
            { id: 'activity', icon: '⚡', label: 'Activity' },
            { id: 'leaderboard', icon: '🏆', label: 'Rank' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                padding: '12px 0 14px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                color: tab === item.id ? '#fff' : '#444',
                transition: 'color .15s',
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
              <span style={{ fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: tab === item.id ? 600 : 400, letterSpacing: '.01em' }}>
                {item.label}
              </span>
            </button>
          ))}

          {/* Sign out tucked in nav */}
          <button
            onClick={() => signOut(auth)}
            style={{
              flex: 1, background: 'none', border: 'none', cursor: 'pointer',
              padding: '12px 0 14px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              color: '#444',
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>🚪</span>
            <span style={{ fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 400 }}>Out</span>
          </button>
        </div>

      </div>
    </>
  );
}
