import {
  useEffect,
  useState,
} from "react";

import {
  ArrowRight,
  Check,
  Languages,
  Menu as MenuIcon,
  PanelsTopLeft,
  QrCode,
  Radio,
  Sparkles,
  Smartphone,
  X,
} from "lucide-react";

import {
  useBeyondLanguage,
} from "../i18n/BeyondLanguage";

import AuthModal from "../components/AuthModal";
import MyAccount from "../components/MyAccount";

import {
  supabase,
} from "../lib/supabaseClient";

import {
  clearMenuBuilderIntent,
  hasMenuBuilderIntent,
  setMenuBuilderIntent,
} from "../lib/menuBuilderIntent";

import beyondLogo from "../assets/beyond-logo-transparent.png";

import "./MenuHome.css";

function MenuPreview({
  isHebrew,
}) {
  return (
    <div
      className="menu-home-preview-shell"
      aria-label={
        isHebrew
          ? "תצוגה מקדימה של תפריט דיגיטלי"
          : "Digital menu preview"
      }
    >
      <div className="menu-home-preview-toolbar">
        <div>
          <span className="menu-home-live-dot" />
          <strong>
            {isHebrew
              ? "תפריט פעיל"
              : "LIVE MENU"}
          </strong>
        </div>

        <span>
          EN · עב
        </span>
      </div>

      <div className="menu-home-preview-brand">
        <div>
          <small>
            BEYOND MENU
          </small>

          <h3>
            EL PUERTO
          </h3>

          <p>
            {isHebrew
              ? "בר · קפה · תפריט דיגיטלי"
              : "BAR · CAFE · DIGITAL MENU"}
          </p>
        </div>

        <div className="menu-home-preview-logo">
          B
        </div>
      </div>

      <div className="menu-home-preview-tabs">
        <button
          type="button"
          className="active"
        >
          {isHebrew
            ? "בירה"
            : "Beer"}
        </button>

        <button type="button">
          {isHebrew
            ? "קוקטיילים"
            : "Cocktails"}
        </button>

        <button type="button">
          {isHebrew
            ? "אוכל"
            : "Food"}
        </button>

        <button type="button">
          {isHebrew
            ? "יין"
            : "Wine"}
        </button>
      </div>

      <div className="menu-home-preview-list">
        <article>
          <div>
            <strong>
              Guinness
            </strong>

            <span>
              {isHebrew
                ? "בירה מהחבית · 500 מ״ל"
                : "Draft beer · 500 ml"}
            </span>
          </div>

          <b>₪32</b>
        </article>

        <article>
          <div>
            <strong>
              Mojito
            </strong>

            <span>
              {isHebrew
                ? "רום · ליים · נענע"
                : "Rum · lime · mint"}
            </span>
          </div>

          <b>₪42</b>
        </article>

        <article>
          <div>
            <strong>
              Negroni
            </strong>

            <span>
              {isHebrew
                ? "ג׳ין · ורמוט · קמפרי"
                : "Gin · vermouth · Campari"}
            </span>
          </div>

          <b>₪46</b>
        </article>
      </div>

      <div className="menu-home-preview-bottom">
        <span>
          {isHebrew
            ? "עדכון אחרון עכשיו"
            : "Updated just now"}
        </span>

        <span>
          QR + NFC
        </span>
      </div>
    </div>
  );
}

