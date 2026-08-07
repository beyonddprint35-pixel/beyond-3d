import {
  useEffect,
  useRef,
  useState,
} from "react";

import UploadProject from "../components/UploadProject";

import FilamentSpool3D from "../components/FilamentSpool3D";

import "./Home.css";

function Home() {
  const [
    scrollProgress,
    setScrollProgress,
  ] =
    useState(0);

  const [
    filamentPoint,
    setFilamentPoint,
  ] =
    useState({
      x: 0,
      y: 0,
      visible: false,
    });

  const [
    menuOpen,
    setMenuOpen,
  ] =
    useState(false);

  const filamentPathRef =
    useRef(null);

  useEffect(() => {
    function updateScrollEffects() {
      const pageHeight =
        document.documentElement
          .scrollHeight -
        window.innerHeight;

      const progress =
        pageHeight > 0
          ? window.scrollY /
            pageHeight
          : 0;

      const safeProgress =
        Math.min(
          Math.max(
            progress,
            0
          ),
          1
        );

      setScrollProgress(
        safeProgress
      );

      const path =
        filamentPathRef.current;

      if (path) {
        try {
          const totalLength =
            path.getTotalLength();

          const point =
            path.getPointAtLength(
              totalLength *
                safeProgress
            );

          setFilamentPoint({
            x: point.x,
            y: point.y,
            visible: true,
          });
        } catch {
          setFilamentPoint(
            (
              current
            ) => ({
              ...current,
              visible: false,
            })
          );
        }
      }
    }

    updateScrollEffects();

    window.addEventListener(
      "scroll",
      updateScrollEffects,
      {
        passive: true,
      }
    );

    window.addEventListener(
      "resize",
      updateScrollEffects
    );

    return () => {
      window.removeEventListener(
        "scroll",
        updateScrollEffects
      );

      window.removeEventListener(
        "resize",
        updateScrollEffects
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

  const filamentDashOffset =
    1000 -
    scrollProgress *
      1000;

  return (
    <main
      className="beyond-home"
      style={{
        "--scroll-progress":
          scrollProgress,
      }}
    >
      <div className="home-noise" />

      <div className="home-grid-background" />

      <div className="home-scanline" />

      <div className="home-orb home-orb-one" />

      <div className="home-orb home-orb-two" />

      <div className="home-orb home-orb-three" />

      {/* GLOBAL FILAMENT */}

      <div
        className="global-filament-system"
        aria-hidden="true"
      >
        <svg
          className="global-filament-svg"
          viewBox="0 0 1000 4000"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient
              id="filamentGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#99c7ff"
              />

              <stop
                offset="20%"
                stopColor="#4f95ff"
              />

              <stop
                offset="55%"
                stopColor="#2678ff"
              />

              <stop
                offset="100%"
                stopColor="#7fb2ff"
              />
            </linearGradient>

            <filter
              id="filamentGlow"
              x="-100%"
              y="-100%"
              width="300%"
              height="300%"
            >
              <feGaussianBlur
                stdDeviation="8"
                result="blur"
              />

              <feMerge>
                <feMergeNode
                  in="blur"
                />

                <feMergeNode
                  in="SourceGraphic"
                />
              </feMerge>
            </filter>
          </defs>

          <path
            className="filament-shadow-path"
            d="
              M 695 150
              C 760 380, 680 560, 565 720
              C 390 960, 420 1210, 535 1390
              C 690 1630, 650 1900, 485 2090
              C 350 2240, 380 2470, 525 2660
              C 700 2890, 645 3200, 505 3400
              C 430 3510, 470 3710, 500 3920
            "
          />

          <path
            ref={
              filamentPathRef
            }
            className="filament-main-path"
            pathLength="1000"
            d="
              M 695 150
              C 760 380, 680 560, 565 720
              C 390 960, 420 1210, 535 1390
              C 690 1630, 650 1900, 485 2090
              C 350 2240, 380 2470, 525 2660
              C 700 2890, 645 3200, 505 3400
              C 430 3510, 470 3710, 500 3920
            "
            style={{
              strokeDasharray:
                1000,

              strokeDashoffset:
                filamentDashOffset,
            }}
          />

          {filamentPoint.visible && (
            <>
              <circle
                cx={
                  filamentPoint.x
                }
                cy={
                  filamentPoint.y
                }
                r="17"
                className="filament-tip-halo"
              />

              <circle
                cx={
                  filamentPoint.x
                }
                cy={
                  filamentPoint.y
                }
                r="5"
                className="filament-tip-dot"
              />
            </>
          )}
        </svg>
      </div>

      {/* NAVBAR */}

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
            We engineer the print,
            prepare your quotation
            and transform your
            digital idea into a
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

              <span>
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
                Approve
              </span>
            </div>

            <div>
              <strong>
                03
              </strong>

              <span>
                Track
              </span>
            </div>

            <div>
              <strong>
                04
              </strong>

              <span>
                Receive
              </span>
            </div>
          </div>
        </div>

        <div className="hero-machine">
          <FilamentSpool3D
            scrollProgress={
              scrollProgress
            }
          />
        </div>
      </section>

      {/* MATERIAL TRANSITION */}

      <section className="material-transition">
        <div className="transition-top">
          <span>
            1.75 MM FILAMENT
          </span>

          <span className="transition-live">
            <i />

            FEED ACTIVE
          </span>
        </div>

        <div className="transition-main">
          <span>
            RAW MATERIAL
          </span>

          <strong>
            →
          </strong>

          <span>
            DIGITAL INSTRUCTION
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

      <section
        className="home-how"
        id="how"
      >
        <div className="section-side-label">
          PROCESS
        </div>

        <div className="home-section-heading">
          <div className="section-index">
            01 / HOW IT WORKS
          </div>

          <h2>
            The filament
            <br />

            <span>
              keeps moving.
            </span>
          </h2>

          <p>
            Your project follows
            one connected workflow.
            Upload it, receive your
            quotation, approve it
            and track production
            until completion.
          </p>
        </div>

        <div className="process-track">
          {[
            {
              number:
                "01",

              icon:
                "↑",

              title:
                "Upload",

              text:
                "Send us your STL, 3MF, OBJ, STEP or reference file.",

              meta:
                "INPUT",
            },

            {
              number:
                "02",

              icon:
                "◇",

              title:
                "Review",

              text:
                "We inspect geometry, material, quantity and production requirements.",

              meta:
                "ENGINEERING",
            },

            {
              number:
                "03",

              icon:
                "₪",

              title:
                "Approve",

              text:
                "Receive your quote by email and approve it securely online.",

              meta:
                "QUOTATION",
            },

            {
              number:
                "04",

              icon:
                "✦",

              title:
                "Print",

              text:
                "Production begins and you can track every stage online.",

              meta:
                "OUTPUT",
            },
          ].map(
            (
              step
            ) => (
              <article
                className="process-card"
                key={
                  step.number
                }
              >
                <div className="process-card-beam" />

                <div className="process-number">
                  {
                    step.number
                  }
                </div>

                <div className="process-icon">
                  {
                    step.icon
                  }
                </div>

                <h3>
                  {
                    step.title
                  }
                </h3>

                <p>
                  {
                    step.text
                  }
                </p>

                <div className="process-meta">
                  {
                    step.meta
                  }
                </div>
              </article>
            )
          )}
        </div>
      </section>

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

      {/* START PROJECT */}

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
              The filament
              <br />

              <span>
                reaches you.
              </span>
            </h2>
          </div>

          <p>
            Upload your project.
            We’ll review the file
            and send you a clear
            quotation before
            production starts.
          </p>
        </div>

        <div className="filament-terminal">
          <div className="terminal-feed-light" />

          <div className="terminal-line" />

          <div className="terminal-nozzle">
            <div className="nozzle-heatsink">
              <i />
              <i />
              <i />
              <i />
            </div>

            <div className="nozzle-block" />

            <div className="nozzle-body" />

            <div className="nozzle-tip" />
          </div>

          <div className="terminal-print-glow" />

          <div className="terminal-print">
            <div className="print-layer layer-a" />
            <div className="print-layer layer-b" />
            <div className="print-layer layer-c" />
            <div className="print-layer layer-d" />
            <div className="print-layer layer-e" />
          </div>

          <div className="terminal-bed">
            <div className="terminal-bed-grid" />
          </div>
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