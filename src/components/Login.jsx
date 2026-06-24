import { useState } from "react";
import {
  getAuthErrorMessage,
  isValidUsername,
  signInWithGoogle,
  signInWithUsername,
  signUpWithUsername,
} from "../lib/auth";
import { GoogleIcon } from "./Icon";
import ThemeToggle from "./ThemeToggle";

export default function Login() {
  const [mode, setMode] = useState("sign-in");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleGoogleSignIn() {
    setError("");
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Enter a username.");
      return;
    }

    if (mode === "sign-up" && !isValidUsername(username)) {
      setError(
        "Username must be 3–20 characters: letters, numbers, or underscores.",
      );
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "sign-up") {
        await signUpWithUsername(username, password);
      } else {
        await signInWithUsername(username, password);
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
  }

  return (
    <div className="screen login-screen">
      <div className="login-card">
        <ThemeToggle className="login-theme-toggle" />
        <p className="eyebrow">Definitely not Brilliant.org</p>
        <h1>Brillyant</h1>
        <p className="subtitle">
          Probability &amp; Statistics — roll dice, run simulations, and build
          intuition through hands-on problems. (Legally distinct, we promise.)
        </p>

        <div className="login-tabs" role="tablist" aria-label="Sign in options">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "sign-in"}
            className={`login-tab ${mode === "sign-in" ? "login-tab-active" : ""}`}
            onClick={() => switchMode("sign-in")}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "sign-up"}
            className={`login-tab ${mode === "sign-up" ? "login-tab-active" : ""}`}
            onClick={() => switchMode("sign-up")}
          >
            Sign up
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="alex"
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting
              ? "Please wait..."
              : mode === "sign-up"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <div className="login-divider">or</div>

        <button
          type="button"
          className="btn btn-secondary google-btn btn-icon-text"
          onClick={handleGoogleSignIn}
          disabled={submitting}
        >
          <GoogleIcon size={18} />
          Sign in with Google
        </button>

        {error && <p className="login-error">{error}</p>}
      </div>
    </div>
  );
}
