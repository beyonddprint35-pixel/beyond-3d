import { useEffect, useMemo, useState } from "react";
import { Mail, Search, Send, Users, X } from "lucide-react";

import { supabase } from "../lib/supabaseClient";
import "./AdminPromoEmailSender.css";

function readJson(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("EMAIL_FUNCTION_NOT_AVAILABLE");
  }
  return response.json();
}

export default function AdminPromoEmailSender({ password }) {
  const [promos, setPromos] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedPromoId, setSelectedPromoId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [serverAvailable, setServerAvailable] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [promoResult, profileResult] = await Promise.all([
          supabase
            .from("menu_promo_codes")
            .select("id,name,code,discount_percent,duration_type,duration_months,valid_from,valid_until,is_active")
            .eq("is_active", true)
            .order("created_at", { ascending: false }),
          supabase
            .from("profiles")
            .select("id,email,full_name,created_at")
            .not("email", "is", null)
            .order("created_at", { ascending: false }),
        ]);

        if (promoResult.error) throw promoResult.error;
        if (profileResult.error) throw profileResult.error;
        if (!alive) return;

        const nextPromos = promoResult.data || [];
        const nextUsers = (profileResult.data || []).filter((user) => user.email);
        setPromos(nextPromos);
        setUsers(nextUsers);
        setSelectedPromoId((current) => current || nextPromos[0]?.id || "");

        try {
          const response = await fetch("/.netlify/functions/admin-promo-email", {
            headers: { "x-admin-password": password },
          });
          await readJson(response);
          if (!alive) return;
          setServerAvailable(response.ok);
        } catch (functionError) {
          if (!alive) return;
          setServerAvailable(false);
        }
      } catch (err) {
        if (!alive) return;
        console.error(err);
        setError(err.message || "Unable to load promo email recipients.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (password) load();
    return () => { alive = false; };
  }, [password]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      [user.full_name, user.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [users, search]);

  const selectedPromo = promos.find((promo) => promo.id === selectedPromoId) || null;

  function toggleUser(userId) {
    setSelectedUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : current.length >= 25
          ? current
          : [...current, userId]
    );
  }

  function selectVisible() {
    const next = [...new Set([...selectedUserIds, ...filteredUsers.map((user) => user.id)])].slice(0, 25);
    setSelectedUserIds(next);
  }

  async function sendEmails() {
    setError("");
    setMessage("");

    if (!selectedPromoId) {
      setError("Choose a promo code first.");
      return;
    }
    if (!selectedUserIds.length) {
      setError("Select at least one authenticated user.");
      return;
    }
    if (!serverAvailable) {
      setError("Email sending needs the Netlify server function. Use a deployed/Netlify preview or run netlify dev after configuring Resend.");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/.netlify/functions/admin-promo-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          promo_id: selectedPromoId,
          user_ids: selectedUserIds,
        }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || "Could not send promo emails.");

      const sent = Number(data.sent_count || 0);
      const failed = Number(data.failed_count || 0);
      setMessage(
        failed
          ? `${sent} promo email${sent === 1 ? "" : "s"} sent, ${failed} failed.`
          : `${sent} promo email${sent === 1 ? "" : "s"} sent successfully.`
      );
      if (sent) setSelectedUserIds([]);
    } catch (err) {
      console.error(err);
      setError(
        err.message === "EMAIL_FUNCTION_NOT_AVAILABLE"
          ? "Email sending needs the Netlify server function. Use a deployed/Netlify preview or run netlify dev."
          : err.message || "Unable to send promo emails."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="admin-promo-email-settings">
      <div className="admin-promo-email-head">
        <div>
          <span className="admin-label">SUBSCRIPTIONS</span>
          <h2>Promo Email Sender</h2>
          <p>Send an active promo code directly to selected authenticated Beyond users.</p>
          <small>Recipients are selected manually. Up to 25 users can be emailed in one send.</small>
        </div>
        <div className="admin-promo-email-count"><Users size={17} /><strong>{selectedUserIds.length}</strong><span>selected</span></div>
      </div>

      {error ? <div className="admin-error admin-promo-email-alert">{error}</div> : null}
      {message ? <div className="admin-promo-email-success">{message}</div> : null}

      {!serverAvailable ? (
        <div className="admin-promo-email-server-note">
          Email delivery is server-only. The recipient picker works here, but actual sending will work after the Resend variables are configured in Netlify and the function is available.
        </div>
      ) : null}

      <div className="admin-promo-email-layout">
        <div className="admin-promo-email-config">
          <label>
            <span>Promo code to send</span>
            <select value={selectedPromoId} onChange={(event) => setSelectedPromoId(event.target.value)} disabled={loading || !promos.length}>
              {!promos.length ? <option value="">No active promo codes</option> : null}
              {promos.map((promo) => (
                <option value={promo.id} key={promo.id}>
                  {promo.code} — {Number(promo.discount_percent)}% off — {promo.name}
                </option>
              ))}
            </select>
          </label>

          {selectedPromo ? (
            <div className="admin-promo-email-preview">
              <Mail size={18} />
              <div>
                <strong>{selectedPromo.code}</strong>
                <span>{Number(selectedPromo.discount_percent)}% off · {selectedPromo.name}</span>
              </div>
            </div>
          ) : null}

          <div className="admin-promo-email-actions-row">
            <button type="button" className="primary-button" onClick={sendEmails} disabled={sending || loading || !selectedPromoId || !selectedUserIds.length}>
              <Send size={16} /> {sending ? "Sending..." : `Send to ${selectedUserIds.length || 0}`}
            </button>
            {selectedUserIds.length ? (
              <button type="button" className="secondary-button" onClick={() => setSelectedUserIds([])}>
                <X size={15} /> Clear selection
              </button>
            ) : null}
          </div>
        </div>

        <div className="admin-promo-email-users">
          <div className="admin-promo-email-users-head">
            <div className="admin-promo-email-search">
              <Search size={15} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" />
            </div>
            <button type="button" onClick={selectVisible} disabled={!filteredUsers.length}>Select visible</button>
          </div>

          <div className="admin-promo-email-user-list">
            {loading ? <div className="admin-message">Loading authenticated users...</div> : null}
            {!loading && !filteredUsers.length ? <div className="admin-message">No authenticated users match this search.</div> : null}
            {!loading ? filteredUsers.map((user) => {
              const checked = selectedUserIds.includes(user.id);
              return (
                <label className={`admin-promo-email-user ${checked ? "is-selected" : ""}`} key={user.id}>
                  <input type="checkbox" checked={checked} onChange={() => toggleUser(user.id)} />
                  <span className="admin-promo-email-avatar">{String(user.full_name || user.email || "U").charAt(0).toUpperCase()}</span>
                  <span className="admin-promo-email-user-copy">
                    <strong>{user.full_name || String(user.email).split("@")[0]}</strong>
                    <small>{user.email}</small>
                  </span>
                </label>
              );
            }) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
