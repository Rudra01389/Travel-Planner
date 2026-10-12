import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { profileSchema, password } from "../lib/validation";
import CurrencyPicker from "../components/CurrencyPicker";
export default function Profile() {
  const { user, setUser } = useAuth(),
    navigate = useNavigate();
  const [form, setForm] = useState({
      name: user.name,
      username: user.username || "",
      currency: user.currency || "INR",
      preferences: (user.preferences || []).join("\n"),
      timeZone:
        user.timeZone === "UTC"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : user.timeZone,
    }),
    [current, setCurrent] = useState(""),
    [next, setNext] = useState(""),
    [confirm, setConfirm] = useState(""),
    [deletion, setDeletion] = useState(""),
    [deletePassword, setDeletePassword] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function act(fn) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError(e.issues?.[0]?.message || e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="content profile-page">
      <span className="eyebrow">Your account</span>
      <h1>Make it yours.</h1>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <section className="card feature-card">
        <h2>Profile & travel preferences</h2>
        <p>{user.email} · Verified account</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act(async () => {
              const b = profileSchema.parse({
                ...form,
                username: form.username.trim() || undefined,
                preferences: form.preferences
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              });
              const d = await api("/account", { method: "PATCH", body: b });
              setUser(d.user);
              setMessage("Profile saved.");
            });
          }}
        >
          <fieldset disabled={busy}>
            <label className="field">
              Name
              <input
                required
                minLength={2}
                maxLength={80}
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </label>
            <label className="field">
              Username
              <input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                minLength={3} maxLength={30} pattern="[A-Za-z0-9_]+" autoComplete="username" autoCapitalize="none" spellCheck={false} required={Boolean(user.username)} />
              <small>Choose a unique username to log in with it. Use 3–30 letters, numbers, or underscores.</small>
            </label>
            <CurrencyPicker
              label="Preferred display currency"
              value={form.currency}
              onChange={(currency) => setForm((f) => ({ ...f, currency }))}
            />
            <label className="field">
              Time zone
              <input
                required
                maxLength={80}
                value={form.timeZone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, timeZone: e.target.value }))
                }
              />
            </label>
            <label className="field">
              Travel preferences (one per line)
              <textarea
                maxLength={1500}
                value={form.preferences}
                onChange={(e) =>
                  setForm((f) => ({ ...f, preferences: e.target.value }))
                }
              />
            </label>
            <button className="btn btn-primary">Save profile</button>
          </fieldset>
        </form>
      </section>
      <section className="card feature-card">
        <h2>Change password</h2>
        {user.hasPassword ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              act(async () => {
                password.parse(next);
                if (next !== confirm) throw Error("Passwords do not match");
                const d = await api("/account/password", {
                  method: "POST",
                  body: { currentPassword: current, password: next },
                });
                setCurrent("");
                setNext("");
                setConfirm("");
                setMessage(d.message);
              });
            }}
          >
            <fieldset disabled={busy}>
              <label className="field">
                Current password
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                />
              </label>
              <label className="field">
                New password
                <input
                  required
                  type="password"
                  minLength={10}
                  maxLength={72}
                  autoComplete="new-password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                />
              </label>
              <p className="meta">
                Use uppercase, lowercase, a number, and at least 10 characters.
              </p>
              <label className="field">
                Confirm new password
                <input
                  required
                  type="password"
                  maxLength={72}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </label>
              <button className="btn btn-primary">Change password</button>
            </fieldset>
          </form>
        ) : (
          <p>
            Use Forgot password while signed out to set your first password for
            this Google account.
          </p>
        )}
      </section>
      <section className="card feature-card">
        <h2>Delete account</h2>
        <p>
          This permanently deletes your account and trips you own, including
          saved expenses. Expenses involving you on older shared
          people’s trips must be removed first.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act(async () => {
              await api("/account", {
                method: "DELETE",
                body: {
                  confirmation: deletion,
                  password: deletePassword || undefined,
                },
              });
              setUser(null);
              navigate("/");
            });
          }}
        >
          <fieldset disabled={busy}>
            <label className="field">
              Type DELETE to confirm
              <input
                required
                pattern="DELETE"
                value={deletion}
                onChange={(e) => setDeletion(e.target.value)}
              />
            </label>
            {user.hasPassword ? (
              <label className="field">
                Current password
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                />
              </label>
            ) : (
              <p>
                Sign in with Google again if your current session is more than
                10 minutes old.
              </p>
            )}
            <button className="btn danger">Permanently delete account</button>
          </fieldset>
        </form>
      </section>
    </main>
  );
}