function StudioPreview({
  isHebrew,
}) {
  return (
    <div className="menu-home-studio-window">
      <div className="menu-home-window-top">
        <div className="menu-home-window-dots">
          <i />
          <i />
          <i />
        </div>

        <span>
          menu.beyond
        </span>

        <span className="menu-home-window-status">
          <i />
          {isHebrew
            ? "נשמר"
            : "Saved"}
        </span>
      </div>

      <div className="menu-home-studio-body">
        <aside>
          <div className="menu-home-studio-brand">
            <img
              src={beyondLogo}
              alt=""
            />

            <strong>
              BEYOND
            </strong>
          </div>

          <button
            type="button"
            className="active"
          >
            <PanelsTopLeft size={17} />
            {isHebrew
              ? "פריטי תפריט"
              : "Menu items"}
          </button>

          <button type="button">
            <MenuIcon size={17} />
            {isHebrew
              ? "קטגוריות"
              : "Categories"}
          </button>

          <button type="button">
            <Languages size={17} />
            {isHebrew
              ? "שפות"
              : "Languages"}
          </button>
        </aside>

        <div className="menu-home-editor">
          <div className="menu-home-editor-heading">
            <div>
              <small>
                {isHebrew
                  ? "קטגוריה"
                  : "CATEGORY"}
              </small>

              <h4>
                {isHebrew
                  ? "קוקטיילים"
                  : "Cocktails"}
              </h4>
            </div>

            <button type="button">
              +{" "}
              {isHebrew
                ? "הוסף פריט"
                : "Add item"}
            </button>
          </div>

          <div className="menu-home-editor-item">
            <div className="menu-home-item-thumb">
              M
            </div>

            <div>
              <strong>
                Mojito
              </strong>

              <span>
                {isHebrew
                  ? "רום, ליים, נענע וסודה"
                  : "Rum, lime, mint & soda"}
              </span>
            </div>

            <b>
              ₪42
            </b>
          </div>

          <div className="menu-home-editor-item">
            <div className="menu-home-item-thumb">
              N
            </div>

            <div>
              <strong>
                Negroni
              </strong>

              <span>
                {isHebrew
                  ? "ג׳ין, ורמוט וקמפרי"
                  : "Gin, vermouth & Campari"}
              </span>
            </div>

            <b>
              ₪46
            </b>
          </div>

          <div className="menu-home-editor-item muted">
            <div className="menu-home-item-thumb">
              A
            </div>

            <div>
              <strong>
                Aperol Spritz
              </strong>

              <span>
                {isHebrew
                  ? "אפרול, פרוסקו וסודה"
                  : "Aperol, prosecco & soda"}
              </span>
            </div>

            <b>
              ₪44
            </b>
          </div>
        </div>

        <div className="menu-home-phone-preview">
          <div className="menu-home-phone-speaker" />

          <small>
            LIVE PREVIEW
          </small>

          <strong>
            EL PUERTO
          </strong>

          <div className="menu-home-phone-tabs">
            <span className="active">
              DRINKS
            </span>
            <span>
              FOOD
            </span>
          </div>

          <div className="menu-home-phone-row">
            <span>
              Mojito
            </span>
            <b>
              ₪42
            </b>
          </div>

          <div className="menu-home-phone-row">
            <span>
              Negroni
            </span>
            <b>
              ₪46
            </b>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccessPreview({
  isHebrew,
}) {
  return (
    <div className="menu-home-access-preview">
      <div className="menu-home-table-stand">
        <div className="menu-home-stand-card">
          <img
            src={beyondLogo}
            alt=""
          />

          <small>
            BEYOND MENU
          </small>

          <div className="menu-home-fake-qr">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>

          <strong>
            {isHebrew
              ? "סרקו או הצמידו"
              : "SCAN OR TAP"}
          </strong>

          <div className="menu-home-nfc-mark">
            <Radio size={17} />
            NFC
          </div>
        </div>

        <div className="menu-home-stand-base" />
      </div>

      <div className="menu-home-access-phone">
        <div className="menu-home-access-phone-top" />

        <span className="menu-home-access-check">
          <Check size={16} />
        </span>

        <small>
          {isHebrew
            ? "התפריט נפתח"
            : "MENU OPENED"}
        </small>

        <strong>
          EL PUERTO
        </strong>

        <p>
          {isHebrew
            ? "בלי אפליקציה. בלי התחברות."
            : "No app. No login."}
        </p>
      </div>
    </div>
  );
}

export default function MenuHome() {
  const {
    language,
    isHebrew,
    toggleLanguage,
  } = useBeyondLanguage();

  const [
    navOpen,
    setNavOpen,
  ] = useState(false);

  const [
    authOpen,
    setAuthOpen,
  ] = useState(false);

  const [
    authInitialMode,
    setAuthInitialMode,
  ] = useState("login");

  const [
    accountOpen,
    setAccountOpen,
  ] = useState(false);

  const [
    passwordRecovery,
    setPasswordRecovery,
  ] = useState(false);

  const [
    session,
    setSession,
  ] = useState(null);

  const [
    authReady,
    setAuthReady,
  ] = useState(false);

  const [
    profile,
    setProfile,
  ] = useState(null);

  const [
    emailVerificationStatus,
    setEmailVerificationStatus,
  ] = useState("");

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-beyond-theme",
      "light"
    );

    document.documentElement.style.colorScheme =
      "light";
  }, []);

  function openAuth(
    mode = "login"
  ) {
    setAuthInitialMode(mode);
    setAuthOpen(true);
    setNavOpen(false);
  }

  function handleStartMenu() {
    if (
      authReady &&
      session
    ) {
      clearMenuBuilderIntent();

      window.location.assign(
        "/menu-builder"
      );

      return;
    }

    setMenuBuilderIntent();
    openAuth("signup");
  }

  useEffect(() => {
    if (
      !authReady ||
      !session ||
      !hasMenuBuilderIntent()
    ) {
      return;
    }

    clearMenuBuilderIntent();
    setAuthOpen(false);

    window.location.assign(
      "/menu-builder"
    );
  }, [
    authReady,
    session?.user?.id,
  ]);

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const tokenHash =
      params.get("token_hash");

    const type =
      params.get("type");

    if (
      !tokenHash ||
      type !== "email"
    ) {
      return;
    }

    let alive = true;

    async function verifyEmail() {
      setEmailVerificationStatus(
        "verifying"
      );

      try {
        const {
          data,
          error,
        } =
          await supabase.auth
            .verifyOtp({
              token_hash:
                tokenHash,
              type: "email",
            });

        if (!alive) {
          return;
        }

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        if (error) {
          throw error;
        }

        if (data?.session) {
          setSession(
            data.session
          );
        }

        setAuthReady(true);
        setAuthOpen(false);
        setEmailVerificationStatus(
          "success"
        );

        window.setTimeout(
          () => {
            if (alive) {
              setEmailVerificationStatus(
                ""
              );
            }
          },
          7000
        );
      } catch (error) {
        if (!alive) {
          return;
        }

        console.error(
          "Email verification failed:",
          error
        );

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        setEmailVerificationStatus(
          "error"
        );
      }
    }

    verifyEmail();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) {
          return;
        }

        setSession(
          data.session || null
        );

        setAuthReady(true);
      });

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth
        .onAuthStateChange(
          (
            event,
            nextSession
          ) => {
            if (!mounted) {
              return;
            }

            setSession(
              nextSession
            );

            setAuthReady(true);

            if (
              event ===
              "PASSWORD_RECOVERY"
            ) {
              setPasswordRecovery(
                true
              );

              setAccountOpen(
                true
              );
            }
          }
        );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      if (
        !session?.user?.id
      ) {
        setProfile(null);
        return;
      }

      const {
        data,
        error,
      } =
        await supabase
          .from("profiles")
          .select(
            "id, email, full_name, phone, created_at, updated_at"
          )
          .eq(
            "id",
            session.user.id
          )
          .single();

      if (!mounted) {
        return;
      }

      if (error) {
        console.error(
          "Unable to load customer profile:",
          error
        );

        setProfile(null);
        return;
      }

      setProfile(data);
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [
    session?.user?.id,
  ]);

  async function handleSignOut() {
    await supabase.auth
      .signOut();

    setProfile(null);
    setAccountOpen(false);
    setNavOpen(false);
  }

  function scrollToSection(
    id
  ) {
    const element =
      document.getElementById(id);

    if (!element) {
      return;
    }

    setNavOpen(false);

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  const accountName =
    profile?.full_name ||
    profile?.email ||
    session?.user
      ?.user_metadata
      ?.full_name ||
    session?.user
      ?.email ||
    "Customer";

  return (
    <main
      className="menu-home"
      dir={
        isHebrew
          ? "rtl"
          : "ltr"
      }
    >
      {emailVerificationStatus && (
        <div
          className={`menu-home-verification ${emailVerificationStatus}`}
          role="status"
        >
          {emailVerificationStatus ===
          "verifying"
            ? isHebrew
              ? "מאמתים את כתובת האימייל..."
              : "Verifying your email..."
            : emailVerificationStatus ===
                "success"
              ? isHebrew
                ? "האימייל אומת בהצלחה. ברוכים הבאים ל-BEYOND."
                : "Email verified successfully. Welcome to BEYOND."
              : isHebrew
                ? "לא הצלחנו לאמת את הקישור. נסו לבקש קישור חדש."
                : "We couldn't verify this email link. Please request a new one."}
        </div>
      )}

      <header className="menu-home-navbar">
        <button
          type="button"
          className="menu-home-brand"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }
          aria-label="Beyond home"
        >
          <img
            src={beyondLogo}
            alt="Beyond"
          />

          <span>
            BEYOND
          </span>
        </button>

        <nav
          className={
            navOpen
              ? "menu-home-nav open"
              : "menu-home-nav"
          }
          aria-label="Primary navigation"
        >
          <button
            type="button"
            onClick={() =>
              scrollToSection(
                "product"
              )
            }
          >
            {isHebrew
              ? "המוצר"
              : "Product"}
          </button>

          <button
            type="button"
            onClick={() =>
              scrollToSection(
                "how-it-works"
              )
            }
          >
            {isHebrew
              ? "איך זה עובד"
              : "How it works"}
          </button>

          <button
            type="button"
            onClick={() =>
              scrollToSection(
                "qr-nfc"
              )
            }
          >
            QR + NFC
          </button>

          <button
            type="button"
            onClick={() =>
              window.open(
                "/menu/el-puerto",
                "_blank",
                "noopener,noreferrer"
              )
            }
          >
            {isHebrew
              ? "תפריט לדוגמה"
              : "Live demo"}
          </button>
        </nav>

        <div className="menu-home-nav-actions">
          <a
            className="menu-home-submit-project"
            href="/3DPRINTING#start"
          >
            {isHebrew
              ? "שליחת פרויקט 3D"
              : "Submit 3D Project"}
          </a>

          <button
            type="button"
            className="menu-home-language"
            onClick={
              toggleLanguage
            }
            aria-label={
              isHebrew
                ? "Switch to English"
                : "עבור לעברית"
            }
          >
            <span
              className={
                language === "en"
                  ? "active"
                  : ""
              }
            >
              EN
            </span>

            <i />

            <span
              className={
                language === "he"
                  ? "active"
                  : ""
              }
            >
              עב
            </span>
          </button>

          {authReady &&
          session ? (
            <button
              type="button"
              className="menu-home-account"
              onClick={() =>
                setAccountOpen(
                  true
                )
              }
            >
              <span>
                <small>
                  {isHebrew
                    ? "החשבון שלי"
                    : "MY ACCOUNT"}
                </small>

                <strong>
                  {accountName}
                </strong>
              </span>

              <b>
                {accountName
                  .charAt(0)
                  .toUpperCase()}
              </b>
            </button>
          ) : (
            <button
              type="button"
              className="menu-home-login"
              onClick={() =>
                openAuth("login")
              }
            >
              {isHebrew
                ? "התחברות"
                : "Log in"}
            </button>
          )}

          <button
            type="button"
            className="menu-home-mobile-toggle"
            onClick={() =>
              setNavOpen(
                current =>
                  !current
              )
            }
            aria-label={
              navOpen
                ? "Close navigation"
                : "Open navigation"
            }
            aria-expanded={
              navOpen
            }
          >
            {navOpen ? (
              <X size={21} />
            ) : (
              <MenuIcon size={21} />
            )}
          </button>
        </div>
      </header>

      <section
        className="menu-home-hero"
        id="product"
      >
        <div className="menu-home-hero-copy">
          <div className="menu-home-kicker">
            <Sparkles size={15} />
            {isHebrew
              ? "הדרך הפשוטה לתפריט דיגיטלי"
              : "THE SIMPLE WAY TO GO DIGITAL"}
          </div>

          <h1>
            {isHebrew ? (
              <>
                יוצרים תפריט דיגיטלי
                <span>
                  בדקות.
                </span>
              </>
            ) : (
              <>
                Create your digital menu
                <span>
                  in minutes.
                </span>
              </>
            )}
          </h1>

          <p>
            {isHebrew
              ? "בנו, עדכנו ושתפו את תפריט המסעדה ממקום אחד. QR, NFC, מספר שפות ועדכונים מיידיים — בלי אפליקציה ללקוח."
              : "Build, update and share your restaurant menu from one place. QR, NFC, multiple languages and instant updates — with no app for your customers."}
          </p>

          <div className="menu-home-hero-actions">
            <button
              type="button"
              className="menu-home-primary"
              onClick={
                handleStartMenu
              }
            >
              {isHebrew
                ? "יצירת תפריט"
                : "Create My Menu"}

              <ArrowRight
                size={18}
              />
            </button>

            <button
              type="button"
              className="menu-home-secondary"
              onClick={() =>
                window.open(
                  "/menu/el-puerto",
                  "_blank",
                  "noopener,noreferrer"
                )
              }
            >
              {isHebrew
                ? "צפייה בתפריט לדוגמה"
                : "View Live Demo"}
            </button>
          </div>

          <div className="menu-home-hero-notes">
            <span>
              <Check size={15} />
              {isHebrew
                ? "ללא אפליקציה"
                : "No app required"}
            </span>

            <span>
              <Check size={15} />
              QR + NFC
            </span>

            <span>
              <Check size={15} />
              {isHebrew
                ? "עדכון בכל רגע"
                : "Update anytime"}
            </span>
          </div>
        </div>

        <div className="menu-home-hero-visual">
          <div className="menu-home-floating-card menu-home-floating-one">
            <QrCode size={18} />
            <span>
              QR + NFC
            </span>
          </div>

          <MenuPreview
            isHebrew={
              isHebrew
            }
          />

          <div className="menu-home-floating-card menu-home-floating-two">
            <span className="menu-home-live-dot" />
            <span>
              LIVE
            </span>
          </div>
        </div>
      </section>

      <section
        className="menu-home-how"
        id="how-it-works"
      >
        <div className="menu-home-section-heading">
          <span>
            01
          </span>

          <div>
            <small>
              {isHebrew
                ? "איך זה עובד"
                : "HOW IT WORKS"}
            </small>

            <h2>
              {isHebrew
                ? "מהרעיון לשולחן בשלושה צעדים."
                : "From idea to table in three steps."}
            </h2>
          </div>
        </div>

        <div className="menu-home-step-grid">
          <article>
            <div className="menu-home-step-icon">
              <MenuIcon size={22} />
            </div>

            <span>
              01
            </span>

            <h3>
              {isHebrew
                ? "יוצרים את התפריט"
                : "Create your menu"}
            </h3>

            <p>
              {isHebrew
                ? "מוסיפים קטגוריות, מנות, מחירים, תיאורים ותמונות."
                : "Add categories, items, prices, descriptions and images."}
            </p>
          </article>

          <article>
            <div className="menu-home-step-icon">
              <Languages size={22} />
            </div>

            <span>
              02
            </span>

            <h3>
              {isHebrew
                ? "מתאימים למותג"
                : "Make it yours"}
            </h3>

            <p>
              {isHebrew
                ? "מתאימים את השפה, התוכן והנראות למסעדה שלכם."
                : "Adjust the language, content and look to fit your restaurant."}
            </p>
          </article>

          <article>
            <div className="menu-home-step-icon">
              <Smartphone size={22} />
            </div>

            <span>
              03
            </span>

            <h3>
              {isHebrew
                ? "משתפים"
                : "Share it"}
            </h3>

            <p>
              {isHebrew
                ? "הלקוחות סורקים QR או מצמידים את הטלפון ל-NFC והתפריט נפתח."
                : "Customers scan the QR or tap NFC and your menu opens instantly."}
            </p>
          </article>
        </div>
      </section>

      <section className="menu-home-studio-section">
        <div className="menu-home-studio-copy">
          <div className="menu-home-kicker">
            <PanelsTopLeft size={15} />
            MENU MANAGEMENT
          </div>

          <h2>
            {isHebrew
              ? "כל מה שצריך כדי לנהל תפריט. במקום אחד."
              : "Everything you need to manage your menu. In one place."}
          </h2>

          <p>
            {isHebrew
              ? "שינוי מחיר, הוספת מנה או עדכון תיאור לא צריכים לחכות להדפסה מחדש. עורכים פעם אחת והשינוי מתעדכן בתפריט."
              : "Changing a price, adding an item or updating a description should not require a reprint. Edit once and your menu updates."}
          </p>

          <div className="menu-home-feature-list">
            <span>
              <Check size={16} />
              {isHebrew
                ? "עריכת מחירים ומנות"
                : "Edit prices and items"}
            </span>

            <span>
              <Check size={16} />
              {isHebrew
                ? "קטגוריות מסודרות"
                : "Organized categories"}
            </span>

            <span>
              <Check size={16} />
              {isHebrew
                ? "מספר שפות"
                : "Multiple languages"}
            </span>

            <span>
              <Check size={16} />
              {isHebrew
                ? "תצוגה מקדימה בזמן אמת"
                : "Live preview"}
            </span>
          </div>
        </div>

        <StudioPreview
          isHebrew={
            isHebrew
          }
        />
      </section>

      <section
        className="menu-home-access-section"
        id="qr-nfc"
      >
        <AccessPreview
          isHebrew={
            isHebrew
          }
        />

        <div className="menu-home-access-copy">
          <div className="menu-home-kicker">
            <Radio size={15} />
            QR + NFC
          </div>

          <h2>
            {isHebrew
              ? "תפריט אחד. שתי דרכים לפתוח אותו."
              : "One menu. Two ways to open it."}
          </h2>

          <p>
            {isHebrew
              ? "מניחים את המעמד על השולחן. הלקוח סורק או מצמיד את הטלפון — והתפריט נפתח ישירות בדפדפן."
              : "Place the stand on the table. Customers scan or tap and the menu opens directly in their browser."}
          </p>

          <div className="menu-home-access-points">
            <span>
              <Check size={16} />
              {isHebrew
                ? "לא צריך להוריד אפליקציה"
                : "No app download"}
            </span>

            <span>
              <Check size={16} />
              {isHebrew
                ? "עובד ברוב הטלפונים"
                : "Works with modern phones"}
            </span>

            <span>
              <Check size={16} />
              {isHebrew
                ? "אותו קישור תמיד"
                : "One permanent menu link"}
            </span>
          </div>
        </div>
      </section>

      <section className="menu-home-final">
        <div>
          <span>
            BEYOND MENU
          </span>

          <h2>
            {isHebrew
              ? "התפריט הבא שלכם יכול להיות באוויר היום."
              : "Your next menu can be live today."}
          </h2>

          <p>
            {isHebrew
              ? "מתחילים פשוט, מעדכנים מתי שרוצים ונותנים ללקוחות חוויה ברורה ומהירה."
              : "Start simple, update whenever you need, and give customers a clear, fast experience."}
          </p>
        </div>

        <button
          type="button"
          className="menu-home-primary"
          onClick={
            handleStartMenu
          }
        >
          {isHebrew
            ? "יצירת תפריט"
            : "Create My Menu"}

          <ArrowRight
            size={18}
          />
        </button>
      </section>

      <footer className="menu-home-footer">
        <div className="menu-home-footer-brand">
          <img
            src={beyondLogo}
            alt=""
          />

          <strong>
            BEYOND
          </strong>
        </div>

        <p>
          {isHebrew
            ? "תפריטים דיגיטליים למסעדות, בתי קפה וברים."
            : "Digital menus for restaurants, cafés and bars."}
        </p>

        <div className="menu-home-footer-links">
          <button
            type="button"
            onClick={
              handleStartMenu
            }
          >
            {isHebrew
              ? "יצירת תפריט"
              : "Menu Builder"}
          </button>

          <button
            type="button"
            onClick={() =>
              window.open(
                "/menu/el-puerto",
                "_blank",
                "noopener,noreferrer"
              )
            }
          >
            {isHebrew
              ? "דוגמה"
              : "Live Demo"}
          </button>

          <a href="/3DPRINTING">
            3D Printing
          </a>
        </div>

        <small>
          © 2026 BEYOND
        </small>
      </footer>

      <AuthModal
        open={
          authOpen
        }
        initialMode={
          authInitialMode
        }
        onClose={() =>
          setAuthOpen(
            false
          )
        }
      />

      <MyAccount
        open={
          accountOpen
        }
        onClose={() =>
          setAccountOpen(
            false
          )
        }
        session={
          session
        }
        profile={
          profile
        }
        onProfileUpdated={(
          nextProfile
        ) =>
          setProfile(
            nextProfile
          )
        }
        passwordRecovery={
          passwordRecovery
        }
        onPasswordRecoveryComplete={() =>
          setPasswordRecovery(
            false
          )
        }
        onSignOut={
          handleSignOut
        }
      />
    </main>
  );
}