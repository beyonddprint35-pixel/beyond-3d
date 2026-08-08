import {
  Upload,
  ScanSearch,
  FileCheck2,
  Box,
} from "lucide-react";

import "./ProcessStory.css";

const steps = [
  {
    number: "01",
    label: "UPLOAD",
    title: "Send your model",
    text:
      "Upload your STL, 3MF, OBJ or STEP file with the project details.",
    icon: Upload,
  },
  {
    number: "02",
    label: "REVIEW",
    title: "We review it",
    text:
      "We check geometry, material, size and printability.",
    icon: ScanSearch,
  },
  {
    number: "03",
    label: "APPROVE",
    title: "Approve the quote",
    text:
      "Receive a clear quotation and approve production online.",
    icon: FileCheck2,
  },
  {
    number: "04",
    label: "PRINT",
    title: "We make it real",
    text:
      "Production begins and your digital idea becomes a physical object.",
    icon: Box,
  },
];

function ProcessStory() {
  return (
    <section
      className="process-story-section"
      id="how"
    >
      <div className="process-story-shell">
        <div className="process-story-heading">
          <div>
            <div className="process-story-kicker">
              01 / HOW IT WORKS
            </div>

            <h2>
              Four steps.
              <span>
                {" "}
                One simple process.
              </span>
            </h2>
          </div>

          <p>
            From your digital file
            to a finished 3D-printed
            object — without
            unnecessary complexity.
          </p>
        </div>

        <div className="process-compact-flow">
          <div className="process-flow-line">
            <span />
          </div>

          {steps.map(
            (
              step,
              index
            ) => {
              const Icon =
                step.icon;

              return (
                <article
                  className="process-compact-card"
                  key={
                    step.number
                  }
                >
                  <div className="process-card-top">
                    <span className="process-card-number">
                      {
                        step.number
                      }
                    </span>

                    <span className="process-card-label">
                      {
                        step.label
                      }
                    </span>
                  </div>

                  <div className="process-card-icon">
                    <Icon
                      size={30}
                      strokeWidth={
                        1.5
                      }
                      aria-hidden="true"
                    />
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

                  {index <
                    steps.length -
                      1 && (
                    <div
                      className="process-card-arrow"
                      aria-hidden="true"
                    >
                      →
                    </div>
                  )}
                </article>
              );
            }
          )}
        </div>
      </div>
    </section>
  );
}

export default ProcessStory;