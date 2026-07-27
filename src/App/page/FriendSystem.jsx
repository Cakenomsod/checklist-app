import { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection, doc, setDoc, onSnapshot,
  deleteDoc, getDocs, serverTimestamp
} from "firebase/firestore";

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useFriends(uid) {
  const [friends, setFriends] = useState([]);
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      collection(db, "users", uid, "friends"),
      snap => setFriends(snap.docs.map(d => d.data()))
    );
    return () => unsub();
  }, [uid]);
  return friends;
}

export function useFriendRequests(uid) {
  const [requests, setRequests] = useState([]);
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      collection(db, "users", uid, "friendRequests"),
      snap => setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [uid]);
  return requests;
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function sendFriendRequest(currentUser, targetUser) {
  // เก็บ request ไว้ที่ฝั่ง target
  await setDoc(
    doc(db, "users", targetUser.uid, "friendRequests", currentUser.id),
    {
      uid: currentUser.id,
      name: currentUser.name,
      avatar: currentUser.avatar,
      email: currentUser.email,
      sentAt: serverTimestamp(),
    }
  );
}

export async function acceptFriendRequest(currentUser, requester) {
  try {
    // เพิ่ม friend ทั้ง 2 ฝั่งพร้อมกัน
    await Promise.all([
      setDoc(doc(db, "users", currentUser.id, "friends", requester.uid), {
        uid: requester.uid,
        name: requester.name,
        avatar: requester.avatar || '',
        email: requester.email || '',
      }),
      setDoc(doc(db, "users", requester.uid, "friends", currentUser.id), {
        uid: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar || '',
        email: currentUser.email || '',
      }),
      // ลบ request ทิ้ง
      deleteDoc(doc(db, "users", currentUser.id, "friendRequests", requester.uid)),
    ]);
  } catch (err) {
    console.error("Accept friend error:", err);
    throw err;
  }
}

export async function declineFriendRequest(currentUid, requesterUid) {
  await deleteDoc(doc(db, "users", currentUid, "friendRequests", requesterUid));
}

export async function removeFriend(currentUid, friendUid) {
  await deleteDoc(doc(db, "users", currentUid, "friends", friendUid));
  await deleteDoc(doc(db, "users", friendUid, "friends", currentUid));
}

export async function searchUsersByName(name, currentUid) {
  const snap = await getDocs(collection(db, "users"));
  const lower = name.toLowerCase();
  return snap.docs
    .map(d => d.data())
    .filter(u => u.uid !== currentUid && u.name?.toLowerCase().includes(lower));
}

// ── Theme tokens (DESIGN.md) ──────────────────────────────────────────────────

function useFriendTheme(dark) {
  return {
    txt: dark ? '#efefef' : '#0a0a0a',
    bg: dark ? '#1e1e1e' : '#ffffff',
    bdr: dark ? '#2c2c2c' : '#e8e8e8',
    muted: dark ? '#aaaaaa' : '#888888',
    surface: dark ? '#111111' : '#f8f8f8',
    tabActive: dark ? '#2c2c2c' : '#ffffff',
    primaryBg: '#111111',
    primaryFg: '#fafafa',
    danger: '#c0392b',
    dangerBg: '#FFECEC',
    success: '#2f8a55',
    pastel: '#D6E8FF',
    inkSoft: dark ? '#efefef' : '#111111',
  };
}

function initials(name) {
  const parts = (name || '?').trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() || '').join('') || '?';
}

function Avatar({ src, name, size = 40, pastel }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      aria-hidden
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: pastel, color: '#0a0a0a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        fontSize: size * 0.36, fontWeight: 600, letterSpacing: '0.02em',
      }}
    >
      {initials(name)}
    </div>
  );
}

