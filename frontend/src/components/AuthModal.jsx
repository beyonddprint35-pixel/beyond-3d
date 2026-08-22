import {
  useEffect,
  useState,
} from "react";

import {
  Building2,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
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

  const [
    restaurantName,
    setRestaurantName,
  ] = useState("");

  const [
    phone,
    setPhone,
  ] = useState("");

  const [
    businessPlan,
    setBusinessPlan,
  ] = useState("basic");

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

  const [
    businessCreated,
    setBusinessCreated,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const isBusiness =
    mode === "business";

  const isSignup =
    mode === "signup" ||
    mode === "business";

  useEffect(() => {
    if (!open) {
      return;
    }

    setError("");
    setMessage("");
    setBusinessCreated(false);
  }, [open]);

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

  // BEYOND_FORGOT_PASSWORD_V1
  async function handleForgotPassword() {
    const cleanEmail =
      email.trim();

    setError("");
    setMessage("");

    if (
      !cleanEmail ||
      !cleanEmail.includes("@")
    ) {
      setError(
        "Enter your email address first."
      );
      return;
    }

    setLoading(true);

    try {
      const {
        error:
          resetError,
      } =
        await supabase.auth
          .resetPasswordForEmail(
            cleanEmail,
            {
              redirectTo:
                "https://b3yondworld.com",
            }
          );

      if (resetError) {
        throw resetError;
      }

      setMessage(
        "Password reset link sent. Check your email and follow the link to choose a new password."
      );
    } catch (err) {
      setError(
        err.message ||
          "Could not send the password reset email."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (isSignup) {
        if (
          fullName.trim()
            .length < 2
        ) {
          throw new Error(
            "Please enter your name."
          );
        }

        if (
          isBusiness &&
          restaurantName.trim()
            .length < 2
        ) {
          throw new Error(
            "Please enter your restaurant name."
          );
        }

        if (
          isBusiness &&
          phone.trim()
            .length < 6
        ) {
          throw new Error(
            "Please enter your phone number."
          );
        }

        const userMetadata =
          isBusiness
            ? {
                full_name:
                  fullName.trim(),

                account_type:
                  "business",

                restaurant_name:
                  restaurantName.trim(),

                phone:
                  phone.trim(),

                requested_plan:
                  businessPlan,
              }
            : {
                full_name:
                  fullName.trim(),

                account_type:
                  "customer",
              };

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
                data:
                  userMetadata,

                emailRedirectTo:
                  "https://b3yondworld.com",
              },
            });

        if (signUpError) {
          throw signUpError;
        }

        if (isBusiness) {
          if (data.session) {
            setBusinessCreated(
              true
            );

            setMessage(
              "Your BEYOND business account has been created."
            );
          } else {
            setMessage(
              "Business account created. Check your email to confirm your account, then log in."
            );
          }

          setPassword("");

          return;
        }

        if (data.session) {
          onClose();
        } else {
          setMessage(
            `Verification email sent to ${email.trim()}. Check your inbox and spam folder, then verify your email before logging in.`
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
        className={`auth-modal-card ${
          isBusiness
            ? "auth-business-card"
            : ""
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={
          mode === "login"
            ? "Log in"
            : mode ===
                "business"
              ? "Create business account"
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
          {isBusiness
            ? "BEYOND FOR RESTAURANTS"
            : "BEYOND ACCOUNT"}
        </div>

        <h2>
          {mode === "login"
            ? "Welcome back."
            : isBusiness
              ? "Grow your restaurant."
              : "Create your account."}
        </h2>

        <p className="auth-modal-intro">
          {mode === "login"
            ? "Log in to your BEYOND account."
            : isBusiness
              ? "Create your restaurant account and choose the digital menu service that fits your business."
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

          <button
            type="button"
            className={
              mode === "business"
                ? "active"
                : ""
            }
            onClick={() =>
              setMode(
                "business"
              )
            }
          >
            Business
          </button>
        </div>

        {isBusiness &&
        businessCreated ? (
          <div className="auth-business-success">
            <div className="auth-business-success-icon">
              <Check
                size={26}
                strokeWidth={1.5}
              />
            </div>

            <span>
              BUSINESS ACCOUNT
            </span>

            <h3>
              Welcome to BEYOND.
            </h3>

            <p>
              Your restaurant account
              has been created with the{" "}
              <strong>
                {businessPlan ===
                "premium"
                  ? "Premium"
                  : "Basic"}
              </strong>{" "}
              plan selected.
            </p>

            <div className="auth-business-next">
              <span>
                NEXT STEP
              </span>

              <strong>
                Connect recurring
                payment
              </strong>

              <p>
                We will connect your
                selected subscription
                to the secure payment
                system in the next
                phase.
              </p>
            </div>

            <button
              type="button"
              className="auth-submit"
              onClick={onClose}
            >
              Continue to BEYOND
            </button>
          </div>
        ) : (
          <form
            className="auth-form"
            onSubmit={
              handleSubmit
            }
          >
            {isBusiness && (
              <div className="auth-plan-section">
                <div className="auth-plan-heading">
                  <span>
                    CHOOSE YOUR PLAN
                  </span>

                  <strong>
                    One restaurant.
                    Two simple options.
                  </strong>
                </div>

                <div className="auth-plan-grid">
                  <button
                    type="button"
                    className={`auth-plan-card ${
                      businessPlan ===
                      "basic"
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      setBusinessPlan(
                        "basic"
                      )
                    }
                  >
                    <div className="auth-plan-top">
                      <div>
                        <span>
                          BASIC
                        </span>

                        <h3>
                          Digital Menu
                        </h3>
                      </div>

                      <div className="auth-plan-radio">
                        {businessPlan ===
                          "basic" && (
                          <Check
                            size={13}
                            strokeWidth={
                              2
                            }
                          />
                        )}
                      </div>
                    </div>

                    <p>
                      Everything you
                      need to put your
                      restaurant menu
                      online.
                    </p>

                    <div className="auth-plan-features">
                      <span>
                        <Check
                          size={12}
                        />
                        Restaurant
                        website
                      </span>

                      <span>
                        <Check
                          size={12}
                        />
                        Digital menu
                      </span>

                      <span>
                        <Check
                          size={12}
                        />
                        Multi language
                      </span>

                      <span>
                        <Check
                          size={12}
                        />
                        Menu editor
                      </span>

                      <span>
                        <Check
                          size={12}
                        />
                        Hosting &
                        maintenance
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`auth-plan-card premium ${
                      businessPlan ===
                      "premium"
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      setBusinessPlan(
                        "premium"
                      )
                    }
                  >
                    <div className="auth-plan-badge">
                      RECOMMENDED
                    </div>

                    <div className="auth-plan-top">
                      <div>
                        <span>
                          PREMIUM
                        </span>

                        <h3>
                          Tap-to-Menu
                        </h3>
                      </div>

                      <div className="auth-plan-radio">
                        {businessPlan ===
                          "premium" && (
                          <Check
                            size={13}
                            strokeWidth={
                              2
                            }
                          />
                        )}
                      </div>
                    </div>

                    <p>
                      Your digital menu
                      plus the physical
                      BEYOND experience.
                    </p>

                    <div className="auth-plan-features">
                      <span>
                        <Check
                          size={12}
                        />
                        Everything in
                        Basic
                      </span>

                      <span>
                        <Check
                          size={12}
                        />
                        Branded NFC stand
                      </span>

                      <span>
                        <Check
                          size={12}
                        />
                        QR menu stand
                      </span>

                      <span>
                        <Check
                          size={12}
                        />
                        Tap-to-menu NFC
                      </span>

                      <span>
                        <Check
                          size={12}
                        />
                        Priority support
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {isSignup && (
              <div
                className={
                  isBusiness
                    ? "auth-business-fields"
                    : ""
                }
              >
                <label className="auth-field">
                  <span>
                    {isBusiness
                      ? "CONTACT PERSON"
                      : "NAME"}
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
                      placeholder={
                        isBusiness
                          ? "Your name"
                          : "Your name"
                      }
                      autoComplete="name"
                      required
                    />
                  </div>
                </label>

                {isBusiness && (
                  <>
                    <label className="auth-field">
                      <span>
                        RESTAURANT NAME
                      </span>

                      <div className="auth-input-shell">
                        <Building2
                          size={17}
                          strokeWidth={
                            1.5
                          }
                        />

                        <input
                          type="text"
                          value={
                            restaurantName
                          }
                          onChange={(
                            event
                          ) =>
                            setRestaurantName(
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="Restaurant name"
                          required
                        />
                      </div>
                    </label>

                    <label className="auth-field">
                      <span>
                        PHONE
                      </span>

                      <div className="auth-input-shell">
                        <Phone
                          size={17}
                          strokeWidth={
                            1.5
                          }
                        />

                        <input
                          type="tel"
                          value={phone}
                          onChange={(
                            event
                          ) =>
                            setPhone(
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="050-0000000"
                          autoComplete="tel"
                          required
                        />
                      </div>
                    </label>
                  </>
                )}
              </div>
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
                  placeholder={
                    isBusiness
                      ? "restaurant@example.com"
                      : "you@example.com"
                  }
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
                    isSignup
                      ? "At least 6 characters"
                      : "Your password"
                  }
                  autoComplete={
                    isSignup
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
                  : mode ===
                      "business"
                    ? `Create ${
                        businessPlan ===
                        "premium"
                          ? "Premium"
                          : "Basic"
                      } Business Account`
                    : "Create Account"}
            </button>

            {mode === "login" && (
              <button
                type="button"
                className="auth-forgot-password"
                disabled={loading}
                onClick={
                  handleForgotPassword
                }
              >
                Forgot password?
              </button>
            )}
          </form>
        )}

        <div className="auth-security-note">
          Secure authentication
          powered by Supabase.
        </div>
      </section>
    </div>
  );
}

export default AuthModal;
