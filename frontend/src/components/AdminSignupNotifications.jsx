import { useEffect, useMemo, useState } from "react";
import { Bell, Check, ChevronDown, RefreshCw, UserPlus } from "lucide-react";

import { supabase } from "../lib/supabaseClient";
import "./AdminSignupNotifications.css";
import "./AdminCompactPanel.css";

function formatWhen(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

export default function AdminSignupNotifications() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [marking, setMarking] = useState(false);

  const unreadCount = useMemo(() => rows.filter((row) => !row.read_at).length, [rows]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { data, error: loadError } = await supabase
        .from("menu_admin_notifications")
        .select("id,type,user_id,email,full_name,created_at,read_at")
        .eq("type", "user_signup")
        .order("created_at", { ascending: false })
        .limit(50);
      if (loadError) throw loadError;
      setRows(data || []);
    } catch (err) {
      setError(err.message || "Could not load signup notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    const channel = supabase
      .channel("admin-signup-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "menu_admin_notifications" },
        (payload) => {
          const next = payload.new;
          if (next?.type !== "user_signup") return;
          setRows((current) => [next, ...current.filter((item) => item.id !== next.id)].slice(0, 50));
          setExpanded(true);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function markAllRead() {
    const unreadIds = rows.filter((row) => !row.read_at).map((row) => row.id);
    if (!unreadIds.length) return;
    setMarking(true);
    setError("");
    try {
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("menu_admin_notifications")
        .update({ read_at: now })
        .in("id", unreadIds);
      if (updateError) throw updateError;
      setRows((current) => current.map((row) => (
        unreadIds.includes(row.id) ? { ...row, read_at: now } : row
      )));
    } catch (err) {
      setError(err.message || "Could not mark notifications as read.");
    } finally {
      setMarking(false);
    }
  }

  return (
    <section className={`admin-signup-notifications admin-compact-panel${expanded ? " is-expanded" : ""}`}>
      <div className="admin-compact-panel-head admin-signup-notifications-head">
        <div>
          <span className="admin-label">USERS</span>
          <h2>New Signups</h2>
          <p>See when a new Beyond user creates an account.</p>
        </div>
        <span className={`admin-compact-panel-summary${unreadCount ? " has-unread" : ""}`}>
          {unreadCount ? `${unreadCount} new` : `${rows.length} total`}
        </span>
        <button
          type="button"
          className="admin-compact-panel-toggle"
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse New Signups" : "Expand New Signups"}
          onClick={() => setExpanded((value) => !value)}
        >
          {unreadCount ? <Bell size={16} /> : <ChevronDown size={17} />}
        </button>
      </div>

      {expanded ? (
        <div className="admin-compact-panel-body">
          <div className="admin-signup-notifications-toolbar">
            <button type="button" className="secondary-button" onClick={load} disabled={loading}>
              <RefreshCw size={14} /> {loading ? "Loading…" : "Refresh"}
            </button>
            <button type="button" className="secondary-button" onClick={markAllRead} disabled={!unreadCount || marking}>
              <Check size={14} /> {marking ? "Marking…" : "Mark all read"}
            </button>
          </div>

          {error ? <div className="admin-error">{error}</div> : null}
          {!loading && !rows.length ? <div className="admin-message">No signup notifications yet.</div> : null}

          <div className="admin-signup-notifications-list">
            {rows.map((row) => (
              <article className={`admin-signup-notification${row.read_at ? " is-read" : " is-unread"}`} key={row.id}>
                <span className="admin-signup-notification-icon"><UserPlus size={15} /></span>
                <div className="admin-signup-notification-copy">
                  <strong>{row.full_name || row.email || "New user"}</strong>
                  <span>{row.email || "No email"}</span>
                </div>
                <time>{formatWhen(row.created_at)}</time>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
