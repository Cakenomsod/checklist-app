import { useState } from "react";
import { db } from "./firebase";
import {
  collection, query, where, getDocs,
  doc, setDoc, onSnapshot, deleteDoc
} from "firebase/firestore";
import { useEffect } from "react";

// ── ค้นหา user ด้วยชื่อ ──────────────────────────────────────────────────────
export function useFriends(uid) {
  const [friends, setFriends] = useState([]);
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      collection(db, "users", uid, "friends"),
      (snap) => setFriends(snap.docs.map(d => d.data()))
    );
    return () => unsub();
  }, [uid]);
  return friends;
}

export async function searchUsersByName(name, currentUid) {
  const snap = await getDocs(collection(db, "users"));
  const lower = name.toLowerCase();
  return snap.docs
    .map(d => d.data())
    .filter(u => u.uid !== currentUid && u.name?.toLowerCase().includes(lower));
}

export async function addFriend(currentUid, friendData) {
  await setDoc(doc(db, "users", currentUid, "friends", friendData.uid), friendData);
}

export async function removeFriend(currentUid, friendUid) {
  await deleteDoc(doc(db, "users", currentUid, "friends", friendUid));
}

// ── Friend Panel Component ────────────────────────────────────────────────────
export default function FriendPanel({ currentUser, dark, onClose }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const friends = useFriends(currentUser.id);

  const txt = dark ? '#f0f0f0' : '#0a0a0a';
  const bg = dark ? '#1a1a1a' : '#fff';
  const bdr = dark ? '#2a2a2a' : '#efefef';
  const muted = dark ? '#666' : '#aaa';

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    const res = await searchUsersByName(search.trim(), currentUser.id);
    setResults(res);
    setLoading(false);
  };

  const isFriend = (uid) => friends.some(f => f.uid === uid);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16
    }}>
      <div style={{
        background: bg, borderRadius: 20, padding: 28,
        width: '100%', maxWidth: 420, maxHeight: '80vh',
        overflow: 'auto', position: 'relative'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Fraunces,serif', fontSize: 22, color: txt, margin: 0 }}>Friends</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 20,
            cursor: 'pointer', color: muted
          }}>✕</button>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="ค้นหาด้วยชื่อ..."
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 10,
              border: `1.5px solid ${bdr}`, background: dark ? '#252525' : '#f5f5f5',
              color: txt, fontFamily: 'Epilogue,sans-serif', fontSize: 14, outline: 'none'
            }}
          />
          <button onClick={handleSearch} style={{
            background: '#0a0a0a', color: '#fafafa', border: 'none',
            borderRadius: 10, padding: '10px 16px', cursor: 'pointer',
            fontFamily: 'Epilogue,sans-serif', fontSize: 13, fontWeight: 600
          }}>
            {loading ? '...' : 'Search'}
          </button>
        </div>

        {/* Search Results */}
        {results.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: muted, letterSpacing: '.08em', marginBottom: 8 }}>
              RESULTS
            </div>
            {results.map(u => (
              <div key={u.uid} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0', borderBottom: `1px solid ${bdr}`
              }}>
                {u.avatar
                  ? <img src={u.avatar} style={{ width: 36, height: 36, borderRadius: '50%' }} alt="" />
                  : <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#D6E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤</div>
                }
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: txt }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: muted }}>{u.email}</div>
                </div>
                {isFriend(u.uid) ? (
                  <span style={{ fontSize: 12, color: '#2f8a55', fontWeight: 600 }}>✓ Added</span>
                ) : (
                  <button onClick={() => addFriend(currentUser.id, u)} style={{
                    background: '#0a0a0a', color: '#fafafa', border: 'none',
                    borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
                    fontFamily: 'Epilogue,sans-serif', fontSize: 12, fontWeight: 600
                  }}>Add</button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Friends List */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: muted, letterSpacing: '.08em', marginBottom: 8 }}>
            MY FRIENDS ({friends.length})
          </div>
          {friends.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: muted, fontSize: 13 }}>
              ยังไม่เจอ เพื่อน ค้นหาด้วยชื่อด้านบนได้เลย
            </div>
          )}
          {friends.map(f => (
            <div key={f.uid} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 0', borderBottom: `1px solid ${bdr}`
            }}>
              {f.avatar
                ? <img src={f.avatar} style={{ width: 36, height: 36, borderRadius: '50%' }} alt="" />
                : <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#D6E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤</div>
              }
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: txt }}>{f.name}</div>
                <div style={{ fontSize: 11, color: muted }}>{f.email}</div>
              </div>
              <button onClick={() => removeFriend(currentUser.id, f.uid)} style={{
                background: 'rgba(200,50,50,.1)', color: '#c0392b', border: 'none',
                borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                fontFamily: 'Epilogue,sans-serif', fontSize: 12
              }}>Remove</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}