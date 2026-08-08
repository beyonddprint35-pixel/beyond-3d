import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

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
    return "Not reached yet";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not reached yet";
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

function formatFileSize(bytes) {
  if (!bytes) {
    return "";
  }

  return `${(
    Number(bytes) /
    1024 /
    1024
  ).toFixed(2)} MB`;
}

function OrderDetails() {
  const { id } =
    useParams();

  const navigate =
    useNavigate();

  const [order, setOrder] =
    useState(null);

  const [fileUrl, setFileUrl] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    savingQuote,
    setSavingQuote,
  ] =
    useState(false);

  const [
    sendingQuote,
    setSendingQuote,
  ] =
    useState(false);

  const [
    updatingStatus,
    setUpdatingStatus,
  ] =
    useState(false);

  const [
    quoteMessage,
    setQuoteMessage,
  ] =
    useState("");

  const [
    filamentGrams,
    setFilamentGrams,
  ] =
    useState("");

  const [
    printHours,
    setPrintHours,
  ] =
    useState("");

  const [
    pricePerGram,
    setPricePerGram,
  ] =
    useState("1");

  const [
    extraCharge,
    setExtraCharge,
  ] =
    useState("0");

  const [
    deliveryCharge,
    setDeliveryCharge,
  ] =
    useState("0");

  useEffect(() => {
    async function loadOrder() {
      const password =
        sessionStorage.getItem(
          "beyond_admin_password"
        );

      if (!password) {
        navigate("/admin");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            `/.netlify/functions/get-order?id=${encodeURIComponent(
              id
            )}`,
            {
              headers: {
                "x-admin-password":
                  password,
              },
            }
          );

        const data =
          await response.json();

        if (
          response.status ===
          401
        ) {
          sessionStorage.removeItem(
            "beyond_admin_password"
          );

          navigate("/admin");
          return;
        }

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Could not load order."
          );
        }

        setOrder(
          data.order
        );

        setFileUrl(
          data.fileUrl ||
            null
        );

        setFilamentGrams(
          data.order
            .filament_grams ??
            ""
        );

        setPrintHours(
          data.order
            .print_hours ??
            ""
        );

        setPricePerGram(
          data.order
            .price_per_gram ??
            "1"
        );

        setExtraCharge(
          data.order
            .extra_charge ??
            "0"
        );

        setDeliveryCharge(
          data.order
            .delivery_charge ??
            "0"
        );
      } catch (err) {
        console.error(
          err
        );

        setError(
          err.message ||
            "Unable to load order."
        );
      } finally {
        setLoading(
          false
        );
      }
    }

    loadOrder();
  }, [
    id,
    navigate,
  ]);

  const basePrice =
    useMemo(() => {
      return (
        Number(
          filamentGrams ||
            0
        ) *
        Number(
          pricePerGram ||
            0
        )
      );
    }, [
      filamentGrams,
      pricePerGram,
    ]);

  const quoteTotal =
    useMemo(() => {
      const extras =
        Number(
          extraCharge ||
            0
        );

      const delivery =
        Number(
          deliveryCharge ||
            0
        );

      return (
        basePrice +
        extras +
        delivery
      );
    }, [
      basePrice,
      extraCharge,
      deliveryCharge,
    ]);

  const timeline =
    useMemo(() => {
      if (!order) {
        return [];
      }

      return [
        {
          status:
            "Accepted",
          number:
            "01",
          label:
            "Quote accepted",
          description:
            "The customer approved the quotation.",
          date:
            order.accepted_at,
        },
        {
          status:
            "Printing",
          number:
            "02",
          label:
            "Printing started",
          description:
            "The project entered production.",
          date:
            order.printing_at,
        },
        {
          status:
            "Completed",
          number:
            "03",
          label:
            "Order completed",
          description:
            "Production was marked as completed.",
          date:
            order.completed_at,
        },
      ];
    }, [
      order,
    ]);

  function getTimelineIndex() {
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
  }

  async function saveQuote() {
    const password =
      sessionStorage.getItem(
        "beyond_admin_password"
      );

    if (!password) {
      navigate("/admin");
      return;
    }

    try {
      setSavingQuote(
        true
      );

      setQuoteMessage(
        ""
      );

      const response =
        await fetch(
          "/.netlify/functions/save-quote",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              "x-admin-password":
                password,
            },

            body:
              JSON.stringify({
                orderId:
                  id,

                filamentGrams:
                  Number(
                    filamentGrams ||
                      0
                  ),

                printHours:
                  Number(
                    printHours ||
                      0
                  ),

                pricePerGram:
                  Number(
                    pricePerGram ||
                      1
                  ),

                extraCharge:
                  Number(
                    extraCharge ||
                      0
                  ),

                deliveryCharge:
                  Number(
                    deliveryCharge ||
                      0
                  ),

                quoteTotal,
              }),
          }
        );

      const data =
        await response.json();

      if (
        response.status ===
        401
      ) {
        sessionStorage.removeItem(
          "beyond_admin_password"
        );

        navigate("/admin");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not save quote."
        );
      }

      setOrder(
        data.order
      );

      setQuoteMessage(
        "Quote saved successfully."
      );
    } catch (err) {
      console.error(
        err
      );

      setQuoteMessage(
        err.message ||
          "Unable to save quote."
      );
    } finally {
      setSavingQuote(
        false
      );
    }
  }

  async function sendQuote() {
    const password =
      sessionStorage.getItem(
        "beyond_admin_password"
      );

    if (!password) {
      navigate("/admin");
      return;
    }

    if (!order?.email) {
      setQuoteMessage(
        "Customer email is missing."
      );

      return;
    }

    if (
      quoteTotal <= 0
    ) {
      setQuoteMessage(
        "Please create a quotation before sending it."
      );

      return;
    }

    try {
      setSendingQuote(
        true
      );

      setQuoteMessage(
        ""
      );

      const response =
        await fetch(
          "/.netlify/functions/send-quote",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              "x-admin-password":
                password,
            },

            body:
              JSON.stringify({
                orderId:
                  order.id,

                customerName:
                  order.customer_name,

                customerEmail:
                  order.email,

                orderNumber:
                  makeOrderNumber(
                    order.id
                  ),

                material:
                  order.material,

                quantity:
                  order.quantity,

                quoteTotal,
              }),
          }
        );

      const data =
        await response.json();

      if (
        response.status ===
        401
      ) {
        sessionStorage.removeItem(
          "beyond_admin_password"
        );

        navigate("/admin");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not send quote."
        );
      }

      setOrder(
        (
          currentOrder
        ) => ({
          ...currentOrder,
          status:
            "Quoted",
          quote_status:
            "Sent",
        })
      );

      setQuoteMessage(
        "Quote sent successfully to the customer."
      );
    } catch (err) {
      console.error(
        err
      );

      setQuoteMessage(
        err.message ||
          "Unable to send quote."
      );
    } finally {
      setSendingQuote(
        false
      );
    }
  }

  async function updateOrderStatus(
    newStatus
  ) {
    const password =
      sessionStorage.getItem(
        "beyond_admin_password"
      );

    if (!password) {
      navigate("/admin");
      return;
    }

    if (!order?.id) {
      return;
    }

    try {
      setUpdatingStatus(
        true
      );

      setQuoteMessage(
        ""
      );

      const response =
        await fetch(
          "/.netlify/functions/update-order-status",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              "x-admin-password":
                password,
            },

            body:
              JSON.stringify({
                orderId:
                  order.id,

                status:
                  newStatus,
              }),
          }
        );

      const data =
        await response.json();

      if (
        response.status ===
        401
      ) {
        sessionStorage.removeItem(
          "beyond_admin_password"
        );

        navigate("/admin");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not update status."
        );
      }

      setOrder(
        data.order
      );

      setQuoteMessage(
        `Order moved to ${newStatus}.`
      );
    } catch (err) {
      console.error(
        err
      );

      setQuoteMessage(
        err.message ||
          "Unable to update order status."
      );
    } finally {
      setUpdatingStatus(
        false
      );
    }
  }

  if (loading) {
    return (
      <main className="order-details-page">
        <div className="admin-message">
          Loading order...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="order-details-page">
        <div className="admin-error">
          {error}
        </div>
      </main>
    );
  }

  if (!order) {
    return null;
  }

  const orderNumber =
    makeOrderNumber(
      order.id
    );

  const timelineIndex =
    getTimelineIndex();

  return (
    <main className="order-details-page">
      <style>{`
        .admin-model-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 20px;
        }

        .admin-model-heading h2 {
          margin-top: 7px;
        }

        .admin-model-source-badge {
          min-height: 30px;
          padding: 0 11px;
          display: inline-flex;
          align-items: center;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 999px;
          color: #7c8da1;
          background: rgba(255,255,255,.025);
          font-size: 7px;
          font-weight: 700;
          letter-spacing: 1.2px;
          white-space: nowrap;
        }

        .admin-model-source-badge.ai {
          color: #8bb2d5;
          border-color: rgba(82,143,198,.24);
          background: rgba(58,111,160,.08);
        }

        .admin-ai-model-card {
          display: grid;
          grid-template-columns: minmax(240px, .72fr) minmax(0, 1.28fr);
          gap: 22px;
        }

        .admin-ai-model-preview {
          min-height: 250px;
          overflow: hidden;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 18px;
          background:
            radial-gradient(circle at center, rgba(49,99,145,.14), transparent 48%),
            #050b12;
        }

        .admin-ai-model-preview img {
          width: 100%;
          height: 100%;
          min-height: 250px;
          object-fit: cover;
          display: block;
        }

        .admin-ai-model-placeholder {
          display: grid;
          place-items: center;
          gap: 9px;
          color: #5e7990;
        }

        .admin-ai-model-placeholder span {
          font-size: 48px;
          font-weight: 300;
        }

        .admin-ai-model-placeholder strong {
          font-size: 7px;
          letter-spacing: 1.5px;
        }

        .admin-ai-model-info {
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 22px;
        }

        .admin-ai-model-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .admin-ai-model-grid > div {
          min-width: 0;
          padding: 14px;
          border: 1px solid rgba(255,255,255,.055);
          border-radius: 13px;
          background: rgba(255,255,255,.012);
        }

        .admin-ai-model-grid span {
          display: block;
          margin-bottom: 6px;
          color: #526a80;
          font-size: 6px;
          font-weight: 700;
          letter-spacing: 1.2px;
        }

        .admin-ai-model-grid strong {
          display: block;
          overflow: hidden;
          color: #a9bac9;
          font-size: 9px;
          font-weight: 500;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .admin-ai-model-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        @media (max-width: 760px) {
          .admin-ai-model-card {
            grid-template-columns: 1fr;
          }

          .admin-ai-model-grid {
            grid-template-columns: 1fr;
          }

          .admin-model-heading {
            flex-direction: column;
          }
        }
      `}</style>

      <header className="order-details-topbar">
        <div className="logo">
          BEYOND
        </div>

        <Link
          to="/admin"
          className="order-back-button"
        >
          ← Back to Orders
        </Link>
      </header>

      <section className="order-details-heading">
        <div>
          <div className="section-kicker">
            ORDER
          </div>

          <h1>
            {orderNumber}
          </h1>
        </div>

        <span className="admin-status">
          {order.status ||
            "Submitted"}
        </span>
      </section>

      <section className="order-details-grid">

        <article className="order-detail-card">
          <h2>
            Customer
          </h2>

          <div className="order-info-grid">

            <div>
              <span>
                Name
              </span>

              <strong>
                {order.customer_name ||
                  "Not provided"}
              </strong>
            </div>

            <div>
              <span>
                Email
              </span>

              <strong>
                {order.email ||
                  "Not provided"}
              </strong>
            </div>

            <div>
              <span>
                Phone
              </span>

              <strong>
                {order.phone ||
                  "Not provided"}
              </strong>
            </div>

            <div>
              <span>
                Needed by
              </span>

              <strong>
                {formatDate(
                  order.needed_by
                )}
              </strong>
            </div>

          </div>
        </article>

        <article className="order-detail-card">
          <h2>
            Project
          </h2>

          <div className="order-info-grid">

            <div>
              <span>
                Project type
              </span>

              <strong>
                {order.project_type ||
                  "Not specified"}
              </strong>
            </div>

            <div>
              <span>
                Material
              </span>

              <strong>
                {order.material ||
                  "Not specified"}
              </strong>
            </div>

            <div>
              <span>
                Color
              </span>

              <strong>
                {order.color ||
                  "Not specified"}
              </strong>
            </div>

            <div>
              <span>
                Quantity
              </span>

              <strong>
                {order.quantity ||
                  1}
              </strong>
            </div>

          </div>
        </article>

        <article className="order-detail-card order-wide-card">
          <h2>
            Description
          </h2>

          <p className="order-description">
            {order.description ||
              "No description provided."}
          </p>
        </article>

        <article className="order-detail-card order-wide-card">
          <div className="admin-model-heading">
            <div>
              <div className="section-kicker">
                MODEL SOURCE
              </div>

              <h2>
                {order.source_type ===
                "AI_MODEL"
                  ? "AI Generated Model"
                  : "Uploaded Model"}
              </h2>
            </div>

            <span
              className={
                order.source_type ===
                "AI_MODEL"
                  ? "admin-model-source-badge ai"
                  : "admin-model-source-badge"
              }
            >
              {order.source_type ===
              "AI_MODEL"
                ? "AI MODEL"
                : "CUSTOMER FILE"}
            </span>
          </div>

          {order.source_type ===
          "AI_MODEL" ? (
            <div className="admin-ai-model-card">
              <div className="admin-ai-model-preview">
                {order.ai_model_thumbnail_url ? (
                  <img
                    src={
                      order.ai_model_thumbnail_url
                    }
                    alt="AI generated model preview"
                  />
                ) : (
                  <div className="admin-ai-model-placeholder">
                    <span>
                      ◇
                    </span>

                    <strong>
                      AI MODEL
                    </strong>
                  </div>
                )}
              </div>

              <div className="admin-ai-model-info">
                <div className="admin-ai-model-grid">
                  <div>
                    <span>
                      SOURCE
                    </span>

                    <strong>
                      BEYOND AI Studio
                    </strong>
                  </div>

                  <div>
                    <span>
                      GENERATION ID
                    </span>

                    <strong>
                      {order.ai_generation_id ||
                        "Not available"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      MESHY TASK
                    </span>

                    <strong>
                      {order.ai_meshy_task_id ||
                        "Not available"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      CUSTOMER USER ID
                    </span>

                    <strong>
                      {order.user_id ||
                        "Not linked"}
                    </strong>
                  </div>
                </div>

                <div className="admin-ai-model-actions">
                  {order.ai_model_3mf_url ? (
                    <a
                      href={
                        order.ai_model_3mf_url
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="primary-button order-download-button"
                    >
                      Download 3MF
                    </a>
                  ) : (
                    <span className="order-file-unavailable">
                      3MF unavailable
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="order-file-box">

              <div>
                <strong>
                  {order.file_name ||
                    "No file uploaded"}
                </strong>

                {order.file_size && (
                  <span>
                    {formatFileSize(
                      order.file_size
                    )}
                  </span>
                )}
              </div>

              {fileUrl ? (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="primary-button order-download-button"
                >
                  Download File
                </a>
              ) : (
                <span className="order-file-unavailable">
                  No file
                </span>
              )}

            </div>
          )}
        </article>

        <article className="order-detail-card order-wide-card">

          <div className="status-control-header">
            <div>
              <div className="section-kicker">
                ORDER TIMELINE
              </div>

              <h2>
                Production history
              </h2>

              <p>
                Milestones are recorded
                automatically as the order
                progresses.
              </p>
            </div>
          </div>

          <div className="status-buttons">

            {timeline.map(
              (
                step,
                index
              ) => {
                const reached =
                  Boolean(
                    step.date
                  );

                const active =
                  index ===
                  timelineIndex;

                return (
                  <div
                    key={
                      step.status
                    }
                    className={
                      active
                        ? "status-step active"
                        : "status-step"
                    }
                    style={{
                      cursor:
                        "default",
                    }}
                  >
                    <span>
                      {reached
                        ? "✓"
                        : step.number}
                    </span>

                    <div>
                      <strong
                        style={{
                          display:
                            "block",
                          marginBottom:
                            "5px",
                        }}
                      >
                        {step.label}
                      </strong>

                      <small
                        style={{
                          display:
                            "block",
                          color:
                            "#7487a3",
                          fontWeight:
                            400,
                          lineHeight:
                            1.5,
                        }}
                      >
                        {formatDateTime(
                          step.date
                        )}
                      </small>
                    </div>
                  </div>
                );
              }
            )}

          </div>
        </article>

        <article className="order-detail-card order-wide-card status-control-card">

          <div className="status-control-header">
            <div>
              <div className="section-kicker">
                PRODUCTION
              </div>

              <h2>
                Order status
              </h2>

              <p>
                Move this order through
                the production workflow.
              </p>
            </div>

            <span className="admin-status">
              {order.status ||
                "Submitted"}
            </span>
          </div>

          <div className="status-buttons">

            <button
              type="button"
              className={
                order.status ===
                "Accepted"
                  ? "status-step active"
                  : "status-step"
              }
              onClick={() =>
                updateOrderStatus(
                  "Accepted"
                )
              }
              disabled={
                updatingStatus
              }
            >
              <span>
                01
              </span>

              Accepted
            </button>

            <button
              type="button"
              className={
                order.status ===
                "Printing"
                  ? "status-step active"
                  : "status-step"
              }
              onClick={() =>
                updateOrderStatus(
                  "Printing"
                )
              }
              disabled={
                updatingStatus
              }
            >
              <span>
                02
              </span>

              Printing
            </button>

            <button
              type="button"
              className={
                order.status ===
                "Completed"
                  ? "status-step active"
                  : "status-step"
              }
              onClick={() =>
                updateOrderStatus(
                  "Completed"
                )
              }
              disabled={
                updatingStatus
              }
            >
              <span>
                03
              </span>

              Completed
            </button>

          </div>
        </article>

        <article className="order-detail-card order-wide-card quote-card">

          <div className="quote-header">
            <div>
              <div className="section-kicker">
                QUOTATION
              </div>

              <h2>
                Build the customer quote
              </h2>
            </div>

            <span className="quote-status-badge">
              {order.quote_status ||
                "Not Created"}
            </span>
          </div>

          <div className="quote-layout">

            <div className="quote-form">

              <label>
                <span>
                  Filament used
                </span>

                <div className="quote-input-wrap">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      filamentGrams
                    }
                    onChange={(
                      event
                    ) =>
                      setFilamentGrams(
                        event.target.value
                      )
                    }
                    placeholder="120"
                  />

                  <small>
                    grams
                  </small>
                </div>
              </label>

              <label>
                <span>
                  Print time
                </span>

                <div className="quote-input-wrap">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={
                      printHours
                    }
                    onChange={(
                      event
                    ) =>
                      setPrintHours(
                        event.target.value
                      )
                    }
                    placeholder="4.5"
                  />

                  <small>
                    hours
                  </small>
                </div>
              </label>

              <label>
                <span>
                  Price per gram
                </span>

                <div className="quote-input-wrap">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      pricePerGram
                    }
                    onChange={(
                      event
                    ) =>
                      setPricePerGram(
                        event.target.value
                      )
                    }
                  />

                  <small>
                    ₪ / g
                  </small>
                </div>
              </label>

              <label>
                <span>
                  Extra charge
                </span>

                <div className="quote-input-wrap">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      extraCharge
                    }
                    onChange={(
                      event
                    ) =>
                      setExtraCharge(
                        event.target.value
                      )
                    }
                  />

                  <small>
                    ₪
                  </small>
                </div>
              </label>

              <label>
                <span>
                  Delivery
                </span>

                <div className="quote-input-wrap">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      deliveryCharge
                    }
                    onChange={(
                      event
                    ) =>
                      setDeliveryCharge(
                        event.target.value
                      )
                    }
                  />

                  <small>
                    ₪
                  </small>
                </div>
              </label>

            </div>

            <div className="quote-summary">

              <div className="quote-summary-row">
                <span>
                  Material
                </span>

                <strong>
                  ₪
                  {basePrice.toFixed(
                    2
                  )}
                </strong>
              </div>

              <div className="quote-summary-row">
                <span>
                  Extra charge
                </span>

                <strong>
                  ₪
                  {Number(
                    extraCharge ||
                      0
                  ).toFixed(
                    2
                  )}
                </strong>
              </div>

              <div className="quote-summary-row">
                <span>
                  Delivery
                </span>

                <strong>
                  ₪
                  {Number(
                    deliveryCharge ||
                      0
                  ).toFixed(
                    2
                  )}
                </strong>
              </div>

              <div className="quote-divider" />

              <div className="quote-total">
                <span>
                  TOTAL
                </span>

                <strong>
                  ₪
                  {quoteTotal.toFixed(
                    2
                  )}
                </strong>
              </div>

              <div className="quote-actions">

                <button
                  type="button"
                  className="primary-button quote-save-button"
                  onClick={
                    saveQuote
                  }
                  disabled={
                    savingQuote ||
                    sendingQuote ||
                    updatingStatus
                  }
                >
                  {savingQuote
                    ? "Saving..."
                    : "Save Quote"}
                </button>

                <button
                  type="button"
                  className="secondary-button quote-send-button"
                  onClick={
                    sendQuote
                  }
                  disabled={
                    sendingQuote ||
                    savingQuote ||
                    updatingStatus
                  }
                >
                  {sendingQuote
                    ? "Sending..."
                    : "Send Quote to Customer"}
                </button>

              </div>

              {quoteMessage && (
                <div className="quote-message">
                  {quoteMessage}
                </div>
              )}

            </div>

          </div>

        </article>

      </section>

    </main>
  );
}

export default OrderDetails;