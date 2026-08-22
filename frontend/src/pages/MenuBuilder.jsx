import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  Check,
  FileText,
  Image,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Sparkles,
  Upload,
  User,
} from "lucide-react";

import {
  supabase,
} from "../lib/supabaseClient";

import beyondLogo from "../assets/beyond-logo-transparent.png";

import "./MenuBuilder.css";

const MAX_FILES = 6;

function fileToPayload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const value = String(reader.result || "");
      const comma = value.indexOf(",");

      resolve({
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        base64:
          comma >= 0
            ? value.slice(comma + 1)
            : value,
      });
    };

    reader.onerror = () =>
      reject(
        new Error(
          `Could not read ${file.name}.`
        )
      );

    reader.readAsDataURL(file);
  });
}

function money(value) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  }).format(amount);
}

function MenuAuthGate({
  onAuthenticated,
}) {
  const [mode, setMode] =
    useState("signup");

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "signup") {
        if (name.trim().length < 2) {
          throw new Error(
            "Please enter your name."
          );
        }

        const {
          data,
          error: signupError,
        } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name.trim(),
              account_type: "customer",
            },
            emailRedirectTo:
              "https://b3yondworld.com/menu-builder",
          },
        });

        if (signupError) {
          throw signupError;
        }

        if (data?.session) {
          onAuthenticated?.(
            data.session
          );
          return;
        }

        setMessage(
          `Verification email sent to ${email.trim()}. Verify it, then return here and log in.`
        );

        setMode("login");
        setPassword("");
        return;
      }

      const {
        data,
        error: loginError,
      } = await supabase.auth
        .signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        throw loginError;
      }

      onAuthenticated?.(
        data.session
      );
    } catch (authError) {
      setError(
        authError?.message ||
          "Authentication failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="menu-builder-auth-backdrop">
      <section className="menu-builder-auth-card">
        <div className="menu-builder-auth-kicker">
          BEYOND MENU
        </div>

        <h1>
          {mode === "signup"
            ? "Create your menu account."
            : "Welcome back."}
        </h1>

        <p>
          {mode === "signup"
            ? "Create a free BEYOND account and get 3 AI menu-building attempts before choosing a subscription."
            : "Log in to continue building your digital menu."}
        </p>

        <div className="menu-builder-auth-switch">
          <button
            type="button"
            className={
              mode === "signup"
                ? "active"
                : ""
            }
            onClick={() => {
              setMode("signup");
              setError("");
              setMessage("");
            }}
          >
            Sign Up
          </button>

          <button
            type="button"
            className={
              mode === "login"
                ? "active"
                : ""
            }
            onClick={() => {
              setMode("login");
              setError("");
              setMessage("");
            }}
          >
            Log In
          </button>
        </div>

        <form
          className="menu-builder-auth-form"
          onSubmit={handleSubmit}
        >
          {mode === "signup" && (
            <label>
              <span>NAME</span>
              <div>
                <User size={17} />
                <input
                  type="text"
                  value={name}
                  onChange={event =>
                    setName(
                      event.target.value
                    )
                  }
                  placeholder="Your name"
                  autoComplete="name"
                  required
                />
              </div>
            </label>
          )}

          <label>
            <span>EMAIL</span>
            <div>
              <Mail size={17} />
              <input
                type="email"
                value={email}
                onChange={event =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label>
            <span>PASSWORD</span>
            <div>
              <LockKeyhole size={17} />
              <input
                type="password"
                value={password}
                onChange={event =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="At least 6 characters"
                minLength={6}
                autoComplete={
                  mode === "signup"
                    ? "new-password"
                    : "current-password"
                }
                required
              />
            </div>
          </label>

          {error && (
            <div className="menu-builder-auth-message error">
              {error}
            </div>
          )}

          {message && (
            <div className="menu-builder-auth-message success">
              {message}
            </div>
          )}

          <button
            type="submit"
            className="menu-builder-main-button"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : mode === "signup"
                ? "Create Account"
                : "Log In"}
          </button>
        </form>
      </section>
    </div>
  );
}

function MenuPreview({ menu }) {
  const sections =
    menu?.sections || [];

  return (
    <div className="menu-builder-preview-shell">
      <div className="menu-builder-preview-bar">
        <span>DRAFT PREVIEW</span>
        <strong>
          {menu?.restaurant_name ||
            "Your Restaurant"}
        </strong>
      </div>

      <div className="menu-builder-preview-menu">
        <header>
          <span>BEYOND MENU</span>
          <h2>
            {menu?.restaurant_name ||
              "Your Restaurant"}
          </h2>
          <p>
            Your menu is still a private draft. Edit and preview it before activating your subscription.
          </p>
        </header>

        <div className="menu-builder-preview-tabs">
          {sections.slice(0, 6).map(
            (section, index) => (
              <span
                key={`${section.name_en}-${index}`}
                className={
                  index === 0
                    ? "active"
                    : ""
                }
              >
                {section.name_en ||
                  section.name_he ||
                  "Menu"}
              </span>
            )
          )}
        </div>

        <div className="menu-builder-preview-content">
          {sections.map(
            (section, sectionIndex) => (
              <section
                key={`${section.name_en}-${sectionIndex}`}
              >
                <div className="menu-builder-preview-section-heading">
                  <span>
                    {String(
                      sectionIndex + 1
                    ).padStart(2, "0")}
                  </span>
                  <h3>
                    {section.name_en ||
                      section.name_he ||
                      "Menu"}
                  </h3>
                </div>

                <div className="menu-builder-preview-items">
                  {(section.items || []).map(
                    (item, itemIndex) => (
                      <article
                        key={`${item.name_en}-${itemIndex}`}
                      >
                        <div>
                          <strong>
                            {item.name_en ||
                              item.name_he ||
                              "Menu item"}
                          </strong>

                          {(item.description_en ||
                            item.description_he) && (
                            <p>
                              {item.description_en ||
                                item.description_he}
                            </p>
                          )}

                          {Array.isArray(
                            item.price_options
                          ) &&
                            item.price_options.length >
                              0 && (
                              <small>
                                {item.price_options
                                  .map(option =>
                                    `${option.label_en || option.label_he}: ${option.price}`
                                  )
                                  .join(" · ")}
                              </small>
                            )}
                        </div>

                        <b>
                          {item.price || ""}
                        </b>
                      </article>
                    )
                  )}
                </div>
              </section>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default function MenuBuilder() {
  const [session, setSession] =
    useState(null);

  const [authReady, setAuthReady] =
    useState(false);

  const [allowance, setAllowance] =
    useState(null);

  const [files, setFiles] =
    useState([]);

  const [menuText, setMenuText] =
    useState("");

  const [project, setProject] =
    useState(null);

  const [menu, setMenu] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [plans, setPlans] =
    useState([]);

  const [showPlans, setShowPlans] =
    useState(false);

  const [billingInterval, setBillingInterval] =
    useState("monthly");

  useEffect(() => {
    let alive = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!alive) return;
        setSession(
          data.session || null
        );
        setAuthReady(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!alive) return;
        setSession(nextSession);
        setAuthReady(true);
      }
    );

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setAllowance(null);
      return;
    }

    let alive = true;

    async function loadAllowance() {
      const {
        data,
        error: allowanceError,
      } = await supabase.rpc(
        "get_menu_generation_allowance"
      );

      if (!alive) return;

      if (allowanceError) {
        console.error(
          "Menu allowance load failed:",
          allowanceError
        );
        return;
      }

      setAllowance(data);
    }

    loadAllowance();

    return () => {
      alive = false;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    let alive = true;

    supabase
      .from("subscription_plans")
      .select(
        "id,name,description,monthly_price_ils,annual_billing_months,features,includes_nfc_qr_stand,sort_order"
      )
      .eq("active", true)
      .order("sort_order", {
        ascending: true,
      })
      .then(({ data, error: plansError }) => {
        if (!alive) return;

        if (plansError) {
          console.error(
            "Plan load failed:",
            plansError
          );
          return;
        }

        setPlans(data || []);
      });

    return () => {
      alive = false;
    };
  }, []);

  const remainingText = useMemo(
    () => {
      if (!allowance) {
        return "Loading attempts...";
      }

      if (allowance.unlimited) {
        return "Admin access · Unlimited builds";
      }

      return `${allowance.remaining_attempts} of ${allowance.max_attempts} AI builds remaining`;
    },
    [allowance]
  );

  async function ensureProject() {
    if (project?.id) {
      return project;
    }

    const {
      data,
      error: createError,
    } = await supabase
      .from("menu_projects")
      .insert({
        owner_user_id:
          session.user.id,
        created_by:
          session.user.id,
        name: "My Menu",
        source_type:
          menuText.trim() && files.length
            ? "mixed"
            : menuText.trim()
              ? "text"
              : files.some(
                    file =>
                      file.type ===
                      "application/pdf"
                  )
                ? "pdf"
                : "image",
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    setProject(data);
    return data;
  }

  async function handleGenerate() {
    if (!session) {
      return;
    }

    if (
      !menuText.trim() &&
      files.length === 0
    ) {
      setError(
        "Upload your menu or paste/write its content first."
      );
      return;
    }

    if (
      allowance &&
      !allowance.unlimited &&
      Number(
        allowance.remaining_attempts
      ) <= 0
    ) {
      setError(
        "You have used all 3 free AI menu builds."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const nextProject =
        await ensureProject();

      const payloadFiles =
        await Promise.all(
          files.map(fileToPayload)
        );

      const response = await fetch(
        "/.netlify/functions/menu-ai-extract",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            projectId:
              nextProject.id,
            text: menuText.trim(),
            files: payloadFiles,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Could not build this menu."
        );
      }

      setMenu(data.menu);

      if (!data.unlimited) {
        setAllowance(current => ({
          ...(current || {}),
          remaining_attempts:
            data.remainingAttempts,
          used_attempts:
            Math.max(
              Number(
                current?.max_attempts ||
                  3
              ) -
                Number(
                  data.remainingAttempts ||
                    0
                ),
              0
            ),
        }));
      }

      setProject(current => ({
        ...(current || nextProject),
        name:
          data.menu?.restaurant_name ||
          "My Menu",
        structured_menu: data.menu,
        status: "ready",
      }));
    } catch (generationError) {
      setError(
        generationError?.message ||
          "Could not build this menu."
      );

      const {
        data,
      } = await supabase.rpc(
        "get_menu_generation_allowance"
      );

      if (data) {
        setAllowance(data);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelection(event) {
    const selected = Array.from(
      event.target.files || []
    );

    const allowed = selected.filter(
      file =>
        [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/webp",
        ].includes(file.type)
    );

    const nextFiles = [
      ...files,
      ...allowed,
    ].slice(0, MAX_FILES);

    setFiles(nextFiles);
    event.target.value = "";
  }

  if (!authReady) {
    return (
      <div className="menu-builder-loading-page">
        <LoaderCircle size={28} />
        Loading BEYOND Menu...
      </div>
    );
  }

  if (!session) {
    return (
      <main className="menu-builder-page">
        <MenuAuthGate
          onAuthenticated={
            nextSession =>
              setSession(nextSession)
          }
        />
      </main>
    );
  }

  return (
    <main className="menu-builder-page">
      <header className="menu-builder-topbar">
        <button
          type="button"
          className="menu-builder-brand"
          onClick={() =>
            window.location.assign("/")
          }
        >
          <img
            src={beyondLogo}
            alt="BEYOND"
          />
          <span>BEYOND</span>
        </button>

        <div className="menu-builder-topbar-right">
          <span className="menu-builder-attempt-chip">
            <Sparkles size={14} />
            {remainingText}
          </span>

          <button
            type="button"
            className="menu-builder-back"
            onClick={() =>
              window.location.assign("/")
            }
          >
            <ArrowLeft size={15} />
            Back to BEYOND
          </button>
        </div>
      </header>

      {!showPlans ? (
        <div className="menu-builder-workspace">
          <section className="menu-builder-intro">
            <span>BEYOND MENU AI</span>
            <h1>
              Turn your existing menu
              <br />
              into a digital experience.
            </h1>
            <p>
              Upload a PDF, add menu photos, paste your text — or combine them. BEYOND AI will structure the menu and show you a private preview before you choose a subscription.
            </p>
          </section>

          <section className="menu-builder-source-panel">
            <div className="menu-builder-source-heading">
              <div>
                <span>01 / SOURCE</span>
                <h2>
                  Give us your menu.
                </h2>
              </div>

              <strong>
                Up to 6 files
              </strong>
            </div>

            <div className="menu-builder-source-grid">
              <label className="menu-builder-upload-card">
                <Upload size={25} />
                <strong>
                  Upload PDF or photos
                </strong>
                <p>
                  PDF, JPG, PNG or WEBP. You can combine several menu pages.
                </p>
                <span>
                  Choose files
                </span>

                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  multiple
                  onChange={
                    handleFileSelection
                  }
                />
              </label>

              <div className="menu-builder-text-card">
                <div>
                  <FileText size={22} />
                  <strong>
                    Write or paste
                  </strong>
                </div>

                <textarea
                  value={menuText}
                  onChange={event =>
                    setMenuText(
                      event.target.value
                    )
                  }
                  placeholder={
                    "Example:\nBurgers\nClassic Burger - 58₪\nBeef patty, lettuce, tomato..."
                  }
                />
              </div>
            </div>

            {files.length > 0 && (
              <div className="menu-builder-files">
                {files.map(
                  (file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                    >
                      {file.type ===
                      "application/pdf" ? (
                        <FileText
                          size={16}
                        />
                      ) : (
                        <Image
                          size={16}
                        />
                      )}

                      <span>
                        {file.name}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setFiles(current =>
                            current.filter(
                              (_, itemIndex) =>
                                itemIndex !==
                                index
                            )
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  )
                )}
              </div>
            )}

            {error && (
              <div className="menu-builder-error">
                {error}
              </div>
            )}

            <div className="menu-builder-generate-row">
              <div>
                <strong>
                  Your AI preview is private.
                </strong>
                <span>
                  A successful build uses 1 of your 3 attempts. System failures are refunded automatically.
                </span>
              </div>

              <button
                type="button"
                className="menu-builder-main-button"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoaderCircle
                      className="menu-builder-spin"
                      size={17}
                    />
                    Building your menu...
                  </>
                ) : (
                  <>
                    <Sparkles size={17} />
                    Build My Menu
                  </>
                )}
              </button>
            </div>
          </section>

          {menu && (
            <section className="menu-builder-result">
              <div className="menu-builder-result-heading">
                <div>
                  <span>02 / PREVIEW</span>
                  <h2>
                    This is your menu.
                  </h2>
                  <p>
                    This preview uses your extracted menu data. We will expand editing controls as the Menu Builder develops.
                  </p>
                </div>

                <button
                  type="button"
                  className="menu-builder-main-button"
                  onClick={() =>
                    setShowPlans(true)
                  }
                >
                  Continue to Plans
                </button>
              </div>

              <MenuPreview menu={menu} />
            </section>
          )}
        </div>
      ) : (
        <section className="menu-builder-plans-page">
          <div className="menu-builder-plans-heading">
            <button
              type="button"
              onClick={() =>
                setShowPlans(false)
              }
            >
              <ArrowLeft size={16} />
              Back to preview
            </button>

            <span>03 / ACTIVATE</span>
            <h1>
              Choose your BEYOND plan.
            </h1>
            <p>
              Your menu draft is ready. Choose how you want to run it live.
            </p>
          </div>

          <div className="menu-builder-billing-toggle">
            <button
              type="button"
              className={
                billingInterval ===
                "monthly"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setBillingInterval(
                  "monthly"
                )
              }
            >
              Monthly
            </button>

            <button
              type="button"
              className={
                billingInterval ===
                "annual"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setBillingInterval(
                  "annual"
                )
              }
            >
              Annual
              <span>PAY FOR 11</span>
            </button>
          </div>

          <div className="menu-builder-plan-grid">
            {plans.map(plan => {
              const annualMonths =
                Number(
                  plan.annual_billing_months ||
                    11
                );

              const monthly = Number(
                plan.monthly_price_ils || 0
              );

              const amount =
                billingInterval ===
                "annual"
                  ? monthly * annualMonths
                  : monthly;

              const features =
                plan.features || {};

              return (
                <article
                  key={plan.id}
                  className={`menu-builder-plan-card ${
                    plan.id === "premium"
                      ? "premium"
                      : ""
                  }`}
                >
                  {plan.id ===
                    "premium" && (
                    <div className="menu-builder-plan-badge">
                      PREMIUM EXPERIENCE
                    </div>
                  )}

                  <span>
                    {plan.name}
                  </span>

                  <h2>
                    {money(amount)}
                  </h2>

                  <p className="menu-builder-plan-period">
                    {billingInterval ===
                    "annual"
                      ? "per year · 12 months of service"
                      : "per month"}
                  </p>

                  {billingInterval ===
                    "annual" && (
                    <strong className="menu-builder-plan-saving">
                      1 month included free
                    </strong>
                  )}

                  <div className="menu-builder-plan-features">
                    <div>
                      <Check size={15} />
                      Digital restaurant menu
                    </div>
                    <div>
                      <Check size={15} />
                      Menu management
                    </div>
                    <div>
                      <Check size={15} />
                      Multi-language support
                    </div>
                    <div>
                      <Check size={15} />
                      AI menu import
                    </div>

                    <div
                      className={
                        features.item_images
                          ? ""
                          : "muted"
                      }
                    >
                      {features.item_images ? (
                        <Check size={15} />
                      ) : (
                        <span>—</span>
                      )}
                      Pictures inside the menu
                    </div>

                    <div className="future">
                      + More plan features coming
                    </div>
                  </div>

                  <button
                    type="button"
                    className="menu-builder-main-button"
                    onClick={() =>
                      setError(
                        "Plan selected. Next we will connect this step to promo codes and recurring PayPlus checkout."
                      )
                    }
                  >
                    Choose {plan.name}
                  </button>
                </article>
              );
            })}
          </div>

          {error && (
            <div className="menu-builder-plan-note">
              {error}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
