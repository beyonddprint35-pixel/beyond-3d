import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useSearchParams,
} from "react-router-dom";

import Brand from "../components/Brand";

import "./TrackOrder.css";

function makeOrderNumber(id) {
  if (!id) {
    return "B3D-UNKNOWN";
  }

  return (
    "B3D-" +
    String(id)
      .slice(0, 8)
      .toUpperCase()
  );
}

function formatDate(value) {
  if (!value) {
    return "Not specified";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IL",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
}

function formatDateTime(value) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.toLocaleString(
    "en-IL",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function formatCurrency(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  return `₪${Number(
    value
  ).toLocaleString(
    "en-IL",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function TrackOrder() {
  const [searchParams] =
    useSearchParams();

  const id =
    searchParams.get("id");

  const token =
    searchParams.get("token");

  const [order, setOrder] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadOrder() {
      if (!id || !token) {
        setError(
          "This tracking link is invalid."
        );

        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            `/.netlify/functions/track-order?id=${encodeURIComponent(
              id
            )}&token=${encodeURIComponent(
              token
            )}`
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "We could not load this order."
          );
        }

        setOrder(
          data.order
        );
      } catch (err) {
        console.error(err);

        setError(
          err.message ||
            "We could not load this order."
        );
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [
    id,
    token,
  ]);

  const workflow =
    useMemo(() => {
      if (!order) {
        return [];
      }

      return [
        {
          key: "Accepted",
          number: "01",
          title: "Accepted",
          description:
            "Your quotation has been approved.",
          date:
            order.accepted_at,
        },
        {
          key: "Printing",
          number: "02",
          title: "Printing",
          description:
            "Your project is currently in production.",
          date:
            order.printing_at,
        },
        {
          key: "Completed",
          number: "03",
          title: "Completed",
          description:
            "Your project has been completed.",
          date:
            order.completed_at,
        },
      ];
    }, [order]);

  const currentStep =
    useMemo(() => {
      if (!order) {
        return -1;
      }

      if (
        order.status ===
        "Completed"
      ) {
        return 2;
      }

      if (
        order.status ===
        "Printing"
      ) {
        return 1;
      }

      if (
        order.status ===
        "Accepted"
      ) {
        return 0;
      }

      return -1;
    }, [order]);

  if (loading) {
    return (
      <main className="tracking-page">
        <header className="tracking-topbar">
          <Brand
            size={40}
            textSize={16}
            gap={10}
          />

          <span>
            Order Tracking
          </span>
        </header>

        <section className="tracking-state-card">
          <h1>
            Loading your order
          </h1>

          <p>
            One moment while we retrieve
            the latest production status.
          </p>
        </section>
      </main>
    );
  }

  if (
    error ||
    !order
  ) {
    return (
      <main className="tracking-page">
        <header className="tracking-topbar">
          <Brand
            size={40}
            textSize={16}
            gap={10}
          />

          <span>
            Order Tracking
          </span>
        </header>

        <section className="tracking-state-card">
          <div className="tracking-error-icon">
            !
          </div>

          <h1>
            Unable to load order
          </h1>

          <p>
            {error}
          </p>

          <Link
            to="/"
            className="tracking-home-button"
          >
            Return to Beyond
          </Link>
        </section>
      </main>
    );
  }

  const orderNumber =
    makeOrderNumber(
      order.id
    );

  return (
    <main className="tracking-page">
      <header className="tracking-topbar">
        <Brand
          size={40}
          textSize={16}
          gap={10}
        />

        <span>
          Order Tracking
        </span>
      </header>

      <section className="tracking-hero">
        <div>
          <div className="tracking-kicker">
            ORDER STATUS
          </div>

          <h1>
            Track your
            <span>
              {" "}
              project.
            </span>
          </h1>

          <p>
            Follow your Beyond
            project from approval
            through production and
            completion.
          </p>
        </div>

        <div className="tracking-order-badge">
          <span>
            ORDER
          </span>

          <strong>
            {orderNumber}
          </strong>
        </div>
      </section>

      <section className="tracking-main-card">
        <div className="tracking-status-heading">
          <div>
            <span>
              CURRENT STATUS
            </span>

            <h2>
              {order.status}
            </h2>
          </div>

          <div className="tracking-live-indicator">
            <span />
            Live status
          </div>
        </div>

        <div className="tracking-progress">
          {workflow.map(
            (
              step,
              index
            ) => {
              const completed =
                index <
                currentStep;

              const active =
                index ===
                currentStep;

              let className =
                "tracking-step";

              if (completed) {
                className +=
                  " completed";
              }

              if (active) {
                className +=
                  " active";
              }

              if (
                index >
                currentStep
              ) {
                className +=
                  " future";
              }

              return (
                <div
                  className={
                    className
                  }
                  key={
                    step.key
                  }
                >
                  <div className="tracking-step-marker">
                    {completed
                      ? "✓"
                      : step.number}
                  </div>

                  <div className="tracking-step-content">
                    <strong>
                      {step.title}
                    </strong>

                    <span>
                      {
                        step.description
                      }
                    </span>

                    {step.date && (
                      <span
                        style={{
                          marginTop:
                            "8px",
                          color:
                            "#6fa8ff",
                        }}
                      >
                        {formatDateTime(
                          step.date
                        )}
                      </span>
                    )}
                  </div>

                  {index <
                    workflow.length -
                      1 && (
                    <div className="tracking-step-line" />
                  )}
                </div>
              );
            }
          )}
        </div>
      </section>

      <section className="tracking-details-grid">
        <article className="tracking-detail-card">
          <span>
            PROJECT
          </span>

          <strong>
            {order.project_type ||
              "3D Printing"}
          </strong>
        </article>

        <article className="tracking-detail-card">
          <span>
            MATERIAL
          </span>

          <strong>
            {order.material ||
              "Not specified"}
          </strong>
        </article>

        <article className="tracking-detail-card">
          <span>
            COLOR
          </span>

          <strong>
            {order.color ||
              "Not specified"}
          </strong>
        </article>

        <article className="tracking-detail-card">
          <span>
            QUANTITY
          </span>

          <strong>
            {order.quantity ||
              1}
          </strong>
        </article>
      </section>

      <section className="tracking-summary">
        <div>
          <span>
            CUSTOMER
          </span>

          <strong>
            {order.customer_name ||
              "Beyond customer"}
          </strong>
        </div>

        <div>
          <span>
            NEEDED BY
          </span>

          <strong>
            {formatDate(
              order.needed_by
            )}
          </strong>
        </div>

        <div>
          <span>
            ORDER VALUE
          </span>

          <strong>
            {formatCurrency(
              order.quote_total
            )}
          </strong>
        </div>
      </section>
    </main>
  );
}

export default TrackOrder;
