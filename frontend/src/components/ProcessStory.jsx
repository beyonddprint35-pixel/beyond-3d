import {
  useEffect,
  useState,
} from "react";

import "./ProcessStory.css";


const steps = [
  {
    number: "01",

    labelEn: "UPLOAD",
    labelHe: "העלאה",

    titleEn: "Send your model",
    titleHe: "שלחו את המודל",

    textEn:
      "Upload your STL, 3MF, OBJ or STEP file with the project details.",

    textHe:
      "העלו קובץ STL, 3MF, OBJ או STEP יחד עם פרטי הפרויקט.",

    icon: "↑",
  },

  {
    number: "02",

    labelEn: "REVIEW",
    labelHe: "בדיקה",

    titleEn: "We review it",
    titleHe: "אנחנו בודקים אותו",

    textEn:
      "We check geometry, material, size and printability.",

    textHe:
      "אנחנו בודקים גאומטריה, חומר, גודל והתאמה להדפסה.",

    icon: "◇",
  },

  {
    number: "03",

    labelEn: "APPROVE",
    labelHe: "אישור",

    titleEn: "Approve the quote",
    titleHe: "אשרו את הצעת המחיר",

    textEn:
      "Receive a clear quotation and approve production online.",

    textHe:
      "קבלו הצעת מחיר ברורה ואשרו את הייצור אונליין.",

    icon: "✓",
  },

  {
    number: "04",

    labelEn: "PRINT",
    labelHe: "הדפסה",

    titleEn: "We make it real",
    titleHe: "אנחנו הופכים אותו למציאות",

    textEn:
      "Production begins and your digital idea becomes a physical object.",

    textHe:
      "הייצור מתחיל והרעיון הדיגיטלי שלכם הופך לאובייקט פיזי.",

    icon: "▣",
  },
];


function getIsHebrew() {
  if (
    typeof document ===
    "undefined"
  ) {
    return false;
  }

  return (
    document.documentElement
      .getAttribute(
        "data-beyond-language"
      ) === "he"
  );
}


function ProcessStory() {

  const [
    isHebrew,
    setIsHebrew,
  ] = useState(
    getIsHebrew
  );


  useEffect(
    () => {

      const syncLanguage = () => {
        setIsHebrew(
          getIsHebrew()
        );
      };


      window.addEventListener(
        "beyond-language-change",
        syncLanguage
      );


      const observer =
        new MutationObserver(
          syncLanguage
        );


      observer.observe(
        document.documentElement,
        {
          attributes: true,

          attributeFilter: [
            "data-beyond-language",
          ],
        }
      );


      syncLanguage();


      return () => {

        window.removeEventListener(
          "beyond-language-change",
          syncLanguage
        );

        observer.disconnect();
      };

    },
    []
  );


  return (
    <section
      className="process-story-section"
      id="how"
      data-no-beyond-translate="true"
    >
      <div className="process-story-shell">

        <div className="process-story-heading">

          <div>

            <div className="process-story-kicker">
              {isHebrew
                ? "01 / איך זה עובד"
                : "01 / HOW IT WORKS"}
            </div>


            <h2>
              {isHebrew
                ? "ארבעה שלבים."
                : "Four steps."}

              <span>
                {" "}
                {isHebrew
                  ? "תהליך אחד פשוט."
                  : "One simple process."}
              </span>
            </h2>

          </div>


          <p>
            {isHebrew
              ? "מהקובץ הדיגיטלי ועד לאובייקט מודפס בתלת־ממד — בלי מורכבות מיותרת."
              : "From your digital file to a finished 3D-printed object — without unnecessary complexity."}
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
            ) => (

              <article
                className="process-compact-card"
                key={step.number}
              >

                <div className="process-card-top">

                  <span className="process-card-number">
                    {step.number}
                  </span>


                  <span className="process-card-label">
                    {isHebrew
                      ? step.labelHe
                      : step.labelEn}
                  </span>

                </div>


                <div className="process-card-icon">
                  {step.icon}
                </div>


                <h3>
                  {isHebrew
                    ? step.titleHe
                    : step.titleEn}
                </h3>


                <p>
                  {isHebrew
                    ? step.textHe
                    : step.textEn}
                </p>


                {index <
                  steps.length - 1 && (

                  <div className="process-card-arrow">
                    →
                  </div>

                )}

              </article>

            )
          )}

        </div>

      </div>
    </section>
  );
}


export default ProcessStory;
