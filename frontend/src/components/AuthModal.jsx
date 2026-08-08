import {
  useEffect,
  useState,
} from "react";

import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  User,
  X,
} from "lucide-react";

import {
  supabase,
} from "../lib/supabaseClient";

import "./AuthModal.css";

function AuthModal({
  open,
  onClose,
}) {
  const [mode, setMode] =
    useState("login");

  const [
    fullName,
    setFullName,
  ] = useState("");

  const [email, setEmail] =
    useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setError("");
    setMessage("");
  }, [open, mode]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(
      event
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        onClose();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    const originalOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      document.body.style.overflow =
        originalOverflow;
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (
        mode === "signup"
      ) {
        if (
          fullName.trim()
            .length < 2
        ) {
          throw new Error(
            "Please enter your name."
          );
        }

        const {
          data,
          error:
            signUpError,
        } =
          await supabase
            .auth
            .signUp({
              email:
                email.trim(),

              password,

              options: {
                data: {
                  full_name:
                    fullName.trim(),
                },

                emailRedirectTo:
                  window.location
                    .origin,
              },
            });

        if (signUpError) {
          throw signUpError;
        }

        if (data.session) {
          onClose();
        } else {
          setMessage(
            "Account created. Check your email to confirm your account, then log in."
          );

          setMode("login");
          setPassword("");
        }
      } else {
        const {
          error:
            signInError,
        } =
          await supabase
            .auth
            .signInWithPassword({
              email:
                email.trim(),

              password,
            });

        if (signInError) {
          throw signInError;
        }

        onClose();
      }
    } catch (err) {
      setError(
        err.message ||
          "Authentication failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="auth-modal-backdrop"
      onMouseDown={(
        event
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        className="auth-modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={
          mode === "login"
            ? "Log in"
            : "Create account"
        }
      >
        <button
          className="auth-modal-close"
          type="button"
          aria-label="Close"
          onClick={onClose}
        >
          <X
            size={18}
            strokeWidth={1.7}
          />
        </button>

        <div className="auth-modal-kicker">
          BEYOND ACCOUNT
        </div>

        <h2>
          {mode === "login"
            ? "Welcome back."
            : "Create your account."}
        </h2>

        <p className="auth-modal-intro">
          {mode === "login"
            ? "Log in to your BEYOND account."
            : "Create an account to keep your future projects and models connected to you."}
        </p>

        <div className="auth-mode-switch">
          <button
            type="button"
            className={
              mode === "login"
                ? "active"
                : ""
            }
            onClick={() =>
              setMode("login")
            }
          >
            Log In
          </button>

          <button
            type="button"
            className={
              mode === "signup"
                ? "active"
                : ""
            }
            onClick={() =>
              setMode("signup")
            }
          >
            Sign Up
          </button>
        </div>

        <form
          className="auth-form"
          onSubmit={
            handleSubmit
          }
        >
          {mode ===
            "signup" && (
            <label className="auth-field">
              <span>
                NAME
              </span>

              <div className="auth-input-shell">
                <User
                  size={17}
                  strokeWidth={
                    1.5
                  }
                />

                <input
                  type="text"
                  value={
                    fullName
                  }
                  onChange={(
                    event
                  ) =>
                    setFullName(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="Your name"
                  autoComplete="name"
                  required
                />
              </div>
            </label>
          )}

          <label className="auth-field">
            <span>
              EMAIL
            </span>

            <div className="auth-input-shell">
              <Mail
                size={17}
                strokeWidth={
                  1.5
                }
              />

              <input
                type="email"
                value={email}
                onChange={(
                  event
                ) =>
                  setEmail(
                    event
                      .target
                      .value
                  )
                }
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label className="auth-field">
            <span>
              PASSWORD
            </span>

            <div className="auth-input-shell">
              <LockKeyhole
                size={17}
                strokeWidth={
                  1.5
                }
              />

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={
                  password
                }
                onChange={(
                  event
                ) =>
                  setPassword(
                    event
                      .target
                      .value
                  )
                }
                placeholder={
                  mode ===
                  "signup"
                    ? "At least 6 characters"
                    : "Your password"
                }
                autoComplete={
                  mode ===
                  "signup"
                    ? "new-password"
                    : "current-password"
                }
                minLength={6}
                required
              />

              <button
                type="button"
                className="auth-password-toggle"
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
              >
                {showPassword ? (
                  <EyeOff
                    size={16}
                    strokeWidth={
                      1.5
                    }
                  />
                ) : (
                  <Eye
                    size={16}
                    strokeWidth={
                      1.5
                    }
                  />
                )}
              </button>
            </div>
          </label>

          {error && (
            <div className="auth-message error">
              {error}
            </div>
          )}

          {message && (
            <div className="auth-message success">
              {message}
            </div>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={
              loading
            }
          >
            {loading
              ? "Please wait..."
              : mode ===
                  "login"
                ? "Log In"
                : "Create Account"}
          </button>
        </form>

        <div className="auth-security-note">
          Secure authentication
          powered by Supabase.
        </div>
      </section>
    </div>
  );
}

export default AuthModal;