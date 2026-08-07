function Hero() {
  function scrollToSection(id) {
    const section =
      document.getElementById(id);

    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  return (
    <section className="hero">
      <div className="hero-glow hero-glow-one" />
      <div className="hero-glow hero-glow-two" />

      <div className="hero-content">
        <div className="hero-badge">
          NEXT-GENERATION 3D PRINTING
        </div>

        <h1>
          Bring your ideas
          <span> beyond.</span>
        </h1>

        <p>
          Upload your model, choose your
          material, and turn your idea into
          a real object. Fast, simple and
          beautifully made.
        </p>

        <div className="hero-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() =>
              scrollToSection("upload")
            }
          >
            Upload Your Model
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              scrollToSection(
                "how-it-works"
              )
            }
          >
            How It Works
          </button>
        </div>

        <div className="hero-stats">
          <div>
            <strong>24h+</strong>
            <span>Fast turnaround</span>
          </div>

          <div>
            <strong>0.2mm</strong>
            <span>Fine layer printing</span>
          </div>

          <div>
            <strong>PLA / PETG</strong>
            <span>Quality materials</span>
          </div>
        </div>
      </div>

      <div className="hero-visual">
        <div className="model-shell">
          <div className="model-core">
            <div className="model-ring ring-one" />
            <div className="model-ring ring-two" />

            <div className="model-object">
              B
            </div>
          </div>

          <div className="floating-card floating-card-one">
            <span>FILAMENT</span>
            <strong>128 g</strong>
          </div>

          <div className="floating-card floating-card-two">
            <span>STATUS</span>
            <strong>Ready to print</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;