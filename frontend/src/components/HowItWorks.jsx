const steps = [
  {
    number: "01",
    title: "Upload",
    text: "Send us your STL, 3MF, OBJ, STEP or reference files.",
  },
  {
    number: "02",
    title: "Review",
    text: "We check the model, material, quantity and print requirements.",
  },
  {
    number: "03",
    title: "Quote",
    text: "You receive a clear quotation before production starts.",
  },
  {
    number: "04",
    title: "Print",
    text: "Once approved, your project moves into production.",
  },
];

function HowItWorks() {
  return (
    <section
  className="how-section"
  id="how-it-works"
>
      <div className="section-heading">
        <div className="section-kicker">
          SIMPLE BY DESIGN
        </div>

        <h2>
          From file to physical.
          <span> Four simple steps.</span>
        </h2>

        <p>
          Beyond removes the friction from custom 3D printing.
          Upload your project and we handle the rest.
        </p>
      </div>

      <div className="steps-grid">
        {steps.map((step) => (
          <article
            className="step-card"
            key={step.number}
          >
            <div className="step-number">
              {step.number}
            </div>

            <div className="step-line"></div>

            <h3>{step.title}</h3>

            <p>{step.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default HowItWorks;