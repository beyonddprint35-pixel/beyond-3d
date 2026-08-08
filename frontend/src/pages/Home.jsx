import {
  useEffect,
  useState,
} from "react";

import UploadProject from "../components/UploadProject";
import HeroObject3D from "../components/HeroObject3D";
import ProcessStory from "../components/ProcessStory";
import AIModelStudio from "../components/AIModelStudio";
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



  const [
    scrollProgress,
    setScrollProgress,
  ] = useState(0);

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
              Log In
            </button>
          )}

          <button
            type="button"
            className="home-start-small"
            onClick={() =>
              scrollToSection(
                "start"
              )
            }
          >
            Start a project

            <span>
              ↗
            </span>
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
          AI MODEL STUDIO
      ========================================= */}

      <div
        id="ai-studio"
        className="home-ai-studio-anchor"
      >
        <AIModelStudio />
      </div>

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
              04 / START PROJECT
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
          05 / BEYOND
        </div>

        <h2>
          Your next object
          <br />

          <span>
            starts as an idea.
          </span>
        </h2>

        <p>
          Send it through.
        </p>

        <button
          type="button"
          className="home-primary-button final-cta-button"
          onClick={() =>
            scrollToSection(
              "start"
            )
          }
        >
          Start Your Project

          <span>
            ↗
          </span>
        </button>
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
