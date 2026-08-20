import "./ReviewsSection.css";

const reviews = [
  {
    name: "Daniel R.",
    company:
      "Product Designer",
    project:
      "Prototype",
    rating: 5,

    text:
      "The process was incredibly smooth. I uploaded the model, received a clear quote, and the final print came out exactly as expected.",
  },

  {
    name: "Maya L.",
    company:
      "Small Business Owner",
    project:
      "Custom Product",
    rating: 5,

    text:
      "What I liked most was the communication. Everything was clear from the beginning and the finished parts looked very professional.",
  },

  {
    name: "Eli S.",
    company:
      "Engineer",
    project:
      "Functional Part",
    rating: 5,

    text:
      "Fast turnaround, clean finish and good attention to the details of the model. I would definitely use Beyond again.",
  },
];

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
  return (
    <section
      className="reviews-section"
      id="reviews"
    >
      <div className="reviews-glow reviews-glow-one" />
      <div className="reviews-glow reviews-glow-two" />

      <div className="section-side-label">
        REVIEWS
      </div>

      <div className="reviews-heading">
        <div>
          <div className="section-index">
            03 / CUSTOMER REVIEWS
          </div>

          <h2>
            Made real.
            <br />

            <span>
              Trusted by people.
            </span>
          </h2>
        </div>

        <p>
          Real projects, clear
          communication and
          physical results that
          match the digital idea.
        </p>
      </div>

      <div className="reviews-summary">
        <div className="reviews-score">
          <strong>
            5.0
          </strong>

          <Stars rating={5} />

          <span>
            CUSTOMER RATING
          </span>
        </div>

        <div className="reviews-summary-line" />

        <div className="reviews-summary-copy">
          <span>
            CUSTOMER EXPERIENCE
          </span>

          <strong>
            From upload to finished object.
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
              key={
                review.name
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
                {
                  review.text
                }
                ”
              </blockquote>

              <div className="review-card-footer">
                <div>
                  <strong>
                    {
                      review.name
                    }
                  </strong>

                  <span>
                    {
                      review.company
                    }
                  </span>
                </div>

                <div className="review-project">
                  <span>
                    PROJECT
                  </span>

                  <strong>
                    {
                      review.project
                    }
                  </strong>
                </div>
              </div>

              <div className="review-verified">
                <i />

                CUSTOMER REVIEW
              </div>
            </article>
          )
        )}
      </div>
    </section>
  );
}

export default ReviewsSection;