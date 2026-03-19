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

// ── Friend Panel Component ────────────────────────────────────────────────────

export default function FriendPanel({ currentUser, dark, onClose }) {
  const [tab, setTab] = useState('friends'); // 'friends' | 'search' | 'requests'
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState(new Set());

  const friends = useFriends(currentUser.id);
  const requests = useFriendRequests(currentUser.id);

  const txt = dark ? '#f0f0f0' : '#0a0a0a';
  const bg = dark ? '#1a1a1a' : '#fff';
  const bdr = dark ? '#2a2a2a' : '#efefef';
  const muted = dark ? '#666' : '#aaa';
  const surface = dark ? '#252525' : '#f5f5f5';

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    const res = await searchUsersByName(search.trim(), currentUser.id);
    setResults(res);
    setLoading(false);
  };

  const isFriend = (uid) => friends.some(f => f.uid === uid);
  const hasSentRequest = (uid) => sentRequests.has(uid);

  const handleSendRequest = async (user) => {
    await sendFriendRequest(currentUser, user);
    setSentRequests(prev => new Set([...prev, user.uid]));
  };

  const TABS = [
    { id: 'friends', label: `Friends (${friends.length})` },
    { id: 'requests', label: `Requests${requests.length > 0 ? ` 🔴${requests.length}` : ''}` },
    { id: 'search', label: 'Search' },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: bg, borderRadius: 20, padding: 28,
          width: '100%', maxWidth: 440, maxHeight: '82vh',
          overflow: 'auto', position: 'relative'
        }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ fontFamily: 'Fraunces,serif', fontSize: 22, color: txt, margin: 0 }}>Friends</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: muted }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, background: surface, borderRadius: 10, padding: 4 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: tab === t.id ? (dark ? '#333' : '#fff') : 'transparent',
              color: tab === t.id ? txt : muted,
              fontFamily: 'Epilogue,sans-serif', fontSize: 12, fontWeight: tab === t.id ? 600 : 400,
              boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,.08)' : 'none'
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── Tab: Friends ── */}
        {tab === 'friends' && (
          <div>
            {friends.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: muted, fontSize: 13 }}>
                ยังไม่มี friend ลองค้นหาได้ที่แท็บ Search ครับ
              </div>
            )}
            {friends.map(f => (
              <div key={f.uid} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0', borderBottom: `1px solid ${bdr}`
              }}>
                {f.avatar
                  ? <img src={f.avatar} style={{ width: 38, height: 38, borderRadius: '50%' }} alt="" />
                  : <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#D6E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤</div>
                }
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: txt }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: muted }}>{f.email}</div>
                </div>
                <button onClick={() => removeFriend(currentUser.id, f.uid)} style={{
                  background: 'rgba(200,50,50,.1)', color: '#c0392b', border: 'none',
                  borderRadius: 8, padding: '5px 11px', cursor: 'pointer',
                  fontFamily: 'Epilogue,sans-serif', fontSize: 12
                }}>Remove</button>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab: Requests ── */}
        {tab === 'requests' && (
          <div>
            {requests.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: muted, fontSize: 13 }}>
                ไม่มี friend request ตอนนี้ครับ
              </div>
            )}
            {requests.map(r => (
              <div key={r.uid} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px', borderRadius: 12, marginBottom: 8,
                background: surface, border: `1px solid ${bdr}`
              }}>
                {r.avatar
                  ? <img src={r.avatar} style={{ width: 38, height: 38, borderRadius: '50%' }} alt="" />
                  : <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#D6E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤</div>
                }
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: txt }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: muted }}>ส่ง friend request มา</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => acceptFriendRequest(currentUser, r)} style={{
                    background: '#0a0a0a', color: '#fafafa', border: 'none',
                    borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                    fontFamily: 'Epilogue,sans-serif', fontSize: 12, fontWeight: 600
                  }}>✓ Accept</button>
                  <button onClick={() => declineFriendRequest(currentUser.id, r.uid)} style={{
                    background: 'rgba(200,50,50,.1)', color: '#c0392b', border: 'none',
                    borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                    fontFamily: 'Epilogue,sans-serif', fontSize: 12
                  }}>✕ Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab: Search ── */}
        {tab === 'search' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="ค้นหาด้วยชื่อ..."
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 10,
                  border: `1.5px solid ${bdr}`, background: surface,
                  color: txt, fontFamily: 'Epilogue,sans-serif', fontSize: 14, outline: 'none'
                }}
              />
              <button onClick={handleSearch} style={{
                background: '#0a0a0a', color: '#fafafa', border: 'none',
                borderRadius: 10, padding: '10px 16px', cursor: 'pointer',
                fontFamily: 'Epilogue,sans-serif', fontSize: 13, fontWeight: 600
              }}>{loading ? '...' : 'Search'}</button>
            </div>

            {results.map(u => (
              <div key={u.uid} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0', borderBottom: `1px solid ${bdr}`
              }}>
                {u.avatar
                  ? <img src={u.avatar} style={{ width: 36, height: 36, borderRadius: '50%' }} alt="" />
                  : <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#D6E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👤</div>
                }
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: txt }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: muted }}>{u.email}</div>
                </div>
                {isFriend(u.uid) ? (
                  <span style={{ fontSize: 12, color: '#2f8a55', fontWeight: 600 }}>✓ Friend</span>
                ) : hasSentRequest(u.uid) ? (
                  <span style={{ fontSize: 12, color: muted }}>Sent ✓</span>
                ) : (
                  <button onClick={() => handleSendRequest(u)} style={{
                    background: '#0a0a0a', color: '#fafafa', border: 'none',
                    borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
                    fontFamily: 'Epilogue,sans-serif', fontSize: 12, fontWeight: 600
                  }}>Add</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}