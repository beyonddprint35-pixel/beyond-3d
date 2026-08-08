import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import Brand from "../components/Brand";

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

function formatCurrency(value) {
  return `₪${Number(
    value || 0
  ).toLocaleString("en-IL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
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

  const [activeFilter, setActiveFilter] =
    useState("All");

  const [search, setSearch] =
    useState("");

  async function loadOrders(
    adminPassword
  ) {
    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
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

  const statuses = [
    "All",
    "Submitted",
    "Quoted",
    "Accepted",
    "Printing",
    "Completed",
  ];

  const statusCounts =
    useMemo(() => {
      const counts = {
        All: orders.length,
        Submitted: 0,
        Quoted: 0,
        Accepted: 0,
        Printing: 0,
        Completed: 0,
      };

      orders.forEach((order) => {
        const status =
          order.status ||
          "Submitted";

        if (
          Object.prototype.hasOwnProperty.call(
            counts,
            status
          )
        ) {
          counts[status] += 1;
        }
      });

      return counts;
    }, [orders]);

  const financialStats =
    useMemo(() => {
      const quotedOrders =
        orders.filter(
          (order) =>
            Number(
              order.quote_total ||
                0
            ) > 0
        );

      const totalQuoted =
        quotedOrders.reduce(
          (sum, order) =>
            sum +
            Number(
              order.quote_total ||
                0
            ),
          0
        );

      const acceptedRevenue =
        orders
          .filter(
            (order) =>
              [
                "Accepted",
                "Printing",
                "Completed",
              ].includes(
                order.status
              )
          )
          .reduce(
            (sum, order) =>
              sum +
              Number(
                order.quote_total ||
                  0
              ),
            0
          );

      const completedRevenue =
        orders
          .filter(
            (order) =>
              order.status ===
              "Completed"
          )
          .reduce(
            (sum, order) =>
              sum +
              Number(
                order.quote_total ||
                  0
              ),
            0
          );

      const averageOrderValue =
        quotedOrders.length
          ? totalQuoted /
            quotedOrders.length
          : 0;

      return {
        totalQuoted,
        acceptedRevenue,
        completedRevenue,
        averageOrderValue,
      };
    }, [orders]);

  const filteredOrders =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return orders.filter(
        (order) => {
          const status =
            order.status ||
            "Submitted";

          const statusMatches =
            activeFilter ===
              "All" ||
            status ===
              activeFilter;

          if (!statusMatches) {
            return false;
          }

          if (!normalizedSearch) {
            return true;
          }

          const searchableText = [
            makeOrderNumber(
              order.id
            ),
            order.customer_name,
            order.email,
            order.phone,
            order.material,
            order.color,
            order.project_type,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchableText.includes(
            normalizedSearch
          );
        }
      );
    }, [
      orders,
      activeFilter,
      search,
    ]);

  if (!password) {
    return (
      <main className="admin-login-page">
        <section className="admin-login-card">
          <div
            style={{
              marginBottom: "24px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Brand
              size={52}
              textSize={18}
              gap={12}
              subtitle="ADMIN"
            />
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
          <Brand
            size={40}
            textSize={16}
            gap={10}
          />

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
            Accepted
          </span>

          <strong>
            {statusCounts.Accepted}
          </strong>
        </article>

        <article>
          <span>
            Printing
          </span>

          <strong>
            {statusCounts.Printing}
          </strong>
        </article>

        <article>
          <span>
            Completed
          </span>

          <strong>
            {statusCounts.Completed}
          </strong>
        </article>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(4, minmax(0, 1fr))",
          gap: "14px",
          marginBottom: "28px",
        }}
      >
        <article className="order-detail-card">
          <span className="admin-label">
            TOTAL QUOTED
          </span>

          <strong
            style={{
              fontSize: "27px",
            }}
          >
            {formatCurrency(
              financialStats.totalQuoted
            )}
          </strong>
        </article>

        <article className="order-detail-card">
          <span className="admin-label">
            ACCEPTED VALUE
          </span>

          <strong
            style={{
              fontSize: "27px",
            }}
          >
            {formatCurrency(
              financialStats.acceptedRevenue
            )}
          </strong>
        </article>

        <article className="order-detail-card">
          <span className="admin-label">
            COMPLETED REVENUE
          </span>

          <strong
            style={{
              fontSize: "27px",
            }}
          >
            {formatCurrency(
              financialStats.completedRevenue
            )}
          </strong>
        </article>

        <article className="order-detail-card">
          <span className="admin-label">
            AVG. QUOTE VALUE
          </span>

          <strong
            style={{
              fontSize: "27px",
            }}
          >
            {formatCurrency(
              financialStats.averageOrderValue
            )}
          </strong>
        </article>
      </section>

      <section
        style={{
          display: "grid",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          {statuses.map(
            (status) => (
              <button
                key={status}
                type="button"
                className={
                  activeFilter ===
                  status
                    ? "primary-button"
                    : "secondary-button"
                }
                onClick={() =>
                  setActiveFilter(
                    status
                  )
                }
                style={{
                  minHeight: "42px",
                  padding:
                    "0 16px",
                }}
              >
                {status}
                {" · "}
                {
                  statusCounts[
                    status
                  ]
                }
              </button>
            )
          )}
        </div>

        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Search customer, email, order number, material..."
          style={{
            width: "100%",
            minHeight: "52px",
            padding:
              "0 16px",
            borderRadius: "14px",
            border:
              "1px solid rgba(255,255,255,.1)",
            background:
              "rgba(255,255,255,.035)",
            color: "#ffffff",
            outline: "none",
          }}
        />
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
        !error &&
        filteredOrders.length ===
          0 && (
          <div className="admin-message">
            No matching orders.
          </div>
        )}

      {!loading &&
        !error &&
        filteredOrders.length >
          0 && (
          <section className="admin-orders">
            {filteredOrders.map(
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
                      VALUE
                    </span>

                    <strong>
                      {order.quote_total
                        ? formatCurrency(
                            order.quote_total
                          )
                        : "—"}
                    </strong>
                  </div>

                  <div>
                    <span className="admin-status">
                      {order.status ||
                        "Submitted"}
                    </span>
                  </div>

                  <Link
                    className="admin-view-button"
                    to={`/admin/order/${order.id}`}
                  >
                    View →
                  </Link>
                </article>
              )
            )}
          </section>
        )}
    </main>
  );
}

export default Admin;
