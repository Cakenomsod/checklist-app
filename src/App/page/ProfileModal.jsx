import { useEffect, useId, useRef, useState } from "react";
import { auth, db } from "../../firebase";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";

/** Profile photo from the signed-in Google account (Firebase Auth photoURL). */
function googleAvatar(user) {
  return auth.currentUser?.photoURL || user?.avatar || "";
}

export default function ProfileModal({ currentUser, dark, onClose, onUpdate }) {
  const [name, setName] = useState(currentUser.name || "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [nameFocused, setNameFocused] = useState(false);
  const dialogRef = useRef(null);
  const nameId = useId();
  const titleId = useId();

  const txt = dark ? "#efefef" : "#0a0a0a";
  const bg = dark ? "#1e1e1e" : "#ffffff";
  const bdr = dark ? "#2c2c2c" : "#e8e8e8";
  const muted = "#888888";
  const surface = dark ? "#252525" : "#f8f8f8";
  const ink = "#0a0a0a";
  const paper = "#fafafa";
  const success = "#2f8a55";
  const danger = "#c0392b";
  const avatarPastel = "#D6E8FF";

  const avatarUrl = googleAvatar(currentUser);
  const trimmed = name.trim();
  const dirty = trimmed !== (currentUser.name || "").trim();
  const canSave = Boolean(trimmed) && dirty && !loading;

  const initials = (currentUser.name || currentUser.email || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const focusable = dialogRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [onClose]);

  const handleSave = async () => {
    if (!trimmed || !dirty || loading) return;
    setLoading(true);
    setError("");
    try {
      await updateProfile(auth.currentUser, { displayName: trimmed });
      await updateDoc(doc(db, "users", currentUser.id), {
        name: trimmed,
        avatar: avatarUrl,
      });
      onUpdate({ ...currentUser, name: trimmed, avatar: avatarUrl });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
      setError("Couldn’t save profile. Check your connection and try again.");
    }
    setLoading(false);
  };

  const focusRing = dark
    ? "0 0 0 3px rgba(239,239,239,0.16)"
    : "0 0 0 3px rgba(10,10,10,0.10)";

  return (
    <div
      onClick={() => !loading && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: bg,
          borderRadius: 20,
          padding: "24px 24px 20px",
          width: "100%",
          maxWidth: 380,
          border: `1px solid ${bdr}`,
          boxShadow: dark
            ? "0 4px 32px rgba(0,0,0,0.45)"
            : "0 4px 32px rgba(0,0,0,0.08)",
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h2
            id={titleId}
            style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: 22,
              fontWeight: 600,
              color: txt,
              margin: 0,
              fontStyle: "italic",
              letterSpacing: "-0.02em",
            }}
          >
            Profile
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close profile"
            style={{
              background: dark ? "#2c2c2c" : "#f8f8f8",
              border: `1px solid ${bdr}`,
              borderRadius: "50%",
              width: 32,
              height: 32,
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: 15,
              color: muted,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
              flexShrink: 0,
              opacity: loading ? 0.55 : 1,
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 24,
            gap: 8,
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={currentUser.name || "Profile photo"}
              style={{
                width: 88,
                height: 88,
                borderRadius: "50%",
                objectFit: "cover",
                border: `2px solid ${bdr}`,
                display: "block",
                background: surface,
              }}
            />
          ) : (
            <div
              aria-hidden="true"
              style={{
                width: 88,
                height: 88,
                borderRadius: "50%",
                background: avatarPastel,
                color: ink,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Lora', Georgia, serif",
                fontStyle: "italic",
                fontSize: 28,
                fontWeight: 600,
                border: `2px solid ${bdr}`,
              }}
            >
              {initials}
            </div>
          )}
          <div
            style={{
              fontSize: 13,
              color: muted,
              textAlign: "center",
              wordBreak: "break-all",
              lineHeight: 1.4,
              maxWidth: "100%",
            }}
          >
            {currentUser.email}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: muted,
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            รูปโปรไฟล์จากบัญชี Google ของคุณ
          </p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label
            htmlFor={nameId}
            style={{
              display: "block",
              fontSize: 10,
              fontWeight: 600,
              color: muted,
              letterSpacing: "0.08em",
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            Display name
          </label>
          <input
            id={nameId}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && canSave && handleSave()}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            disabled={loading}
            autoComplete="name"
            aria-invalid={Boolean(error) || (!trimmed && name.length > 0)}
            aria-describedby={error ? `${nameId}-error` : undefined}
            placeholder="Your name"
            style={{
              width: "100%",
              padding: "11px 14px",
              borderRadius: 9,
              border: `1px solid ${nameFocused ? (dark ? "#efefef" : ink) : bdr}`,
              background: surface,
              color: txt,
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
              boxShadow: nameFocused ? focusRing : "none",
              transition: "border-color .15s ease, box-shadow .15s ease",
              opacity: loading ? 0.7 : 1,
            }}
          />
          {error ? (
            <p
              id={`${nameId}-error`}
              role="alert"
              style={{
                margin: "8px 0 0",
                fontSize: 12,
                color: danger,
                lineHeight: 1.4,
              }}
            >
              {error}
            </p>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: "11px 14px",
              borderRadius: 10,
              background: "transparent",
              color: txt,
              border: `1px solid ${bdr}`,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: 14,
              fontWeight: 600,
              opacity: loading ? 0.55 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            aria-busy={loading}
            style={{
              flex: 1.35,
              padding: "11px 14px",
              borderRadius: 10,
              background: saved ? success : ink,
              color: paper,
              border: "none",
              cursor: canSave || saved ? "pointer" : "not-allowed",
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.01em",
              opacity: canSave || saved || loading ? 1 : 0.45,
              transition: "background .2s ease, opacity .15s ease",
            }}
          >
            {loading ? "Saving…" : saved ? "Saved" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
