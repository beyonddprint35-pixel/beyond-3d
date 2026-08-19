import {
  useEffect,
  useState,
} from "react";

import "./ReviewsSection.css";


const reviews = [
  {
    name: "Daniel R.",

    companyEn:
      "Product Designer",

    companyHe:
      "מעצב מוצר",

    projectEn:
      "Prototype",

    projectHe:
      "אב־טיפוס",

    rating: 5,

    textEn:
      "The process was incredibly smooth. I uploaded the model, received a clear quote, and the final print came out exactly as expected.",

    textHe:
      "התהליך היה חלק במיוחד. העליתי את המודל, קיבלתי הצעת מחיר ברורה, וההדפסה הסופית יצאה בדיוק כפי שציפיתי.",
  },

  {
    name: "Maya L.",

    companyEn:
      "Small Business Owner",

    companyHe:
      "בעלת עסק קטן",

    projectEn:
      "Custom Product",

    projectHe:
      "מוצר בהתאמה אישית",

    rating: 5,

    textEn:
      "What I liked most was the communication. Everything was clear from the beginning and the finished parts looked very professional.",

    textHe:
      "מה שהכי אהבתי היה התקשורת. הכול היה ברור מההתחלה, והחלקים המוגמרים נראו מקצועיים מאוד.",
  },

  {
    name: "Eli S.",

    companyEn:
      "Engineer",

    companyHe:
      "מהנדס",

    projectEn:
      "Functional Part",

    projectHe:
      "חלק פונקציונלי",

    rating: 5,

    textEn:
      "Fast turnaround, clean finish and good attention to the details of the model. I would definitely use Beyond again.",

    textHe:
      "זמן ביצוע מהיר, גימור נקי ותשומת לב מצוינת לפרטים של המודל. בהחלט אשתמש שוב ב־BEYOND.",
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


function Stars({
  rating,
}) {
  return (
    <div
      className="reviews-stars"
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({
        length: 5,
      }).map(
        (
          _,
          index
        ) => (
          <span
            key={index}
            className={
              index <
              rating
                ? "active"
                : ""
            }
          >
            ★
          </span>
        )
      )}
    </div>
  );
}


function ReviewsSection() {

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
      className="reviews-section"
      id="reviews"
      data-beyond-reviews="true"
      data-no-beyond-translate="true"
    >

      <div className="reviews-glow reviews-glow-one" />
      <div className="reviews-glow reviews-glow-two" />


      <div className="section-side-label">
        {isHebrew
          ? "ביקורות"
          : "REVIEWS"}
      </div>


      <div className="reviews-heading">

        <div>

          <div
            className="section-index"
            data-reviews-kicker="true"
          >
            {isHebrew
              ? ""
              : "03 / CUSTOMER REVIEWS"}
          </div>


          <h2 data-reviews-title="true">

            {isHebrew
              ? "הפך למציאות."
              : "Made real."}

            <br />

            <span>
              {isHebrew
                ? "לקוחות שסומכים עלינו."
                : "Trusted by people."}
            </span>

          </h2>

        </div>


        <p data-reviews-description="true">

          {isHebrew
            ? "פרויקטים אמיתיים, תקשורת ברורה ותוצאה פיזית שתואמת לרעיון הדיגיטלי."
            : "Real projects, clear communication and physical results that match the digital idea."}

        </p>

      </div>


      <div className="reviews-summary">

        <div className="reviews-score">

          <strong>
            5.0
          </strong>


          <Stars rating={5} />


          <span>
            {isHebrew
              ? "דירוג לקוחות"
              : "CUSTOMER RATING"}
          </span>

        </div>


        <div className="reviews-summary-line" />


        <div className="reviews-summary-copy">

          <span>
            {isHebrew
              ? "חוויית הלקוח"
              : "CUSTOMER EXPERIENCE"}
          </span>


          <strong>
            {isHebrew
              ? "מהעלאת הקובץ ועד לאובייקט המוגמר."
              : "From upload to finished object."}
          </strong>

        </div>

      </div>


      <div className="reviews-grid">

        {reviews.map(
          (
            review,
            index
          ) => (

            <article
              className={
                index === 0
                  ? "review-card review-card-featured"
                  : "review-card"
              }
              key={review.name}
              dir={
                isHebrew
                  ? "rtl"
                  : "ltr"
              }
            >

              <div className="review-card-top">

                <Stars
                  rating={
                    review.rating
                  }
                />


                <span>
                  {String(
                    index + 1
                  ).padStart(
                    2,
                    "0"
                  )}
                </span>

              </div>


              <blockquote>

                “
                {isHebrew
                  ? review.textHe
                  : review.textEn}
                ”

              </blockquote>


              <div className="review-card-footer">

                <div>

                  <strong>
                    {review.name}
                  </strong>


                  <span>
                    {isHebrew
                      ? review.companyHe
                      : review.companyEn}
                  </span>

                </div>


                <div className="review-project">

                  <span>
                    {isHebrew
                      ? "פרויקט"
                      : "PROJECT"}
                  </span>


                  <strong>
                    {isHebrew
                      ? review.projectHe
                      : review.projectEn}
                  </strong>

                </div>

              </div>


              <div className="review-verified">

                <i />

                {isHebrew
                  ? "חוות דעת לקוח"
                  : "CUSTOMER REVIEW"}

              </div>

            </article>

          )
        )}

      </div>

    </section>
  );
}


export default ReviewsSection;
