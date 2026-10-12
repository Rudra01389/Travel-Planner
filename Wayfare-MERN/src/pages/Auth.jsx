import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import {
  registration,
  loginSchema,
  verification,
  password,
  email,
} from "../lib/validation";
import { useAuth } from "../context/AuthContext";
export default function Auth({ mode }) {
  const { user, setUser } = useAuth(),
    navigate = useNavigate();
  const [step, setStep] = useState("details"),
    [form, setForm] = useState({
      name: "",
      email: "",
      password: "",
      confirm: "",
      code: "",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [cooldown, setCooldown] = useState(0),
    [expiresAt, setExpiresAt] = useState(0),
    [google, setGoogle] = useState(false);
  useEffect(() => {
    api("/config")
      .then((d) => setGoogle(d.googleEnabled))
      .catch(() => {});
    if (new URLSearchParams(window.location.search).has("googleError"))
      setError("Google sign-in failed. Try again, or use email and password.");
  }, []);
  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);
  const register = mode === "register",
    forgot = mode === "forgot";
  if (user) return <Navigate to="/dashboard" replace />;
  const update = (e) =>
    setForm({
      ...form,
      [e.target.name]:
        e.target.name === "code"
          ? e.target.value.replace(/\D/g, "").slice(0, 6)
          : e.target.value,
    });
  async function sendCode() {
    if (register) registration.parse(form);
    else email.parse(form.email);
    const data = await api(
      register ? "/auth/register" : "/auth/forgot-password",
      {
        method: "POST",
        body: register
          ? { name: form.name, email: form.email, password: form.password }
          : { email: form.email },
      },
    );
    setMessage(data.message);
    setStep("code");
    setCooldown(data.resendAfter || 60);
    setExpiresAt(Date.now() + (data.expiresIn || 600) * 1000);
    setForm((f) => ({ ...f, code: "" }));
  }
  async function submit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      if (
        ((register && step === "details") || (forgot && step === "code")) &&
        form.password !== form.confirm
      )
        throw new Error("Passwords do not match");
      if (mode === "login") {
        loginSchema.parse(form);
        const d = await api("/auth/login", {
          method: "POST",
          body: { email: form.email, password: form.password },
        });
        setUser(d.user);
        navigate("/dashboard", { replace: true });
      } else if (step === "details") await sendCode();
      else if (register) {
        verification.parse(form);
        if (Date.now() > expiresAt)
          throw Error("Your code expired. Request a new code.");
        const d = await api("/auth/verify-registration", {
          method: "POST",
          body: { email: form.email, code: form.code },
        });
        setUser(d.user);
        navigate("/dashboard", { replace: true });
      } else {
        verification.parse(form);
        password.parse(form.password);
        if (Date.now() > expiresAt)
          throw Error("Your code expired. Request a new code.");
        const d = await api("/auth/reset-password", {
          method: "POST",
          body: { email: form.email, code: form.code, password: form.password },
        });
        setMessage(d.message);
        setStep("done");
        setForm({ ...form, password: "", confirm: "", code: "" });
      }
    } catch (e) {
      setError(e.issues?.[0]?.message || e.message);
    } finally {
      setBusy(false);
    }
  }
  const title =
    step === "done"
      ? "A fresh start."
      : step === "code"
        ? "Check your inbox."
        : register
          ? "Your next chapter."
          : forgot
            ? "Let’s get you back."
            : "Good to see you.";
  return (
    <main className="auth-layout">
      <aside className="auth-story">
        <span className="eyebrow">Your world, a little closer.</span>
        <h1>
          More moments.
          <br />
          <em>Fewer loose ends.</em>
        </h1>
        <p>
          Your plans, your budget, your next great escape. All in one place.
        </p>
        <div className="auth-orbit" aria-hidden="true">
          W<span>↗</span>
        </div>
        <span className="eyebrow">Wayfare / Travel at your own pace</span>
      </aside>
      <section className="auth-card">
        <span className="eyebrow">
          {register
            ? "Create an account"
            : forgot
              ? "Password recovery"
              : "Welcome back"}
        </span>
        <h2>{title}</h2>
        <p className="auth-intro">
          {step === "code"
            ? `Enter the six-digit code sent to ${form.email}. It is valid for 10 minutes.`
            : register
              ? "A few details, then verify your email to start planning."
              : forgot
                ? "We’ll email a code so you can choose a new password."
                : "Sign in with your email and password."}
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="form-success">
            {message}
          </p>
        )}
        {step === "done" ? (
          <Link className="btn btn-primary" to="/login">
            Back to login →
          </Link>
        ) : (
          <form onSubmit={submit}>
            <fieldset disabled={busy}>
              {step === "details" && (
                <>
                  {register && (
                    <label className="auth-field">
                      Your name
                      <input
                        name="name"
                        autoComplete="name"
                        value={form.name}
                        onChange={update}
                        minLength={2}
                        maxLength={80}
                        required
                      />
                    </label>
                  )}
                  <label className="auth-field">
                    Email address
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={update}
                      maxLength={254}
                      required
                    />
                  </label>
                </>
              )}
              {step === "code" && (
                <label className="auth-field">
                  Verification code
                  <input
                    className="otp-input"
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={form.code}
                    onChange={update}
                    required
                  />
                </label>
              )}
              {(mode === "login" ||
                (register && step === "details") ||
                (forgot && step === "code")) && (
                <label className="auth-field">
                  {forgot ? "New password" : "Password"}
                  <input
                    name="password"
                    type="password"
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    minLength={mode === "login" ? 1 : 10}
                    maxLength={72}
                    value={form.password}
                    onChange={update}
                    required
                  />
                  {mode !== "login" && (
                    <small>
                      Use 10–72 characters with uppercase, lowercase, and a
                      number.
                    </small>
                  )}
                </label>
              )}
              {((register && step === "details") ||
                (forgot && step === "code")) && (
                <label className="auth-field">
                  Confirm password
                  <input
                    maxLength={72}
                    name="confirm"
                    type="password"
                    autoComplete="new-password"
                    value={form.confirm}
                    onChange={update}
                    required
                  />
                </label>
              )}
              {mode === "login" && (
                <Link className="forgot-link" to="/forgot-password">
                  Forgot password?
                </Link>
              )}
              <button className="btn btn-primary auth-submit" type="submit">
                {busy
                  ? "Please wait…"
                  : mode === "login"
                    ? "Log in →"
                    : step === "details"
                      ? "Send verification code →"
                      : register
                        ? "Verify & start exploring →"
                        : "Reset password →"}
              </button>
              {step === "code" && (
                <div className="resend-row">
                  <button
                    className="text-button"
                    type="button"
                    disabled={cooldown > 0}
                    onClick={async () => {
                      setBusy(true);
                      setError("");
                      try {
                        await sendCode();
                      } catch (e) {
                        setError(e.issues?.[0]?.message || e.message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {cooldown ? `Resend in ${cooldown}s` : "Resend code"}
                  </button>
                  <button
                    className="text-button"
                    type="button"
                    disabled={cooldown > 0}
                    onClick={() => {
                      setStep("details");
                      setForm({ ...form, code: "" });
                      setMessage("");
                      setError("");
                    }}
                  >
                    Change email
                  </button>
                </div>
              )}
            </fieldset>
          </form>
        )}
        {google && !forgot && step === "details" && (
          <a className="btn btn-ghost google-button" href="/api/auth/google">
            Continue with Google
          </a>
        )}
        <p className="auth-switch">
          {register ? (
            <>
              Already have an account? <Link to="/login">Log in</Link>
            </>
          ) : (
            <>
              New to Wayfare? <Link to="/register">Create an account</Link>
            </>
          )}
        </p>
      </section>
    </main>
  );
}
