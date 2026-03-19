import { useState } from "react";
import { auth } from "../firebase";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function ProfileModal({ currentUser, dark, onClose, onUpdate }) {
  const [name, setName] = useState(currentUser.name || '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const txt = dark ? '#f0f0f0' : '#0a0a0a';
  const bg = dark ? '#1a1a1a' : '#fff';
  const bdr = dark ? '#2a2a2a' : '#efefef';
  const muted = dark ? '#666' : '#aaa';
  const surface = dark ? '#252525' : '#f5f5f5';

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      // อัพเดทชื่อใน Firebase Auth
      await updateProfile(auth.currentUser, {
        displayName: name.trim(),
      });
      // อัพเดทชื่อใน Firestore
      await updateDoc(doc(db, "users", currentUser.id), {
        name: name.trim(),
      });
      onUpdate({ ...currentUser, name: name.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

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
          width: '100%', maxWidth: 380,
        }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Fraunces,serif', fontSize: 22, color: txt, margin: 0 }}>Profile</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: muted }}>✕</button>
        </div>

        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            {currentUser.avatar
              ? <img src={currentUser.avatar} style={{ width: 80, height: 80, borderRadius: '50%', border: `3px solid ${bdr}` }} alt="" />
              : <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#D6E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>👤</div>
            }
            {/* ปุ่ม Upload รูป (ทำ UI ไว้ก่อน) */}
            <button style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 26, height: 26, borderRadius: '50%',
              background: '#0a0a0a', color: '#fafafa',
              border: '2px solid #fff', fontSize: 12,
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}
              onClick={() => alert('ฟีเจอร์อัพโหลดรูปจะมาเร็วๆ นี้ครับ 🙏')}
            >
              📷
            </button>
          </div>
          <div style={{ fontSize: 12, color: muted, fontFamily: 'Epilogue,sans-serif' }}>
            {currentUser.email}
          </div>
        </div>

        {/* Name */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: muted, letterSpacing: '.08em', marginBottom: 6, fontFamily: 'Epilogue,sans-serif' }}>
            DISPLAY NAME
          </div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: `1.5px solid ${bdr}`, background: surface,
              color: txt, fontFamily: 'Epilogue,sans-serif',
              fontSize: 14, outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Decorative dots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
          {['#FFD6E0', '#D6E8FF', '#D6FFE4', '#E8D6FF'].map((c, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
          ))}
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            width: '100%', padding: '12px', borderRadius: 12,
            background: saved ? '#2f8a55' : '#0a0a0a',
            color: '#fafafa', border: 'none', cursor: 'pointer',
            fontFamily: 'Epilogue,sans-serif', fontSize: 15,
            fontWeight: 600, transition: 'background .3s'
          }}>
          {loading ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
        </button>

      </div>
    </div>
  );
}