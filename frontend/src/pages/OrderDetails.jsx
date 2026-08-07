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

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
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
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] =
    useState(null);

  const [fileUrl, setFileUrl] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [savingQuote, setSavingQuote] =
    useState(false);

  const [sendingQuote, setSendingQuote] =
    useState(false);

  const [quoteMessage, setQuoteMessage] =
    useState("");

  const [filamentGrams, setFilamentGrams] =
    useState("");

  const [printHours, setPrintHours] =
    useState("");

  const [pricePerGram, setPricePerGram] =
    useState("1");

  const [extraCharge, setExtraCharge] =
    useState("0");

  const [deliveryCharge, setDeliveryCharge] =
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

        if (response.status === 401) {
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

        setOrder(data.order);

        setFileUrl(
          data.fileUrl || null
        );

        setFilamentGrams(
          data.order.filament_grams ??
            ""
        );

        setPrintHours(
          data.order.print_hours ??
            ""
        );

        setPricePerGram(
          data.order.price_per_gram ??
            "1"
        );

        setExtraCharge(
          data.order.extra_charge ??
            "0"
        );

        setDeliveryCharge(
          data.order.delivery_charge ??
            "0"
        );
      } catch (err) {
        console.error(err);

        setError(
          err.message ||
            "Unable to load order."
        );
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [id, navigate]);

  const basePrice =
    useMemo(() => {
      return (
        Number(filamentGrams || 0) *
        Number(pricePerGram || 0)
      );
    }, [
      filamentGrams,
      pricePerGram,
    ]);

  const quoteTotal =
    useMemo(() => {
      const extras =
        Number(extraCharge || 0);

      const delivery =
        Number(deliveryCharge || 0);

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
      setSavingQuote(true);
      setQuoteMessage("");

      const response =
        await fetch(
          "/.netlify/functions/save-quote",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              "x-admin-password":
                password,
            },

            body: JSON.stringify({
              orderId: id,

              filamentGrams:
                Number(
                  filamentGrams || 0
                ),

              printHours:
                Number(
                  printHours || 0
                ),

              pricePerGram:
                Number(
                  pricePerGram || 1
                ),

              extraCharge:
                Number(
                  extraCharge || 0
                ),

              deliveryCharge:
                Number(
                  deliveryCharge || 0
                ),

              quoteTotal,
            }),
          }
        );

      const data =
        await response.json();

      if (response.status === 401) {
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

      setOrder(data.order);

      setQuoteMessage(
        "Quote saved successfully."
      );
    } catch (err) {
      console.error(err);

      setQuoteMessage(
        err.message ||
          "Unable to save quote."
      );
    } finally {
      setSavingQuote(false);
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

    if (quoteTotal <= 0) {
      setQuoteMessage(
        "Please create a quotation before sending it."
      );

      return;
    }

    try {
      setSendingQuote(true);
      setQuoteMessage("");

      const response =
        await fetch(
          "/.netlify/functions/send-quote",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              "x-admin-password":
                password,
            },

            body: JSON.stringify({
              customerName:
                order.customer_name,

              customerEmail:
                order.email,

              orderNumber:
                makeOrderNumber(order.id),

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

      if (response.status === 401) {
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

      setQuoteMessage(
        "Quote sent successfully to the customer."
      );
    } catch (err) {
      console.error(err);

      setQuoteMessage(
        err.message ||
          "Unable to send quote."
      );
    } finally {
      setSendingQuote(false);
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
    makeOrderNumber(order.id);

  return (
    <main className="order-details-page">
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
              <span>Name</span>

              <strong>
                {order.customer_name ||
                  "Not provided"}
              </strong>
            </div>

            <div>
              <span>Email</span>

              <strong>
                {order.email ||
                  "Not provided"}
              </strong>
            </div>

            <div>
              <span>Phone</span>

              <strong>
                {order.phone ||
                  "Not provided"}
              </strong>
            </div>

            <div>
              <span>Needed by</span>

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
                {order.quantity || 1}
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
          <h2>
            Uploaded Model
          </h2>

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
                    value={filamentGrams}
                    onChange={(event) =>
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
                    value={printHours}
                    onChange={(event) =>
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
                    value={pricePerGram}
                    onChange={(event) =>
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
                    value={extraCharge}
                    onChange={(event) =>
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
                    value={deliveryCharge}
                    onChange={(event) =>
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
                  ₪{basePrice.toFixed(2)}
                </strong>
              </div>

              <div className="quote-summary-row">
                <span>
                  Extra charge
                </span>

                <strong>
                  ₪{Number(
                    extraCharge || 0
                  ).toFixed(2)}
                </strong>
              </div>

              <div className="quote-summary-row">
                <span>
                  Delivery
                </span>

                <strong>
                  ₪{Number(
                    deliveryCharge || 0
                  ).toFixed(2)}
                </strong>
              </div>

              <div className="quote-divider" />

              <div className="quote-total">
                <span>
                  TOTAL
                </span>

                <strong>
                  ₪{quoteTotal.toFixed(2)}
                </strong>
              </div>

              <div className="quote-actions">
                <button
                  type="button"
                  className="primary-button quote-save-button"
                  onClick={saveQuote}
                  disabled={
                    savingQuote ||
                    sendingQuote
                  }
                >
                  {savingQuote
                    ? "Saving..."
                    : "Save Quote"}
                </button>

                <button
                  type="button"
                  className="secondary-button quote-send-button"
                  onClick={sendQuote}
                  disabled={
                    sendingQuote ||
                    savingQuote
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