import { useEffect, useState } from "react";

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

function Admin() {
  const [orders, setOrders] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [password, setPassword] =
    useState(
      sessionStorage.getItem(
        "beyond_admin_password"
      ) || ""
    );

  async function loadOrders(
    adminPassword
  ) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/.netlify/functions/get-orders",
        {
          headers: {
            "x-admin-password":
              adminPassword,
          },
        }
      );

      const data =
        await response.json();

      if (response.status === 401) {
        sessionStorage.removeItem(
          "beyond_admin_password"
        );

        setPassword("");
        setOrders([]);

        throw new Error(
          "Incorrect admin password."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not load orders."
        );
      }

      setOrders(
        data.orders || []
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to load orders."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (password) {
      loadOrders(password);
    } else {
      setLoading(false);
    }
  }, []);

  function handleLogin(event) {
    event.preventDefault();

    const formData =
      new FormData(
        event.currentTarget
      );

    const enteredPassword =
      String(
        formData.get("password") ||
          ""
      );

    if (!enteredPassword) {
      return;
    }

    sessionStorage.setItem(
      "beyond_admin_password",
      enteredPassword
    );

    setPassword(
      enteredPassword
    );

    loadOrders(
      enteredPassword
    );
  }

  function handleLogout() {
    sessionStorage.removeItem(
      "beyond_admin_password"
    );

    setPassword("");
    setOrders([]);
  }

  const submitted =
    orders.filter(
      (order) =>
        String(order.status)
          .toLowerCase() ===
        "submitted"
    ).length;

  const printing =
    orders.filter(
      (order) =>
        String(order.status)
          .toLowerCase() ===
        "printing"
    ).length;

  const completed =
    orders.filter(
      (order) =>
        String(order.status)
          .toLowerCase() ===
        "completed"
    ).length;

  if (!password) {
    return (
      <main className="admin-login-page">
        <section className="admin-login-card">
          <div className="section-kicker">
            BEYOND ADMIN
          </div>

          <h1>
            Welcome back.
          </h1>

          <p>
            Enter your admin
            password to continue.
          </p>

          <form
            onSubmit={
              handleLogin
            }
          >
            <input
              type="password"
              name="password"
              placeholder="Admin password"
              required
            />

            <button
              type="submit"
              className="primary-button"
            >
              Login
            </button>
          </form>

          {error && (
            <div className="admin-error">
              {error}
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <div>
          <div className="logo">
            BEYOND
          </div>

          <span>
            Admin Dashboard
          </span>
        </div>

        <button
          type="button"
          className="admin-logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </header>

      <section className="admin-heading">
        <div>
          <div className="section-kicker">
            OPERATIONS
          </div>

          <h1>
            Orders
          </h1>

          <p>
            Manage incoming 3D
            printing requests.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() =>
            loadOrders(password)
          }
        >
          Refresh
        </button>
      </section>

      <section className="admin-stats">
        <article>
          <span>
            Total Orders
          </span>

          <strong>
            {orders.length}
          </strong>
        </article>

        <article>
          <span>
            Submitted
          </span>

          <strong>
            {submitted}
          </strong>
        </article>

        <article>
          <span>
            Printing
          </span>

          <strong>
            {printing}
          </strong>
        </article>

        <article>
          <span>
            Completed
          </span>

          <strong>
            {completed}
          </strong>
        </article>
      </section>

      {loading && (
        <div className="admin-message">
          Loading orders...
        </div>
      )}

      {error && (
        <div className="admin-error">
          {error}
        </div>
      )}

      {!loading &&
        !error && (
          <section className="admin-orders">
            {orders.map(
              (order) => (
                <article
                  className="admin-order-card"
                  key={order.id}
                >
                  <div>
                    <span className="admin-order-number">
                      {makeOrderNumber(
                        order.id
                      )}
                    </span>

                    <h3>
                      {order.customer_name ||
                        "Unknown customer"}
                    </h3>

                    <p>
                      {order.email}
                    </p>
                  </div>

                  <div>
                    <span className="admin-label">
                      MATERIAL
                    </span>

                    <strong>
                      {order.material ||
                        "—"}
                    </strong>

                    <p>
                      {order.color ||
                        "No color"}
                    </p>
                  </div>

                  <div>
                    <span className="admin-label">
                      QUANTITY
                    </span>

                    <strong>
                      {order.quantity ||
                        1}
                    </strong>
                  </div>

                  <div>
                    <span className="admin-status">
                      {order.status ||
                        "Submitted"}
                    </span>
                  </div>

                  <a
                    className="admin-view-button"
                    href={`/admin/order/${order.id}`}
                  >
                    View →
                  </a>
                </article>
              )
            )}
          </section>
        )}
    </main>
  );
}

export default Admin;