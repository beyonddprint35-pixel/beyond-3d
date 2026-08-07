import {
  useEffect,
  useState,
} from "react";

import UploadProject from "../components/UploadProject";

import "./Home.css";

function Home() {
  const [scrollProgress, setScrollProgress] =
    useState(0);

  const [menuOpen, setMenuOpen] =
    useState(false);

  useEffect(() => {
    function handleScroll() {
      const documentHeight =
        document.documentElement.scrollHeight -
        window.innerHeight;

      if (documentHeight <= 0) {
        setScrollProgress(0);
        return;
      }

      const progress =
        window.scrollY /
        documentHeight;

      setScrollProgress(
        Math.min(
          Math.max(progress, 0),
          1
        )
      );
    }

    handleScroll();

    window.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true,
      }
    );

    return () => {
      window.removeEventListener(
        "scroll",
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

  const spoolRotation =
    scrollProgress * 1100;

  return (
    <main
      className="beyond-home"
      style={{
        "--scroll-progress":
          scrollProgress,
        "--spool-rotation":
          `${spoolRotation}deg`,
      }}
    >
      {/* =====================
          BACKGROUND
      ====================== */}

      <div className="home-noise" />

      <div className="home-grid-background" />

      <div className="home-orb home-orb-one" />

      <div className="home-orb home-orb-two" />

      {/* =====================
          FILAMENT JOURNEY
      ====================== */}

      <div
        className="filament-journey"
        aria-hidden="true"
      >
        <div className="filament-track">
          <div className="filament-track-glow" />

          <div
            className="filament-progress"
            style={{
              height:
                `${Math.max(
                  scrollProgress *
                    100,
                  4
                )}%`,
            }}
          />
        </div>

        <div
          className="journey-particle"
          style={{
            top:
              `${Math.min(
                94,
                Math.max(
                  4,
                  scrollProgress *
                    100
                )
              )}%`,
          }}
        />
      </div>

      {/* =====================
          NAVBAR
      ====================== */}

      <header className="home-navbar">
        <button
          className="home-brand"
          type="button"
          onClick={() =>
            scrollToSection(
              "home"
            )
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
              scrollToSection(
                "how"
              )
            }
          >
            How it works
          </button>

          <button
            type="button"
            onClick={() =>
              scrollToSection(
                "capabilities"
              )
            }
          >
            Capabilities
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
            onClick={() =>
              setMenuOpen(
                !menuOpen
              )
            }
            aria-label="Open menu"
          >
            <span />
            <span />
          </button>
        </div>
      </header>

      {/* =====================
          HERO
      ====================== */}

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
            We engineer the print,
            prepare your quotation
            and turn your digital
            idea into something you
            can hold.
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

              <span className="button-arrow">
                ↗
              </span>
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
              See how it works

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
                Quote
              </span>
            </div>

            <div>
              <strong>
                03
              </strong>

              <span>
                Print
              </span>
            </div>
          </div>
        </div>

        {/* =====================
            HERO SPOOL
        ====================== */}

        <div className="hero-machine">
          <div className="machine-data machine-data-top">
            <span>
              MATERIAL
            </span>

            <strong>
              PLA / PETG
            </strong>
          </div>

          <div className="machine-data machine-data-right">
            <span>
              SYSTEM
            </span>

            <strong>
              READY
            </strong>

            <i />
          </div>

          <div className="spool-scene">
            <div className="spool-halo spool-halo-one" />

            <div className="spool-halo spool-halo-two" />

            <div className="spool-floor-glow" />

            <div
              className="filament-spool"
              style={{
                transform:
                  `rotate(${spoolRotation}deg)`,
              }}
            >
              <div className="spool-shadow" />

              <div className="spool-back-disc" />

              <div className="spool-filament-body">
                <div className="filament-layer layer-one" />
                <div className="filament-layer layer-two" />
                <div className="filament-layer layer-three" />
                <div className="filament-layer layer-four" />
              </div>

              <div className="spool-front-disc">
                <div className="spool-window window-one" />
                <div className="spool-window window-two" />
                <div className="spool-window window-three" />
                <div className="spool-window window-four" />

                <div className="spool-center">
                  <div>
                    <span>
                      BEYOND
                    </span>

                    <small>
                      FILAMENT
                    </small>
                  </div>
                </div>
              </div>
            </div>

            <div className="filament-exit">
              <div className="filament-exit-glow" />
            </div>
          </div>

          <div className="hero-scroll-indicator">
            <span>
              SCROLL TO FEED
            </span>

            <div className="scroll-indicator-line">
              <i />
            </div>
          </div>
        </div>
      </section>

      {/* =====================
          TRANSITION
      ====================== */}

      <section className="material-transition">
        <div className="transition-label">
          <span>
            RAW MATERIAL
          </span>

          <strong>
            becomes
          </strong>

          <span>
            YOUR OBJECT
          </span>
        </div>

        <div className="transition-line">
          <span />
        </div>
      </section>

      {/* =====================
          HOW IT WORKS
      ====================== */}

      <section
        className="home-how"
        id="how"
      >
        <div className="home-section-heading">
          <div className="section-index">
            01 / PROCESS
          </div>

          <h2>
            One continuous
            <br />

            <span>
              path from file to reality.
            </span>
          </h2>

          <p>
            No confusing quoting
            process. No endless
            messages. Upload the
            project and follow it
            from submission to
            completion.
          </p>
        </div>

        <div className="process-track">
          <div className="process-filament-line" />

          <article className="process-card process-card-one">
            <div className="process-number">
              01
            </div>

            <div className="process-icon">
              <span>
                ↑
              </span>
            </div>

            <h3>
              Upload
            </h3>

            <p>
              Send your STL,
              3MF, OBJ, STEP
              or reference file.
            </p>

            <div className="process-meta">
              DIGITAL INPUT
            </div>
          </article>

          <article className="process-card process-card-two">
            <div className="process-number">
              02
            </div>

            <div className="process-icon">
              <span>
                ◇
              </span>
            </div>

            <h3>
              Review
            </h3>

            <p>
              We inspect your
              model, material,
              dimensions and
              print requirements.
            </p>

            <div className="process-meta">
              HUMAN REVIEW
            </div>
          </article>

          <article className="process-card process-card-three">
            <div className="process-number">
              03
            </div>

            <div className="process-icon">
              <span>
                ₪
              </span>
            </div>

            <h3>
              Approve
            </h3>

            <p>
              Receive a clear
              quotation and
              approve it directly
              online.
            </p>

            <div className="process-meta">
              SECURE QUOTE
            </div>
          </article>

          <article className="process-card process-card-four">
            <div className="process-number">
              04
            </div>

            <div className="process-icon">
              <span>
                ✦
              </span>
            </div>

            <h3>
              Print
            </h3>

            <p>
              Your idea becomes
              physical while you
              track production
              live.
            </p>

            <div className="process-meta">
              PHYSICAL OUTPUT
            </div>
          </article>
        </div>
      </section>

      {/* =====================
          CAPABILITIES
      ====================== */}

      <section
        className="home-capabilities"
        id="capabilities"
      >
        <div className="capabilities-copy">
          <div className="section-index">
            02 / CAPABILITIES
          </div>

          <h2>
            Designed for
            <span>
              {" "}
              real-world ideas.
            </span>
          </h2>

          <p>
            From a single prototype
            to custom branded
            objects and functional
            parts.
          </p>
        </div>

        <div className="capability-grid">
          <article className="capability-card capability-large">
            <div className="capability-top">
              <span>
                01
              </span>

              <small>
                PROTOTYPING
              </small>
            </div>

            <div className="prototype-object">
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
                testable physical
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

            <h3>
              Custom objects
            </h3>

            <p>
              Personalized products,
              signage, gifts and
              one-off creations.
            </p>
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

            <h3>
              Branded production
            </h3>

            <p>
              NFC products,
              displays, branded
              objects and small
              production runs.
            </p>
          </article>

          <article className="capability-card capability-wide">
            <div>
              <div className="capability-top">
                <span>
                  04
                </span>

                <small>
                  MATERIALS
                </small>
              </div>

              <h3>
                Material matched
                to the project.
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

      {/* =====================
          START PROJECT
      ====================== */}

      <section
        className="home-start-project"
        id="start"
      >
        <div className="start-project-light" />

        <div className="start-project-heading">
          <div>
            <div className="section-index">
              03 / START
            </div>

            <h2>
              Feed us
              <br />

              <span>
                your idea.
              </span>
            </h2>
          </div>

          <p>
            Upload your project
            and tell us what you
            need. We’ll review it
            and prepare your
            quotation.
          </p>
        </div>

        <div className="filament-terminal">
          <div className="terminal-line" />

          <div className="terminal-nozzle">
            <div className="nozzle-top" />
            <div className="nozzle-body" />
            <div className="nozzle-tip" />
          </div>

          <div className="terminal-print">
            <div className="print-layer print-layer-one" />
            <div className="print-layer print-layer-two" />
            <div className="print-layer print-layer-three" />
          </div>
        </div>

        <div className="home-upload-wrapper">
          <UploadProject />
        </div>
      </section>

      {/* =====================
          FINAL CTA
      ====================== */}

      <section
        className="home-final-cta"
        id="contact"
      >
        <div className="final-cta-glow" />

        <div className="section-index">
          04 / BEYOND
        </div>

        <h2>
          Something in
          <br />

          <span>
            your head?
          </span>
        </h2>

        <p>
          Make it physical.
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

      {/* =====================
          FOOTER
      ====================== */}

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