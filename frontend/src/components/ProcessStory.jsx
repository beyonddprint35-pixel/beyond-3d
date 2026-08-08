import {
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import gsap from "gsap";
import {
  ScrollTrigger,
} from "gsap/ScrollTrigger";

import "./ProcessStory.css";

gsap.registerPlugin(
  ScrollTrigger
);

const stages = [
  {
    number: "01",
    eyebrow: "UPLOAD",

    title:
      "Send your model.",

    text:
      "Upload your STL, 3MF, OBJ, STEP or reference file and start your project.",
  },

  {
    number: "02",
    eyebrow: "ANALYZE",

    title:
      "We inspect it.",

    text:
      "We review geometry, size, material and production requirements.",
  },

  {
    number: "03",
    eyebrow: "APPROVE",

    title:
      "You approve the quote.",

    text:
      "Receive a clear digital quotation and approve production online.",
  },

  {
    number: "04",
    eyebrow: "OBJECT",

    title:
      "Your idea becomes real.",

    text:
      "Once approved, your digital design becomes a real physical object ready for production.",
  },
];

/* =========================================================
   UPLOAD
========================================================= */

function UploadVisual({
  progress,
}) {
  return (
    <div className="process-scene upload-scene">
      <div
        className="upload-floating-file"
        style={{
          transform: `
            translateY(${30 - progress * 30}px)
            rotate(${6 - progress * 6}deg)
          `,
        }}
      >
        <div className="upload-file-type">
          3MF
        </div>

        <div className="upload-file-symbol">
          ↑
        </div>

        <strong>
          MODEL.3MF
        </strong>

        <small>
          18.4 MB
        </small>
      </div>

      <div className="upload-target">
        <span>
          DROP YOUR MODEL
        </span>

        <strong>
          UPLOAD
        </strong>
      </div>

      <div className="upload-transfer">
        <span
          style={{
            height:
              `${20 + progress * 80}%`,
          }}
        />
      </div>
    </div>
  );
}

/* =========================================================
   ANALYZE
========================================================= */

function AnalyzeVisual({
  progress,
}) {
  return (
    <div className="process-scene analyze-scene">
      <div className="analyze-model-space">
        <div
          className="analyze-cube analyze-cube-back"
          style={{
            transform: `
              translate(-50%, -50%)
              translate(42px, -28px)
              rotateX(${55 + progress * 15}deg)
              rotateZ(${35 + progress * 40}deg)
            `,
          }}
        />

        <div
          className="analyze-cube analyze-cube-front"
          style={{
            transform: `
              translate(-50%, -50%)
              rotateX(${55 + progress * 15}deg)
              rotateZ(${35 + progress * 40}deg)
            `,
          }}
        >
          B
        </div>

        <div
          className="analyze-scan"
          style={{
            top:
              `${10 + progress * 80}%`,
          }}
        />

        {Array.from({
          length: 8,
        }).map(
          (
            _,
            index
          ) => (
            <span
              className="analyze-point"
              key={index}
              style={{
                left:
                  `${17 + (index % 4) * 22}%`,

                top:
                  `${22 + Math.floor(index / 4) * 47}%`,

                opacity:
                  Math.max(
                    0,
                    Math.min(
                      1,
                      progress * 2 -
                        index * 0.09
                    )
                  ),
              }}
            />
          )
        )}
      </div>

      <div className="analyze-data">
        <span>
          GEOMETRY
          <strong>
            VALID
          </strong>
        </span>

        <span>
          MATERIAL
          <strong>
            PLA+
          </strong>
        </span>

        <span>
          LAYER
          <strong>
            0.20 MM
          </strong>
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   APPROVE
========================================================= */

function ApproveVisual({
  progress,
}) {
  return (
    <div className="process-scene approve-scene">
      <div className="quote-card">
        <div className="quote-heading">
          <div>
            <span>
              BEYOND
            </span>

            <small>
              QUOTATION
            </small>
          </div>

          <strong>
            #2048
          </strong>
        </div>

        <div className="quote-project">
          <span>
            PROJECT
          </span>

          <strong>
            CUSTOM 3D OBJECT
          </strong>
        </div>

        <div className="quote-row">
          <span>
            Material
          </span>

          <strong>
            PLA+
          </strong>
        </div>

        <div className="quote-row">
          <span>
            Quantity
          </span>

          <strong>
            12
          </strong>
        </div>

        <div className="quote-row">
          <span>
            Production
          </span>

          <strong>
            FDM
          </strong>
        </div>

        <div className="quote-total">
          <span>
            TOTAL
          </span>

          <strong>
            ₪480
          </strong>
        </div>

        <div
          className="quote-button"
          style={{
            opacity:
              0.5 +
              progress * 0.5,

            transform:
              `scale(${0.95 + progress * 0.05})`,
          }}
        >
          APPROVE QUOTE

          <span>
            ✓
          </span>
        </div>
      </div>

      <div
        className="approved-stamp"
        style={{
          opacity:
            Math.max(
              0,
              Math.min(
                1,
                (
                  progress -
                  0.55
                ) *
                  2.5
              )
            ),

          transform: `
            rotate(-8deg)
            scale(${0.8 + progress * 0.2})
          `,
        }}
      >
        APPROVED
      </div>
    </div>
  );
}

/* =========================================================
   FINAL OBJECT
========================================================= */

function FinishedVisual({
  progress,
}) {
  return (
    <div className="process-scene finished-scene">
      <div className="finished-product-stage">
        <div className="finished-product-glow" />

        <div
          className="finished-object-shell"
          style={{
            transform: `
              translateY(${20 - progress * 20}px)
              rotateX(${12 - progress * 5}deg)
              rotateY(${-22 + progress * 18}deg)
              rotateZ(${5 - progress * 5}deg)
              scale(${0.9 + progress * 0.1})
            `,
          }}
        >
          <div className="finished-object-face finished-front">
            <span>
              B
            </span>

            <div className="finished-object-groove groove-one" />
            <div className="finished-object-groove groove-two" />
            <div className="finished-object-groove groove-three" />
          </div>

          <div className="finished-object-side" />

          <div className="finished-object-top" />
        </div>

        <div className="finished-object-shadow" />

        <div className="finished-object-axis">
          <span />
          <span />
        </div>
      </div>

      <div className="finished-information">
        <div className="finished-ready">
          <i />

          READY
        </div>

        <span>
          PHYSICAL OUTPUT
        </span>

        <strong>
          Finished Object
        </strong>

        <p>
          Your approved design
          is transformed into
          a real manufactured
          object.
        </p>

        <div className="finished-specs">
          <div>
            <span>
              MATERIAL
            </span>

            <strong>
              PLA+
            </strong>
          </div>

          <div>
            <span>
              PROCESS
            </span>

            <strong>
              FDM
            </strong>
          </div>

          <div>
            <span>
              STATUS
            </span>

            <strong>
              READY
            </strong>
          </div>
        </div>
      </div>

      <div className="finished-output-label">
        DIGITAL

        <span>
          →
        </span>

        PHYSICAL
      </div>
    </div>
  );
}

function StageVisual({
  stageIndex,
  localProgress,
}) {
  if (
    stageIndex === 0
  ) {
    return (
      <UploadVisual
        progress={
          localProgress
        }
      />
    );
  }

  if (
    stageIndex === 1
  ) {
    return (
      <AnalyzeVisual
        progress={
          localProgress
        }
      />
    );
  }

  if (
    stageIndex === 2
  ) {
    return (
      <ApproveVisual
        progress={
          localProgress
        }
      />
    );
  }

  return (
    <FinishedVisual
      progress={
        localProgress
      }
    />
  );
}

/* =========================================================
   MAIN
========================================================= */

function ProcessStory() {
  const sectionRef =
    useRef(null);

  const stickyRef =
    useRef(null);

  const [
    progress,
    setProgress,
  ] = useState(0);

  const [
    stageIndex,
    setStageIndex,
  ] = useState(0);

  const [
    localProgress,
    setLocalProgress,
  ] = useState(0);

  useLayoutEffect(() => {
    if (
      !sectionRef.current ||
      !stickyRef.current
    ) {
      return;
    }

    const context =
      gsap.context(() => {
        ScrollTrigger.create({
          trigger:
            sectionRef.current,

          start:
            "top top",

          end:
            "+=2800",

          pin:
            stickyRef.current,

          scrub:
            0.8,

          anticipatePin:
            1,

          invalidateOnRefresh:
            true,

          onUpdate:
            (self) => {
              const p =
                self.progress;

              setProgress(p);

              const exactStage =
                Math.min(
                  3.9999,
                  p * 4
                );

              const nextStage =
                Math.floor(
                  exactStage
                );

              const nextLocal =
                exactStage -
                nextStage;

              setStageIndex(
                nextStage
              );

              setLocalProgress(
                nextLocal
              );
            },
        });
      }, sectionRef);

    const timer =
      window.setTimeout(
        () => {
          ScrollTrigger.refresh();
        },
        100
      );

    return () => {
      window.clearTimeout(
        timer
      );

      context.revert();
    };
  }, []);

  const stage =
    stages[
      stageIndex
    ];

  return (
    <section
      ref={sectionRef}
      className="process-story-section"
      id="how"
    >
      <div
        ref={stickyRef}
        className="process-story-sticky"
      >
        <div className="process-story-bg" />

        <div className="process-story-orb process-story-orb-one" />

        <div className="process-story-orb process-story-orb-two" />

        <div className="process-story-shell">
          <div className="process-story-topbar">
            <span>
              01 / HOW IT WORKS
            </span>

            <div className="process-story-dots">
              {stages.map(
                (
                  item,
                  index
                ) => (
                  <div
                    key={
                      item.number
                    }
                    className={[
                      index ===
                      stageIndex
                        ? "active"
                        : "",

                      index <
                      stageIndex
                        ? "complete"
                        : "",
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        " "
                      )}
                  >
                    <span />

                    {
                      item.number
                    }
                  </div>
                )
              )}
            </div>
          </div>

          <div className="process-story-content">
            <div className="process-story-copy">
              <div
                className="process-story-index"
                key={
                  `index-${stage.number}`
                }
              >
                {
                  stage.number
                }
              </div>

              <div className="process-story-eyebrow">
                {
                  stage.eyebrow
                }
              </div>

              <h2
                key={
                  `title-${stage.number}`
                }
              >
                {
                  stage.title
                }
              </h2>

              <p>
                {
                  stage.text
                }
              </p>

              <div className="process-story-mini-status">
                <span>
                  CURRENT STAGE
                </span>

                <strong>
                  {
                    stage.eyebrow
                  }
                </strong>
              </div>
            </div>

            <div className="process-story-window">
              <div className="process-story-window-head">
                <div className="window-dots">
                  <span />
                  <span />
                  <span />
                </div>

                <span>
                  BEYOND /{" "}
                  {
                    stage.eyebrow
                  }
                </span>

                <strong>
                  {
                    stage.number
                  }
                  /04
                </strong>
              </div>

              <div
                className="process-story-visual"
                key={
                  stageIndex
                }
              >
                <StageVisual
                  stageIndex={
                    stageIndex
                  }
                  localProgress={
                    localProgress
                  }
                />
              </div>

              <div className="process-window-corners">
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>

          <div className="process-story-footer">
            <div className="process-footer-stage">
              <span>
                WORKFLOW
              </span>

              <strong>
                {
                  stage.eyebrow
                }
              </strong>
            </div>

            <div className="process-story-progress">
              <i
                style={{
                  width:
                    `${progress * 100}%`,
                }}
              />
            </div>

            <strong className="process-footer-counter">
              {String(
                stageIndex +
                  1
              ).padStart(
                2,
                "0"
              )}

              <span>
                /
              </span>

              04
            </strong>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProcessStory;