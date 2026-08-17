import {
  useEffect,
  useState,
} from "react";

import UploadProject from "../components/UploadProject";
import HeroObject3D from "../components/HeroObject3D";
import ProcessStory from "../components/ProcessStory";
import BeyondCreator from "../components/BeyondCreator";
import AIModelStudio from "../components/AIModelStudio";
import BeyondCommunity from "../components/BeyondCommunity";

import MyAccount from "../components/MyAccount";
import ReviewsSection from "../components/ReviewsSection";
import AuthModal from "../components/AuthModal";

import { supabase } from "../lib/supabaseClient";

import beyondLogo from "../assets/beyond-logo-transparent.png";

import "./Home.css";

function clamp(
  value,
  min = 0,
  max = 1
) {
  return Math.min(
    Math.max(value, min),
    max
  );
}

function Home() {
  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);

  const [
    authOpen,
    setAuthOpen,
  ] = useState(false);

  const [
    accountOpen,
    setAccountOpen,
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


  // BEYOND_MENU_STUDIO_ACCESS_STATE_V2
  const [
    hasMenuStudioAccess,
    setHasMenuStudioAccess,
  ] = useState(false);

  const [
    menuStudioSiteId,
    setMenuStudioSiteId,
  ] = useState("");

  const [
    isMenuStudioAdmin,
    setIsMenuStudioAdmin,
  ] = useState(false);

  // BEYOND_DYNAMIC_CONTACT_PHONE_V1
  const [
    contactPhone,
    setContactPhone,
  ] = useState(
    "+972-537707072"
  );

  const [
    contactActionsOpen,
    setContactActionsOpen,
  ] = useState(false);

  const [
    scrollProgress,
    setScrollProgress,
  ] = useState(0);

  // BEYOND_LOAD_PUBLIC_CONTACT_PHONE_V1
  useEffect(() => {
    let alive = true;

    async function loadContactPhone() {
      const {
        data,
        error,
      } = await supabase
        .from("app_settings")
        .select("value")
        .eq(
          "key",
          "contact_phone"
        )
        .maybeSingle();

      if (!alive) {
        return;
      }

      if (error) {
        console.error(
          "Unable to load contact phone:",
          error
        );

        return;
      }

      if (data?.value) {
        setContactPhone(
          data.value
        );
      }
    }

    loadContactPhone();

    function handleContactUpdated(
      event
    ) {
      if (
        event.detail?.phone
      ) {
        setContactPhone(
          event.detail.phone
        );
      } else {
        loadContactPhone();
      }
    }

    window.addEventListener(
      "beyond-contact-phone-updated",
      handleContactUpdated
    );

    return () => {
      alive = false;

      window.removeEventListener(
        "beyond-contact-phone-updated",
        handleContactUpdated
      );
    };
  }, []);

  const contactTel =
    contactPhone
      .replace(
        /[^\d+]/g,
        ""
      );

  const contactWhatsApp =
    contactPhone
      .replace(
        /\D/g,
        ""
      );


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
            _event,
            nextSession
          ) => {
            if (!mounted) {
              return;
            }

            setSession(
              nextSession
            );

            setAuthReady(
              true
            );
          }
        );

    return () => {
      mounted = false;

      subscription.unsubscribe();
    };
  }, []);

  // BEYOND_MENU_STUDIO_ACCESS_V2
  useEffect(() => {
    let alive = true;

    async function loadMenuStudioAccess() {
      if (!session?.user?.id) {
        if (alive) {
          setHasMenuStudioAccess(false);
          setMenuStudioSiteId("");
          setIsMenuStudioAdmin(false);
        }

        return;
      }

      const [
        businessResult,
        siteResult,
        adminResult,
      ] = await Promise.all([

        supabase
          .from("business_accounts")
          .select("user_id")
          .eq(
            "user_id",
            session.user.id
          )
          .maybeSingle(),

        supabase
          .from("menu_sites")
          .select("id,owner_id")
          .eq(
            "owner_id",
            session.user.id
          )
          .order(
            "created_at",
            { ascending: true }
          )
          .limit(1)
          .maybeSingle(),

        supabase
          .from("menu_admins")
          .select("user_id")
          .eq(
            "user_id",
            session.user.id
          )
          .maybeSingle(),

      ]);

      if (!alive) {
        return;
      }

      if (
        businessResult.error ||
        siteResult.error ||
        adminResult.error
      ) {
        console.error(
          "Menu Studio access check failed:",
          businessResult.error,
          siteResult.error,
          adminResult.error
        );

        setHasMenuStudioAccess(false);
        setMenuStudioSiteId("");
        setIsMenuStudioAdmin(false);

        return;
      }

      const adminMode =
        Boolean(
          adminResult.data
        );

      const businessGranted =
        Boolean(
          businessResult.data &&
          siteResult.data?.id
        );

      const granted =
        adminMode ||
        businessGranted;

      setIsMenuStudioAdmin(
        adminMode
      );

      setHasMenuStudioAccess(
        granted
      );

      /*
        Admin does not need a specific site ID.
        /menu-studio will load ALL websites.

        Business customer receives only
        their assigned site.
      */
      setMenuStudioSiteId(
        adminMode
          ? ""
          : businessGranted
            ? siteResult.data.id
            : ""
      );
    }

    loadMenuStudioAccess();

    return () => {
      alive = false;
    };
  }, [
    session?.user?.id,
  ]);


  async function handleSignOut() {
    await supabase.auth
      .signOut();

    setProfile(null);
    setMenuOpen(false);
    setAccountOpen(false);
  }

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
          .from(
            "profiles"
          )
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

  useEffect(() => {
    let ticking = false;

    function updateScroll() {
      const maxScroll =
        document.documentElement
          .scrollHeight -
        window.innerHeight;

      const progress =
        maxScroll > 0
          ? window.scrollY /
            maxScroll
          : 0;

      setScrollProgress(
        clamp(progress)
      );

      ticking = false;
    }

    function handleScroll() {
      if (ticking) {
        return;
      }

      ticking = true;

      requestAnimationFrame(
        updateScroll
      );
    }

    updateScroll();

    window.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true,
      }
    );

    window.addEventListener(
      "resize",
      handleScroll
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );

      window.removeEventListener(
        "resize",
        handleScroll
      );
    };
  }, []);

  function scrollToSection(id) {
    const element =
      document.getElementById(id);

    if (!element) {
      return;
    }

    setMenuOpen(false);

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
      className="beyond-home"
      style={{
        "--scroll-progress":
          scrollProgress,
      }}
    >
      {/* =========================================
          BACKGROUND
      ========================================= */}

      <div className="home-noise" />
      <div className="home-grid-background" />
      <div className="home-scanline" />

      <div className="home-orb home-orb-one" />
      <div className="home-orb home-orb-two" />
      <div className="home-orb home-orb-three" />

      {/* =========================================
          NAVBAR
      ========================================= */}

      <header className="home-navbar">
        <button
          className="home-brand"
          type="button"
          onClick={() =>
            scrollToSection("home")
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: "12px",
          }}
        >
          <img
            src={beyondLogo}
            alt="Beyond logo"
            style={{
              width: "42px",
              height: "42px",
              objectFit: "contain",
              display: "block",
              flexShrink: 0,
            }}
          />

          <span>
            BEYOND
          </span>
        </button>

        <nav
          className={
            menuOpen
              ? "home-nav-links open"
              : "home-nav-links"
          }
        >
          <button
            type="button"
            onClick={() =>
              scrollToSection("how")
            }
          >
            How it works
          </button>



          <button
            type="button"
            onClick={() =>
              scrollToSection(
                "creator"
              )
            }
          >
            Beyond Creator
          </button>

          <button
            type="button"
            onClick={() =>
              scrollToSection(
                "ai-studio"
              )
            }
          >
            BEYOND AI Studio
          </button>

          <button
            type="button"
            onClick={() =>
              scrollToSection(
                "community"
              )
            }
          >
            Beyond Community
          </button>



          <button
            type="button"
            onClick={() =>
              scrollToSection(
                "reviews"
              )
            }
          >
            Reviews
          </button>

          <button
            type="button"
            onClick={() =>
              scrollToSection(
                "start"
              )
            }
          >
            Start a project
          </button>

          <button
            type="button"
            onClick={() =>
              scrollToSection(
                "contact"
              )
            }
          >
            Contact
          </button>
        </nav>

        <div className="home-nav-actions">
          {authReady &&
            session ? (
            <button
              type="button"
              className="home-account-menu home-account-button"
              onClick={() =>
                setAccountOpen(
                  true
                )
              }
            >
              <div className="home-account-copy">
                <span>
                  MY ACCOUNT
                </span>

                <strong>
                  {accountName}
                </strong>
              </div>

              <div className="home-account-avatar">
                {accountName
                  .charAt(0)
                  .toUpperCase()}
              </div>
            </button>
          ) : (
            <button
              type="button"
              className="home-auth-button"
              onClick={() =>
                setAuthOpen(
                  true
                )
              }
            >
              Log In / Sign Up
            </button>
          )}

          {/* BEYOND_MENU_STUDIO_HEADER_BUTTON_V2 */}
          {authReady &&
          session &&
          hasMenuStudioAccess ? (
            <button
              type="button"
              className="home-menu-studio-button"
              onClick={() =>
                window.open(
                  isMenuStudioAdmin
                    ? "/menu-studio"
                    : `/menu-studio?site=${menuStudioSiteId}`,
                  "beyond-menu-studio",
                  "width=1440,height=950,noopener,noreferrer"
                )
              }
            >
              <span className="home-menu-studio-full">
                Menu Studio
              </span>

              <span className="home-menu-studio-short">
                Studio
              </span>
            </button>
          ) : null}

          <button
            type="button"
            className="home-start-small"
            onClick={() =>
              scrollToSection(
                "start"
              )
            }
          >
            Send us your project
          </button>

          <button
            type="button"
            className="home-mobile-menu"
            aria-label="Toggle menu"
            onClick={() =>
              setMenuOpen(
                !menuOpen
              )
            }
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {/* =========================================
          HERO
      ========================================= */}

      <section
        className="home-hero"
        id="home"
      >
        <div className="hero-copy">
          <h1>
            FROM
            <br />

            <span className="hero-outline-word">
              IDEA
            </span>

            <br />

            TO OBJECT.
          </h1>

          <p>
            Upload your model.
            We analyze it,
            prepare it for
            production and
            transform your digital
            idea into a real
            physical object.
          </p>

          <div className="hero-buttons">
            <button
              type="button"
              className="home-primary-button"
              onClick={() =>
                scrollToSection(
                  "start"
                )
              }
            >
              Start a Project
            </button>

            <button
              type="button"
              className="home-ghost-button"
              onClick={() =>
                scrollToSection(
                  "how"
                )
              }
            >
              See the process

              <span>
                ↓
              </span>
            </button>
          </div>

          <div className="hero-micro-stats">
            <div>
              <strong>
                01
              </strong>

              <span>
                Upload
              </span>
            </div>

            <div>
              <strong>
                02
              </strong>

              <span>
                Analyze
              </span>
            </div>

            <div>
              <strong>
                03
              </strong>

              <span>
                Approve
              </span>
            </div>

            <div>
              <strong>
                04
              </strong>

              <span>
                Print
              </span>
            </div>
          </div>
        </div>

        <div className="hero-machine">
          <HeroObject3D />
        </div>
      </section>

      {/* =========================================
          TRANSFORMATION BAR
      ========================================= */}

      <section className="material-transition">
        <div className="transition-top">
          <span>
            DIGITAL MANUFACTURING
          </span>

          <span className="transition-live">
            <i />

            SYSTEM ACTIVE
          </span>
        </div>

        <div className="transition-main">
          <span>
            IDEA
          </span>

          <strong>
            →
          </strong>

          <span>
            DIGITAL MODEL
          </span>

          <strong>
            →
          </strong>

          <span>
            PHYSICAL OBJECT
          </span>
        </div>

        <div className="transition-line">
          <span />
        </div>
      </section>

      {/* =========================================
          HOW IT WORKS
      ========================================= */}

      <ProcessStory />



      {/* =========================================
          BEYOND CREATOR
      ========================================= */}

      <div
        id="creator"
        className="home-creator-anchor"
      >
        <BeyondCreator
          session={session}
          onRequireAuth={() =>
            setAuthOpen(true)
          }
        />
      </div>

      {/* =========================================
          AI MODEL STUDIO
      ========================================= */}

      <div
        id="ai-studio"
        className="home-ai-studio-anchor"
      >
        <AIModelStudio />
      </div>

      {/* =========================================
          BEYOND COMMUNITY
      ========================================= */}

      <BeyondCommunity
        session={session}
        onRequireAuth={() =>
          setAuthOpen(true)
        }
      />

      {/* =========================================
          REVIEWS
      ========================================= */}

      <ReviewsSection />

      {/* =========================================
          START PROJECT
      ========================================= */}

      <section
        className="home-start-project"
        id="start"
      >
        <div className="start-project-light" />

        <div className="section-side-label">
          BUILD
        </div>

        <div className="start-project-heading">
          <div>
            <div className="section-index">
              05 / START PROJECT
            </div>

            <h2>
              Make it
              <br />

              <span>
                real.
              </span>
            </h2>
          </div>

          <p>
            Upload your project.
            We’ll review the model
            and send you a clear
            quotation before
            production begins.
          </p>
        </div>

        <div className="home-upload-wrapper">
          <UploadProject />
        </div>
      </section>

      {/* =========================================
          FINAL CTA
      ========================================= */}

      <section
        className="home-final-cta"
        id="contact"
      >
        <div className="final-cta-ring ring-a" />

        <div className="final-cta-ring ring-b" />

        <div className="final-cta-glow" />

        <div className="section-index">
          06 / BEYOND
        </div>

        <h2>
          Your next object
          <br />

          <span>
            starts as an idea.
          </span>
        </h2>

        <p>
          Have a question or want to talk about your project?
        </p>

        {/* BEYOND_CONTACT_INTERACTIVE_V3 */}
        <div className="home-contact-action-wrap">

          <button
            type="button"
            className={`home-primary-button final-cta-button home-contact-trigger ${
              contactActionsOpen
                ? "is-open"
                : ""
            }`}
            aria-expanded={
              contactActionsOpen
            }
            aria-controls="home-contact-action-panel"
            onClick={() =>
              setContactActionsOpen(
                current =>
                  !current
              )
            }
          >
            Contact Us
          </button>


          {contactActionsOpen && (
            <div
              id="home-contact-action-panel"
              className="home-contact-action-panel"
            >

              <a
                className="home-contact-action-choice"
                href={`tel:${contactTel}`}
                onClick={() =>
                  setContactActionsOpen(
                    false
                  )
                }
              >
                <span className="home-contact-choice-icon">
                  ☎
                </span>

                <span>
                  <small>
                    PHONE
                  </small>

                  <strong>
                    Call now
                  </strong>
                </span>

                <b>
                  ↗
                </b>
              </a>


              <a
                className="home-contact-action-choice"
                href={`https://wa.me/${contactWhatsApp}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  setContactActionsOpen(
                    false
                  )
                }
              >
                <span className="home-contact-choice-icon">
                  ◉
                </span>

                <span>
                  <small>
                    WHATSAPP
                  </small>

                  <strong>
                    Start a chat
                  </strong>
                </span>

                <b>
                  ↗
                </b>
              </a>

            </div>
          )}

        </div>
      </section>

      {/* =========================================
          FOOTER
      ========================================= */}

      <footer className="home-footer">
        <div className="footer-brand">
          BEYOND
        </div>

        <div className="footer-center">
          DIGITAL

          <span>
            →
          </span>

          PHYSICAL
        </div>

        <div className="footer-right">
          © 2026 BEYOND 3D
        </div>
      </footer>

      <AuthModal
        open={
          authOpen
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
        onSignOut={
          handleSignOut
        }
      />
    </main>
  );
}

export default Home;
