import {
  useEffect,
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
          response.status === 401
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

        setOrder(data.order);
        setFileUrl(
          data.fileUrl || null
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

      </section>

    </main>
  );
}

export default OrderDetails;