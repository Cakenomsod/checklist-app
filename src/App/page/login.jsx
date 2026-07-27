import { useState } from "react";
import { auth, provider } from "../../firebase";
import { signInWithPopup } from "firebase/auth";

const PASTELS = ["#FFD6E0", "#D6E8FF", "#D6FFE4", "#E8D6FF"];

function loginErrorMessage(err) {
  const code = err?.code || "";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return "Sign-in cancelled. Try again when you're ready.";
  }
  if (code === "auth/popup-blocked") {
    return "Pop-up blocked. Allow pop-ups for this site, then try again.";
  }
  if (code === "auth/network-request-failed") {
    return "Network error. Check your connection and try again.";
  }
  return "Couldn't sign in. Please try again.";
}

export default function Login() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      setError(loginErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="cm-login-root">
      <style>{`
        .cm-login-root {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          padding-bottom: max(24px, env(safe-area-inset-bottom));
          background:
            radial-gradient(ellipse 80% 60% at 50% 0%, #FFF3D6 0%, transparent 55%),
            radial-gradient(ellipse 70% 50% at 100% 100%, #D6E8FF 0%, transparent 50%),
            radial-gradient(ellipse 60% 45% at 0% 100%, #FFD6E0 0%, transparent 45%),
            #fafafa;
          font-family: 'DM Sans', system-ui, sans-serif;
          box-sizing: border-box;
        }
        .cm-login-btn {
          width: 100%;
          min-height: 48px;
          padding: 14px 16px;
          border-radius: 12px;
          background: #111111;
          color: #fafafa;
          border: none;
          font-weight: 600;
          cursor: pointer;
          font-family: 'DM Sans', system-ui, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: background 160ms ease, transform 160ms ease, opacity 160ms ease;
        }
        .cm-login-btn:hover:not(:disabled) {
          background: #2a2a2a;
        }
        .cm-login-btn:active:not(:disabled) {
          transform: scale(0.985);
        }
        .cm-login-btn:focus {
          outline: none;
        }
        .cm-login-btn:focus-visible {
          outline: 2px solid #111111;
          outline-offset: 3px;
        }
        .cm-login-btn:disabled {
          opacity: 0.65;
          cursor: wait;
        }
        @media (prefers-reduced-motion: reduce) {
          .cm-login-btn {
            transition: none;
          }
          .cm-login-btn:active:not(:disabled) {
            transform: none;
          }
        }
      `}</style>

      <main
        style={{
          background: "#ffffff",
          borderRadius: 20,
          padding: "44px 36px 40px",
          boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
          textAlign: "center",
          maxWidth: 360,
          width: "100%",
          boxSizing: "border-box",
        }}
        aria-labelledby="cm-login-title"
      >
        <h1
          id="cm-login-title"
          style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: 34,
            fontWeight: 600,
            fontStyle: "italic",
            color: "#0a0a0a",
            margin: "0 0 10px",
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
          }}
        >
          Checkmate
        </h1>
        <p
          style={{
            color: "#0a0a0a",
            opacity: 0.62,
            fontSize: 14,
            lineHeight: 1.45,
            margin: "0 0 28px",
          }}
        >
          Shared checklists with friends
        </p>

        <div
          aria-hidden="true"
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          {PASTELS.map((c) => (
            <span
              key={c}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: c,
                display: "block",
              }}
            />
          ))}
        </div>

        <button
          type="button"
          className="cm-login-btn"
          onClick={handleLogin}
          disabled={busy}
          aria-busy={busy}
          aria-label={busy ? "Signing in with Google" : "Continue with Google"}
        >
          <img
            src="https://www.google.com/favicon.ico"
            width={18}
            height={18}
            alt=""
            aria-hidden="true"
            style={{ flexShrink: 0 }}
          />
          {busy ? "Signing in…" : "Continue with Google"}
        </button>

        {error ? (
          <p
            role="alert"
            style={{
              margin: "16px 0 0",
              padding: "10px 12px",
              borderRadius: 10,
              background: "#FFECEC",
              color: "#c0392b",
              fontSize: 13,
              lineHeight: 1.4,
              textAlign: "left",
            }}
          >
            {error}
          </p>
        ) : null}
      </main>
    </div>
  );
}
