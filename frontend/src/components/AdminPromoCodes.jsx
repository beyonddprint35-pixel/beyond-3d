import { useEffect, useMemo, useState } from "react";
import { BadgePercent, Pencil, Plus, Save, Trash2, X } from "lucide-react";

import { supabase } from "../lib/supabaseClient";
import "./AdminPromoCodes.css";

const EMPTY_PROMO = {
  id: "",
  name: "",
  code: "",
  discount_percent: "",
  duration_type: "once",
  duration_months: "",
  valid_from: "",
  valid_until: "",
  is_active: true,
};

function isLocalPreview() {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".app.github.dev") ||
    hostname.endsWith(".github.dev")
  );
}

async function readFunctionJson(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("NETLIFY_FUNCTION_NOT_AVAILABLE");
  }
  return response.json();
}

function toLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizePromo(row = {}) {
  return {
    id: row.id || "",
    name: row.name || "",
    code: String(row.code || "").toUpperCase(),
    discount_percent: row.discount_percent === null || row.discount_percent === undefined ? "" : String(row.discount_percent),
    duration_type: ["once", "months", "forever"].includes(row.duration_type) ? row.duration_type : "once",
    duration_months: row.duration_months ? String(row.duration_months) : "",
    valid_from: toLocalInput(row.valid_from),
    valid_until: toLocalInput(row.valid_until),
    is_active: row.is_active !== false,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

function durationLabel(promo) {
  if (promo.duration_type === "forever") return "Forever";
  if (promo.duration_type === "months") {
    const count = Number(promo.duration_months || 0);
    return `${count} month${count === 1 ? "" : "s"}`;
  }
  return "1 billing cycle";
}

export default function AdminPromoCodes({ password }) {
  const [promos, setPromos] = useState([]);
  const [form, setForm] = useState(EMPTY_PROMO);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [localMode, setLocalMode] = useState(() => isLocalPreview());

  const editing = Boolean(form.id);

  const activeCount = useMemo(
    () => promos.filter((promo) => promo.is_active).length,
    [promos]
  );

  async function ensureLocalAdmin() {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      throw new Error("Sign in with your Beyond Menu Admin account before managing promo codes in local preview.");
    }
    return data.user;
  }

  async function loadDirect() {
    await ensureLocalAdmin();
    const { data, error: loadError } = await supabase
      .from("menu_promo_codes")
      .select("id,name,code,discount_percent,duration_type,duration_months,valid_from,valid_until,is_active,created_at,updated_at")
      .order("created_at", { ascending: false });
    if (loadError) throw loadError;
    return data || [];
  }

  async function saveDirect(nextPromo) {
    const user = await ensureLocalAdmin();
    const payload = {
      name: nextPromo.name.trim(),
      code: nextPromo.code.trim().toUpperCase(),
      discount_percent: Number(nextPromo.discount_percent),
      duration_type: nextPromo.duration_type,
      duration_months: nextPromo.duration_type === "months" ? Number(nextPromo.duration_months) : null,
      valid_from: toIso(nextPromo.valid_from),
      valid_until: toIso(nextPromo.valid_until),
      is_active: Boolean(nextPromo.is_active),
      updated_at: new Date().toISOString(),
    };

    if (nextPromo.id) {
      const { data, error: saveError } = await supabase
        .from("menu_promo_codes")
        .update(payload)
        .eq("id", nextPromo.id)
        .select()
        .single();
      if (saveError) throw saveError;
      return data;
    }

    const { data, error: saveError } = await supabase
      .from("menu_promo_codes")
      .insert({ ...payload, created_by: user.id })
      .select()
      .single();
    if (saveError) throw saveError;
    return data;
  }

  async function deleteDirect(id) {
    await ensureLocalAdmin();
    const { error: deleteError } = await supabase
      .from("menu_promo_codes")
      .delete()
      .eq("id", id);
    if (deleteError) throw deleteError;
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      let rows;
      if (isLocalPreview()) {
        setLocalMode(true);
        rows = await loadDirect();
      } else {
        try {
          const response = await fetch("/.netlify/functions/admin-promo-codes", {
            headers: { "x-admin-password": password },
          });
          const data = await readFunctionJson(response);
          if (!response.ok) throw new Error(data.error || "Could not load promo codes.");
          rows = data.promos || [];
          setLocalMode(false);
        } catch (functionError) {
          if (functionError?.message !== "NETLIFY_FUNCTION_NOT_AVAILABLE") throw functionError;
          setLocalMode(true);
          rows = await loadDirect();
        }
      }
      setPromos(rows.map(normalizePromo));
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to load promo codes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (password) load();
  }, [password]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(EMPTY_PROMO);
    setError("");
  }

  function editPromo(promo) {
    setForm(normalizePromo(promo));
    setMessage("");
    setError("");
    document.querySelector(".admin-promo-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function validate() {
    if (!form.name.trim()) return "Give the promotion a name.";
    if (!form.code.trim()) return "Enter a promo code.";
    if (!/^[A-Z0-9_-]{2,40}$/.test(form.code.trim().toUpperCase())) {
      return "Promo code can use letters, numbers, hyphens and underscores only.";
    }
    const percent = Number(form.discount_percent);
    if (!(percent > 0 && percent <= 100)) return "Discount must be between 1% and 100%.";
    if (form.duration_type === "months") {
      const months = Number(form.duration_months);
      if (!(months >= 1 && months <= 120)) return "Discount duration must be between 1 and 120 months.";
    }
    if (form.valid_from && form.valid_until && new Date(form.valid_until) <= new Date(form.valid_from)) {
      return "The end date must be after the start date.";
    }
    return "";
  }

  async function savePromo(event) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      let saved;
      if (isLocalPreview() || localMode) {
        saved = await saveDirect(form);
      } else {
        try {
          const response = await fetch("/.netlify/functions/admin-promo-codes", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-admin-password": password,
            },
            body: JSON.stringify({ promo: form }),
          });
          const data = await readFunctionJson(response);
          if (!response.ok) throw new Error(data.error || "Could not save promo code.");
          saved = data.promo;
        } catch (functionError) {
          if (functionError?.message !== "NETLIFY_FUNCTION_NOT_AVAILABLE") throw functionError;
          setLocalMode(true);
          saved = await saveDirect(form);
        }
      }

      const normalized = normalizePromo(saved);
      setPromos((current) => {
        const exists = current.some((item) => item.id === normalized.id);
        return exists
          ? current.map((item) => (item.id === normalized.id ? normalized : item))
          : [normalized, ...current];
      });
      setMessage(editing ? "Promo code updated." : "Promo code created.");
      resetForm();
      window.setTimeout(() => setMessage(""), 3500);
    } catch (err) {
      console.error(err);
      const text = String(err.message || "");
      setError(text.toLowerCase().includes("duplicate") || text.toLowerCase().includes("unique")
        ? "That promo code already exists. Choose another code."
        : text || "Unable to save promo code.");
    } finally {
      setSaving(false);
    }
  }

  async function removePromo(promo) {
    if (!window.confirm(`Delete promo code ${promo.code}? This cannot be undone.`)) return;
    setDeletingId(promo.id);
    setError("");
    setMessage("");
    try {
      if (isLocalPreview() || localMode) {
        await deleteDirect(promo.id);
      } else {
        try {
          const response = await fetch("/.netlify/functions/admin-promo-codes", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "x-admin-password": password,
            },
            body: JSON.stringify({ id: promo.id }),
          });
          const data = await readFunctionJson(response);
          if (!response.ok) throw new Error(data.error || "Could not delete promo code.");
        } catch (functionError) {
          if (functionError?.message !== "NETLIFY_FUNCTION_NOT_AVAILABLE") throw functionError;
          setLocalMode(true);
          await deleteDirect(promo.id);
        }
      }
      setPromos((current) => current.filter((item) => item.id !== promo.id));
      if (form.id === promo.id) resetForm();
      setMessage("Promo code deleted.");
      window.setTimeout(() => setMessage(""), 3500);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to delete promo code.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <section className="admin-promo-settings">
      <div className="admin-promo-head">
        <div>
          <span className="admin-label">SUBSCRIPTIONS</span>
          <h2>Promo Codes</h2>
          <p>Create discounts for Beyond Menu subscriptions and control exactly how long they apply.</p>
          {localMode ? <small>Local preview mode · promo codes are managed directly in Supabase.</small> : null}
        </div>
        <div className="admin-promo-count"><strong>{activeCount}</strong><span>active</span></div>
      </div>

      {error ? <div className="admin-error admin-promo-alert">{error}</div> : null}
      {message ? <div className="admin-promo-success">{message}</div> : null}

      <form className="admin-promo-form" onSubmit={savePromo}>
        <div className="admin-promo-form-title">
          <div><BadgePercent size={18} /><strong>{editing ? "Edit Promo Code" : "Create Promo Code"}</strong></div>
          {editing ? <button type="button" className="admin-promo-close" onClick={resetForm}><X size={16} /> Cancel</button> : null}
        </div>

        <div className="admin-promo-fields">
          <label><span>Promo name</span><input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Launch offer" /></label>
          <label><span>Promo code</span><input value={form.code} onChange={(e) => updateField("code", e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))} placeholder="WELCOME20" /></label>
          <label><span>Discount percentage</span><div className="admin-promo-percent"><input type="number" min="1" max="100" step="0.01" value={form.discount_percent} onChange={(e) => updateField("discount_percent", e.target.value)} placeholder="20" /><b>%</b></div></label>
          <label><span>Discount duration</span><select value={form.duration_type} onChange={(e) => updateField("duration_type", e.target.value)}><option value="once">1 billing cycle</option><option value="months">Number of months</option><option value="forever">Forever</option></select></label>
          {form.duration_type === "months" ? <label><span>Number of months</span><input type="number" min="1" max="120" value={form.duration_months} onChange={(e) => updateField("duration_months", e.target.value)} placeholder="3" /></label> : null}
          <label><span>Can be used from (optional)</span><input type="datetime-local" value={form.valid_from} onChange={(e) => updateField("valid_from", e.target.value)} /></label>
          <label><span>Can be used until (optional)</span><input type="datetime-local" value={form.valid_until} onChange={(e) => updateField("valid_until", e.target.value)} /></label>
          <label className="admin-promo-active"><input type="checkbox" checked={form.is_active} onChange={(e) => updateField("is_active", e.target.checked)} /><span>Active and available to use</span></label>
        </div>

        <div className="admin-promo-form-actions">
          <button type="submit" className="primary-button" disabled={saving}><Save size={16} />{saving ? "Saving..." : editing ? "Save Changes" : "Create Promo Code"}</button>
          {!editing ? <button type="button" className="secondary-button" onClick={() => setForm(EMPTY_PROMO)}><Plus size={15} /> Clear</button> : null}
        </div>
      </form>

      <div className="admin-promo-list-head"><strong>Existing promo codes</strong><span>{promos.length} total</span></div>

      {loading ? <div className="admin-message">Loading promo codes...</div> : null}
      {!loading && !promos.length ? <div className="admin-message">No promo codes yet. Create your first code above.</div> : null}

      {!loading && promos.length ? (
        <div className="admin-promo-list">
          {promos.map((promo) => (
            <article className={`admin-promo-card ${promo.is_active ? "is-active" : "is-inactive"}`} key={promo.id}>
              <div className="admin-promo-main">
                <div className="admin-promo-code-line"><code>{promo.code}</code><span>{promo.is_active ? "ACTIVE" : "INACTIVE"}</span></div>
                <h3>{promo.name}</h3>
                <div className="admin-promo-meta">
                  <strong>{Number(promo.discount_percent)}% OFF</strong>
                  <span>{durationLabel(promo)}</span>
                  <span>{promo.valid_until ? `usable until ${new Date(promo.valid_until).toLocaleDateString()}` : "no expiry date"}</span>
                </div>
              </div>
              <div className="admin-promo-actions">
                <button type="button" onClick={() => editPromo(promo)}><Pencil size={15} /> Edit</button>
                <button type="button" className="danger" disabled={deletingId === promo.id} onClick={() => removePromo(promo)}><Trash2 size={15} />{deletingId === promo.id ? "Deleting..." : "Delete"}</button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
