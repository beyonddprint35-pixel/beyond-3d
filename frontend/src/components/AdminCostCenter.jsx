import { useEffect, useMemo, useState } from "react";
import {
  BrainCircuit,
  ChevronDown,
  CircleDollarSign,
  Cloud,
  Database,
  Github,
  RefreshCw,
  Save,
  Settings2,
} from "lucide-react";
import "./AdminCompactPanel.css";
import "./AdminCostCenter.css";

const PROVIDER_ICONS = {
  openai: BrainCircuit,
  netlify: Cloud,
  codespaces: Github,
  supabase: Database,
};

const EMPTY_SETTINGS = {
  providers: {
    openai: { budget_usd: 0, manual_spend_usd: 0 },
    netlify: { budget_usd: 0, manual_spend_usd: 0 },
    codespaces: { budget_usd: 0, manual_spend_usd: 0 },
    supabase: { budget_usd: 0, manual_spend_usd: 0 },
  },
};

function money(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Number(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function percent(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const number = Number(value);
  return `${number < 10 ? number.toFixed(1) : Math.round(number)}%`;
}

function sourceLabel(source) {
  if (source === "live") return "Live";
  if (source === "manual") return "Manual";
  if (source === "error") return "Sync issue";
  return "Setup needed";
}

function usageTone(value) {
  if (value == null) return "neutral";
  if (value >= 100) return "danger";
  if (value >= 80) return "warning";
  return "healthy";
}

function cloneSettings(settings) {
  const next = JSON.parse(JSON.stringify(EMPTY_SETTINGS));
  Object.keys(next.providers).forEach((id) => {
    next.providers[id] = {
      ...next.providers[id],
      ...(settings?.providers?.[id] || {}),
    };
  });
  return next;
}

export default function AdminCostCenter({ password }) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  const [settings, setSettings] = useState(EMPTY_SETTINGS);

  async function request(method = "GET", body = null) {
    const response = await fetch("/.netlify/functions/admin-costs", {
      method,
      headers: {
        "x-admin-password": password,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load platform costs.");
    return data;
  }

  async function load() {
    if (!password) return;
    setLoading(true);
    setError("");
    try {
      const data = await request("GET");
      setSnapshot(data);
      setSettings(cloneSettings(data.settings));
    } catch (err) {
      setError(err.message || "Could not load platform costs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [password]);

  async function saveSettings() {
    setSaving(true);
    setError("");
    try {
      const data = await request("POST", { settings });
      setSnapshot(data);
      setSettings(cloneSettings(data.settings));
      setEditing(false);
    } catch (err) {
      setError(err.message || "Could not save cost settings.");
    } finally {
      setSaving(false);
    }
  }

  function updateSetting(provider, field, value) {
    const numeric = value === "" ? "" : Math.max(0, Number(value) || 0);
    setSettings((current) => ({
      ...current,
      providers: {
        ...current.providers,
        [provider]: {
          ...current.providers[provider],
          [field]: numeric,
        },
      },
    }));
  }

  const summary = useMemo(() => {
    if (loading) return "Loading costs…";
    if (!snapshot?.totals) return "No cost data";
    const usage = snapshot.totals.utilization_pct == null
      ? "no budget"
      : `${percent(snapshot.totals.utilization_pct)} of budget`;
    return `${money(snapshot.totals.spend_usd)} MTD · ${usage}`;
  }, [loading, snapshot]);

  const providers = snapshot?.providers || [];
  const totals = snapshot?.totals || {};

  return (
    <section className={`admin-cost-center admin-compact-panel${expanded ? " is-expanded" : ""}`}>
      <div className="admin-compact-panel-head admin-cost-center-head">
        <div>
          <span className="admin-label">FINANCE</span>
          <h2>Platform Costs</h2>
          <p>Monthly spend, budgets and utilization across Beyond infrastructure.</p>
        </div>
        <span className="admin-compact-panel-summary">{summary}</span>
        <button
          type="button"
          className="admin-compact-panel-toggle"
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse Platform Costs" : "Expand Platform Costs"}
          onClick={() => setExpanded((value) => !value)}
        >
          <ChevronDown size={17} />
        </button>
      </div>

      {expanded ? (
        <div className="admin-compact-panel-body admin-cost-center-body">
          <div className="admin-cost-toolbar">
            <div>
              <strong>{snapshot?.period || "Current month"}</strong>
              <span>{snapshot?.generated_at ? `Updated ${new Date(snapshot.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</span>
            </div>
            <div className="admin-cost-toolbar-actions">
              <button type="button" className="secondary-button" onClick={load} disabled={loading || saving}>
                <RefreshCw size={14} /> {loading ? "Refreshing…" : "Refresh"}
              </button>
              <button type="button" className="secondary-button" onClick={() => setEditing((value) => !value)} disabled={loading || saving}>
                <Settings2 size={14} /> {editing ? "Close settings" : "Budgets"}
              </button>
            </div>
          </div>

          {error ? <div className="admin-error admin-cost-error">{error}</div> : null}

          {!loading && snapshot ? (
            <>
              <div className="admin-cost-summary-grid">
                <article>
                  <span>Month-to-date spend</span>
                  <strong>{money(totals.spend_usd)}</strong>
                </article>
                <article>
                  <span>Monthly budget</span>
                  <strong>{totals.budget_usd > 0 ? money(totals.budget_usd) : "Not set"}</strong>
                </article>
                <article>
                  <span>Budget utilization</span>
                  <strong>{percent(totals.utilization_pct)}</strong>
                </article>
                <article>
                  <span>Live connections</span>
                  <strong>{totals.live_connections || 0} / {providers.length || 4}</strong>
                </article>
              </div>

              <div className="admin-cost-provider-grid">
                {providers.map((provider) => {
                  const Icon = PROVIDER_ICONS[provider.id] || CircleDollarSign;
                  const tone = usageTone(provider.utilization_pct);
                  const width = provider.utilization_pct == null ? 0 : Math.min(100, Math.max(0, provider.utilization_pct));
                  return (
                    <article className="admin-cost-provider" key={provider.id}>
                      <div className="admin-cost-provider-head">
                        <span className="admin-cost-provider-icon"><Icon size={17} /></span>
                        <div>
                          <strong>{provider.name}</strong>
                          <span className={`admin-cost-source is-${provider.source}`}>{sourceLabel(provider.source)}</span>
                        </div>
                      </div>

                      <div className="admin-cost-provider-values">
                        <div><span>Spend</span><strong>{money(provider.spend_usd)}</strong></div>
                        <div><span>Budget</span><strong>{provider.budget_usd > 0 ? money(provider.budget_usd) : "—"}</strong></div>
                      </div>

                      <div className={`admin-cost-progress is-${tone}`}>
                        <div className="admin-cost-progress-label">
                          <span>Utilization</span>
                          <strong>{percent(provider.utilization_pct)}</strong>
                        </div>
                        <div className="admin-cost-progress-track"><span style={{ width: `${width}%` }} /></div>
                      </div>

                      {provider.details?.length ? (
                        <div className="admin-cost-details">
                          {provider.details.slice(0, 4).map((detail, index) => (
                            <div key={`${detail.label}-${index}`}>
                              <span>{detail.label}</span>
                              <strong>
                                {detail.unit === "USD"
                                  ? money(detail.value)
                                  : `${Number(detail.value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${detail.unit || ""}${detail.cost_usd ? ` · ${money(detail.cost_usd)}` : ""}`}
                              </strong>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <p className="admin-cost-provider-note">{provider.note}</p>
                    </article>
                  );
                })}
              </div>

              {editing ? (
                <div className="admin-cost-settings">
                  <div className="admin-cost-settings-head">
                    <div>
                      <span className="admin-label">MONTHLY CONTROLS</span>
                      <strong>Budgets & manual fallback costs</strong>
                    </div>
                    <button type="button" className="primary-button" onClick={saveSettings} disabled={saving}>
                      <Save size={14} /> {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                  <p>Budgets drive the utilization bars. Manual spend is used when a live billing connector is unavailable.</p>
                  <div className="admin-cost-settings-grid">
                    {Object.entries(settings.providers).map(([id, values]) => {
                      const provider = providers.find((item) => item.id === id);
                      return (
                        <div className="admin-cost-setting-row" key={id}>
                          <strong>{provider?.name || id}</strong>
                          <label>
                            <span>Budget USD</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={values.budget_usd}
                              onChange={(event) => updateSetting(id, "budget_usd", event.target.value)}
                            />
                          </label>
                          <label>
                            <span>Manual MTD spend</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={values.manual_spend_usd}
                              onChange={(event) => updateSetting(id, "manual_spend_usd", event.target.value)}
                            />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </>
          ) : loading ? (
            <div className="admin-message">Loading platform costs…</div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
