import { auth, provider } from "./firebase";
import { signInWithPopup } from "firebase/auth";

export default function Login() {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#fafafa', fontFamily: 'Epilogue, sans-serif'
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '48px 40px',
        boxShadow: '0 4px 32px rgba(0,0,0,0.08)', textAlign: 'center',
        maxWidth: 360, width: '90%'
      }}>
        {/* Logo */}
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <h1 style={{
          fontFamily: 'Fraunces, serif', fontSize: 32,
          color: '#0a0a0a', marginBottom: 8
        }}>Checkmate</h1>
        <p style={{
          color: '#888', fontSize: 14, marginBottom: 32
        }}>Shared checklists with friends</p>

        {/* Decorations */}
        <div style={{
          position: 'relative', marginBottom: 32
        }}>
          <div style={{
            display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap'
          }}>
            {['#FFD6E0','#D6E8FF','#D6FFE4','#E8D6FF'].map((c, i) => (
              <div key={i} style={{
                width: 12, height: 12, borderRadius: '50%', background: c
              }}/>
            ))}
          </div>
        </div>

        {/* Login Button */}
        <button onClick={handleLogin} style={{
          width: '100%', padding: '14px 0', borderRadius: 12,
          background: '#0a0a0a', color: '#fafafa', border: 'none',
          fontSize: 15, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'Epilogue, sans-serif', display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: 10
        }}>
          <img
            src="https://www.google.com/favicon.ico"
            width={18} height={18}
            alt="Google"
          />
          Continue with Google
        </button>
      </div>
    </div>
  );
}