function EmptyState({ title, body, actionLabel, onAction, muted, txt }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 16px 32px' }}>
      <div style={{
        fontFamily: "'DM Sans', system-ui, sans-serif",
        fontSize: 14, fontWeight: 600, color: txt, marginBottom: 6,
      }}>
        {title}
      </div>
      <div style={{
        fontFamily: "'DM Sans', system-ui, sans-serif",
        fontSize: 13, color: muted, lineHeight: 1.45, maxWidth: 260, margin: '0 auto',
      }}>
        {body}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          className="cm-fp-btn cm-fp-btn-ghost"
          onClick={onAction}
          style={{
            marginTop: 16, minHeight: 40, padding: '0 16px',
            borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'transparent', color: txt,
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: 13, fontWeight: 600,
            textDecoration: 'underline', textUnderlineOffset: 3,
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ── Friend Panel Component ────────────────────────────────────────────────────

export default function FriendPanel({ currentUser, dark, onClose }) {
  const [tab, setTab] = useState('friends'); // 'friends' | 'search' | 'requests'
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [sentRequests, setSentRequests] = useState(new Set());

  const friends = useFriends(currentUser.id);
  const requests = useFriendRequests(currentUser.id);
  const t = useFriendTheme(dark);

  const handleSearch = async () => {
    if (!search.trim() || loading) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await searchUsersByName(search.trim(), currentUser.id);
      setResults(res);
    } finally {
      setLoading(false);
    }
  };

  const isFriend = (uid) => friends.some(f => f.uid === uid);
  const hasSentRequest = (uid) => sentRequests.has(uid);

  const handleSendRequest = async (user) => {
    await sendFriendRequest(currentUser, user);
    setSentRequests(prev => new Set([...prev, user.uid]));
  };

  const TABS = [
    { id: 'friends', label: 'Friends', count: friends.length },
    { id: 'requests', label: 'Requests', count: requests.length, badge: requests.length > 0 },
    { id: 'search', label: 'Search' },
  ];

  const focusRing = dark ? '#efefef' : '#0a0a0a';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
    >
      <style>{`
        .cm-friend-panel button:focus-visible,
        .cm-friend-panel input:focus-visible {
          outline: 2px solid ${focusRing};
          outline-offset: 2px;
        }
        .cm-fp-btn {
          transition: background-color .15s ease-out, color .15s ease-out, opacity .15s ease-out, box-shadow .15s ease-out;
        }
        .cm-fp-btn:hover:not(:disabled) { opacity: 0.92; }
        .cm-fp-btn:active:not(:disabled) { opacity: 0.85; }
        .cm-fp-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .cm-fp-btn-primary:hover:not(:disabled) { background: #0a0a0a !important; opacity: 1; }
        .cm-fp-btn-danger:hover:not(:disabled) { background: #FFECEC !important; filter: brightness(0.97); opacity: 1; }
        .cm-fp-btn-ghost:hover:not(:disabled) { opacity: 0.7; }
        .cm-fp-row:hover { background: ${dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}; }
        .cm-fp-tab:hover:not([aria-selected="true"]) { color: ${t.txt} !important; }
        .cm-fp-input:focus { border-color: ${t.txt} !important; }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cm-friends-title"
        className="cm-friend-panel"
        onClick={e => e.stopPropagation()}
        style={{
          background: t.bg,
          borderRadius: 20,
          padding: '24px 24px 20px',
          width: '100%',
          maxWidth: 440,
          maxHeight: '82vh',
          overflow: 'auto',
          position: 'relative',
          border: `1px solid ${t.bdr}`,
          boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 20,
        }}>
          <h2
            id="cm-friends-title"
            style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: 22, color: t.txt, margin: 0, fontStyle: 'italic', fontWeight: 600,
            }}
          >
            Friends
          </h2>
          <button
            type="button"
            className="cm-fp-btn cm-fp-btn-ghost"
            onClick={onClose}
            aria-label="Close friends"
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: t.muted, fontSize: 18, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs — segmented control */}
        <div
          role="tablist"
          aria-label="Friends sections"
          style={{
            display: 'flex', gap: 4, marginBottom: 20,
            background: t.surface, borderRadius: 10, padding: 4,
          }}
        >
          {TABS.map(tabItem => {
            const selected = tab === tabItem.id;
            return (
              <button
                key={tabItem.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className="cm-fp-btn cm-fp-tab"
                onClick={() => setTab(tabItem.id)}
                style={{
                  flex: 1,
                  minHeight: 36,
                  padding: '6px 8px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  background: selected ? t.tabActive : 'transparent',
                  color: selected ? t.txt : t.muted,
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  fontSize: 12,
                  fontWeight: selected ? 600 : 400,
                  boxShadow: selected ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <span>{tabItem.label}</span>
                {typeof tabItem.count === 'number' && tabItem.id === 'friends' && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: selected ? t.txt : t.muted,
                    opacity: 0.75,
                  }}>
                    {tabItem.count}
                  </span>
                )}
                {tabItem.badge && (
                  <span style={{
                    minWidth: 18, height: 18, padding: '0 5px', borderRadius: 99,
                    background: t.danger, color: '#ffffff',
                    fontSize: 10, fontWeight: 700, lineHeight: '18px',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {tabItem.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Tab: Friends ── */}
        {tab === 'friends' && (
          <div role="tabpanel">
            {friends.length === 0 ? (
              <EmptyState
                title="No friends yet"
                body="Find people by name and send a request to start sharing lists."
                actionLabel="Go to Search"
                onAction={() => setTab('search')}
                muted={t.muted}
                txt={t.txt}
              />
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {friends.map(f => (
                  <li
                    key={f.uid}
                    className="cm-fp-row"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 8px', margin: '0 -8px',
                      borderBottom: `1px solid ${t.bdr}`,
                      borderRadius: 8,
                    }}
                  >
                    <Avatar src={f.avatar} name={f.name} pastel={t.pastel} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600, fontSize: 14, color: t.txt,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {f.name}
                      </div>
                      {f.email ? (
                        <div style={{
                          fontSize: 12, color: t.muted, marginTop: 2,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {f.email}
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="cm-fp-btn cm-fp-btn-danger"
                      onClick={() => removeFriend(currentUser.id, f.uid)}
                      aria-label={`Remove ${f.name}`}
                      style={{
                        background: t.dangerBg, color: t.danger, border: 'none',
                        borderRadius: 8, minHeight: 36, padding: '0 12px', cursor: 'pointer',
                        fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 12, fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Tab: Requests ── */}
        {tab === 'requests' && (
          <div role="tabpanel">
            {requests.length === 0 ? (
              <EmptyState
                title="No pending requests"
                body="When someone wants to connect, their invite will show up here."
                muted={t.muted}
                txt={t.txt}
              />
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {requests.map(r => (
                  <li
                    key={r.uid}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: 12, borderRadius: 12,
                      background: t.surface, border: `1px solid ${t.bdr}`,
                    }}
                  >
                    <Avatar src={r.avatar} name={r.name} pastel={t.pastel} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600, fontSize: 14, color: t.txt,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {r.name}
                      </div>
                      <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>
                        Wants to be friends
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="cm-fp-btn cm-fp-btn-primary"
                        onClick={() => acceptFriendRequest(currentUser, r)}
                        style={{
                          background: t.primaryBg, color: t.primaryFg, border: 'none',
                          borderRadius: 8, minHeight: 36, padding: '0 12px', cursor: 'pointer',
                          fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 12, fontWeight: 600,
                        }}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="cm-fp-btn cm-fp-btn-danger"
                        onClick={() => declineFriendRequest(currentUser.id, r.uid)}
                        style={{
                          background: t.dangerBg, color: t.danger, border: 'none',
                          borderRadius: 8, minHeight: 36, padding: '0 12px', cursor: 'pointer',
                          fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 12, fontWeight: 600,
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Tab: Search ── */}
        {tab === 'search' && (
          <div role="tabpanel">
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  if (!e.target.value.trim()) {
                    setResults([]);
                    setHasSearched(false);
                  }
                }}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search by name…"
                aria-label="Search users by name"
                className="cm-fp-input"
                style={{
                  flex: 1, minHeight: 44, padding: '0 14px', borderRadius: 10,
                  border: `1px solid ${t.bdr}`, background: t.surface,
                  color: t.txt, fontFamily: "'DM Sans', system-ui, sans-serif",
                  fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color .15s ease-out',
                }}
              />
              <button
                type="button"
                className="cm-fp-btn cm-fp-btn-primary"
                onClick={handleSearch}
                disabled={!search.trim() || loading}
                style={{
                  background: t.primaryBg, color: t.primaryFg, border: 'none',
                  borderRadius: 10, minHeight: 44, padding: '0 16px', cursor: 'pointer',
                  fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 13, fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {loading ? 'Searching…' : 'Search'}
              </button>
            </div>

            {!hasSearched && !loading && (
              <EmptyState
                title="Find friends"
                body="Enter a name above to look up people on Checkmate."
                muted={t.muted}
                txt={t.txt}
              />
            )}

            {hasSearched && !loading && results.length === 0 && (
              <EmptyState
                title="No matches"
                body="Try a different name spelling, or ask them to join Checkmate first."
                muted={t.muted}
                txt={t.txt}
              />
            )}

            {results.length > 0 && (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {results.map(u => (
                  <li
                    key={u.uid}
                    className="cm-fp-row"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 8px', margin: '0 -8px',
                      borderBottom: `1px solid ${t.bdr}`,
                      borderRadius: 8,
                    }}
                  >
                    <Avatar src={u.avatar} name={u.name} size={36} pastel={t.pastel} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600, fontSize: 14, color: t.txt,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {u.name}
                      </div>
                      {u.email ? (
                        <div style={{
                          fontSize: 12, color: t.muted, marginTop: 2,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {u.email}
                        </div>
                      ) : null}
                    </div>
                    {isFriend(u.uid) ? (
                      <span style={{
                        fontSize: 12, color: t.success, fontWeight: 600,
                        padding: '0 4px', flexShrink: 0,
                      }}>
                        Friends
                      </span>
                    ) : hasSentRequest(u.uid) ? (
                      <span style={{
                        fontSize: 12, color: t.muted, fontWeight: 500,
                        padding: '0 4px', flexShrink: 0,
                      }}>
                        Request sent
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="cm-fp-btn cm-fp-btn-primary"
                        onClick={() => handleSendRequest(u)}
                        style={{
                          background: t.primaryBg, color: t.primaryFg, border: 'none',
                          borderRadius: 8, minHeight: 36, padding: '0 14px', cursor: 'pointer',
                          fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 12, fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        Add friend
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
