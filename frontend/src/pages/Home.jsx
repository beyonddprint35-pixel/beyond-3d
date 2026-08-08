import {
  useEffect,
  useState,
} from "react";

import UploadProject from "../components/UploadProject";
import HeroObject3D from "../components/HeroObject3D";
import ProcessStory from "../components/ProcessStory";

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
    scrollProgress,
    setScrollProgress,
  ] = useState(0);

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

  function scrollToSection(
    id
  ) {
    const element =
      document.getElementById(
        id
      );

    if (!element) {
      return;
    }

    setMenuOpen(false);

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <main
      className="beyond-home"
      style={{
        "--scroll-progress":
          scrollProgress,
      }}
    >
      {/* BACKGROUND */}

      <div className="home-noise" />

      <div className="home-grid-background" />

      <div className="home-scanline" />

      <div className="home-orb home-orb-one" />

      <div className="home-orb home-orb-two" />

      <div className="home-orb home-orb-three" />

      {/* NAV */}

      <header className="home-navbar">
        <button
          className="home-brand"
          type="button"
          onClick={() =>
            scrollToSection("home")
          }
        >
          BEYOND
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
              scrollToSection("capabilities")
            }
          >
            Capabilities
          </button>

          <button
            type="button"
            onClick={() =>
              scrollToSection("start")
            }
          >
            Start a project
          </button>

          <button
            type="button"
            onClick={() =>
              scrollToSection("contact")
            }
          >
            Contact
          </button>
        </nav>

        <div className="home-nav-actions">
          <button
            type="button"
            className="home-start-small"
            onClick={() =>
              scrollToSection("start")
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

      {/* HERO */}

      <section
        className="home-hero"
        id="home"
      >
        <div className="hero-copy">
          <div className="hero-eyebrow">
            <span className="eyebrow-dot" />

            DIGITAL → PHYSICAL
          </div>

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
                scrollToSection("start")
              }
            >
              Start a Project

              <span>
                ↗
              </span>
            </button>

            <button
              type="button"
              className="home-ghost-button"
              onClick={() =>
                scrollToSection("how")
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

      {/* TRANSFORMATION BAR */}

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

      {/* HOW IT WORKS */}

      <ProcessStory />

      {/* CAPABILITIES */}

      <section
        className="home-capabilities"
        id="capabilities"
      >
        <div className="section-side-label">
          CAPABILITIES
        </div>

        <div className="capabilities-copy">
          <div>
            <div className="section-index">
              02 / WHAT WE MAKE
            </div>

            <h2>
              Built for
              <br />

              <span>
                ideas with purpose.
              </span>
            </h2>
          </div>

          <p>
            Prototypes, custom
            products, branded
            objects and functional
            components — produced
            from your digital files.
          </p>
        </div>

        <div className="capability-grid">
          <article className="capability-card capability-large">
            <div className="capability-top">
              <span>
                01
              </span>

              <small>
                RAPID PROTOTYPING
              </small>
            </div>

            <div className="prototype-object">
              <div className="prototype-laser laser-one" />

              <div className="prototype-laser laser-two" />

              <div className="prototype-cube cube-back" />

              <div className="prototype-cube cube-main">
                B
              </div>

              <div className="prototype-grid-floor" />
            </div>

            <div>
              <h3>
                Prototype faster.
              </h3>

              <p>
                Turn concepts,
                mechanisms and
                product ideas into
                tangible testable
                parts.
              </p>
            </div>
          </article>

          <article className="capability-card">
            <div className="capability-top">
              <span>
                02
              </span>

              <small>
                CUSTOM
              </small>
            </div>

            <div className="capability-symbol">
              ✦
            </div>

            <div>
              <h3>
                Custom objects.
              </h3>

              <p>
                Personalized
                products, gifts,
                signage and unique
                creations.
              </p>
            </div>
          </article>

          <article className="capability-card">
            <div className="capability-top">
              <span>
                03
              </span>

              <small>
                BUSINESS
              </small>
            </div>

            <div className="capability-symbol">
              ◫
            </div>

            <div>
              <h3>
                Branded production.
              </h3>

              <p>
                NFC products,
                displays, branded
                objects and small
                production runs.
              </p>
            </div>
          </article>

          <article className="capability-card capability-wide">
            <div>
              <div className="capability-top">
                <span>
                  04
                </span>

                <small>
                  MATERIAL SYSTEM
                </small>
              </div>

              <h3>
                The right material
                for every build.
              </h3>
            </div>

            <div className="material-pills">
              <span>
                PLA
              </span>

              <span>
                PLA+
              </span>

              <span>
                PETG
              </span>

              <span>
                PLA-CF
              </span>

              <span>
                MULTICOLOR
              </span>
            </div>
          </article>
        </div>
      </section>

      {/* START PROJECT — PRINTER ANIMATION REMOVED */}

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
              03 / START PROJECT
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

      {/* FINAL CTA */}

      <section
        className="home-final-cta"
        id="contact"
      >
        <div className="final-cta-ring ring-a" />

        <div className="final-cta-ring ring-b" />

        <div className="final-cta-glow" />

        <div className="section-index">
          04 / BEYOND
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
            scrollToSection("start")
          }
        >
          Start Your Project

          <span>
            ↗
          </span>
        </button>
      </section>

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
    </main>
  );
}

export default Home;