import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Database,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteAdminDataRow,
  insertAdminDataRow,
  loadAdminDataRows,
  loadAdminDataTables,
  updateAdminDataRow,
} from "../features/menu-engine/data/adminDataDashboardService";
import "./AdminCompactPanel.css";
import "./AdminDataDashboard.css";

function formatCell(value) {
  if (value == null) return "—";
  if (typeof value === "object") {
    const text = JSON.stringify(value);
    return text.length > 90 ? `${text.slice(0, 87)}…` : text;
  }
  const text = String(value);
  return text.length > 90 ? `${text.slice(0, 87)}…` : text;
}

function prettyJson(value) {
  return JSON.stringify(value || {}, null, 2);
}

export default function AdminDataDashboard() {
  const [expanded, setExpanded] = useState(false);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [pk, setPk] = useState("id");
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState(null);
  const [editorText, setEditorText] = useState("{}");
  const [saving, setSaving] = useState(false);

  async function loadTables() {
    setLoadingTables(true);
    setError("");
    try {
      const result = await loadAdminDataTables();
      setTables(result.tables || []);
      setSelectedTable((current) => current || result.tables?.[0]?.name || "");
    } catch (err) {
      setError(err.message || "Could not load admin tables.");
    } finally {
      setLoadingTables(false);
    }
  }

  async function loadRows(table = selectedTable) {
    if (!table) return;
    setLoadingRows(true);
    setError("");
    try {
      const result = await loadAdminDataRows(table, { limit: 100, offset: 0 });
      setRows(result.rows || []);
      setCount(result.count || 0);
      setPk(result.pk || "id");
    } catch (err) {
      setError(err.message || "Could not load table data.");
    } finally {
      setLoadingRows(false);
    }
  }

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (selectedTable) loadRows(selectedTable);
  }, [selectedTable]);

  const currentTable = tables.find((table) => table.name === selectedTable);
  const groups = useMemo(() => {
    const map = new Map();
    tables.forEach((table) => {
      const group = table.group || "Other";
      if (!map.has(group)) map.set(group, []);
      map.get(group).push(table);
    });
    return [...map.entries()];
  }, [tables]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [rows, search]);

  const columns = useMemo(() => {
    const keys = [];
    const seen = new Set();
    filteredRows.slice(0, 20).forEach((row) => {
      Object.keys(row || {}).forEach((key) => {
        if (!seen.has(key)) {
          seen.add(key);
          keys.push(key);
        }
      });
    });
    if (pk && seen.has(pk)) return [pk, ...keys.filter((key) => key !== pk)].slice(0, 8);
    return keys.slice(0, 8);
  }, [filteredRows, pk]);

  function openCreate() {
    setEditor({ mode: "create", row: null });
    setEditorText("{\n  \n}");
  }

  function openEdit(row) {
    if (!currentTable?.writable) return;
    setEditor({ mode: "edit", row });
    setEditorText(prettyJson(row));
  }

  async function saveEditor() {
    if (!editor || !selectedTable) return;
    let payload;
    try {
      payload = JSON.parse(editorText);
      if (!payload || Array.isArray(payload) || typeof payload !== "object") {
        throw new Error("Row must be a JSON object.");
      }
    } catch (err) {
      setError(err.message || "Invalid JSON.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (editor.mode === "create") {
        await insertAdminDataRow(selectedTable, payload);
      } else {
        const key = editor.row?.[pk];
        await updateAdminDataRow(selectedTable, key, payload);
      }
      setEditor(null);
      await loadRows();
    } catch (err) {
      setError(err.message || "Could not save row.");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(row) {
    const key = row?.[pk];
    const isAuthUser = selectedTable === "auth_users";
    const subject = row?.email || row?.full_name || String(key);
    const message = isAuthUser
      ? `Permanently delete the Beyond account for ${subject}?\n\nThis removes the Supabase Auth user and invalidates the old password/session. If this person signs up again with the same email, they will go through the complete signup and verification flow as a new account.\n\nOwned menu/account data can also be removed. This cannot be undone.`
      : `Delete this row from ${currentTable?.label || selectedTable}?\n\n${pk}: ${String(key)}\n\nThis can affect related data and cannot be undone.`;

    if (!window.confirm(message)) return;

    setError("");
    try {
      await deleteAdminDataRow(selectedTable, key);
      await loadRows();
    } catch (err) {
      setError(err.message || "Could not delete row.");
    }
  }

  return (
    <section className={`admin-compact-panel admin-data-dashboard ${expanded ? "is-expanded" : ""}`}>
      <div className="admin-compact-panel-head">
        <div>
          <span className="admin-label">DATABASE</span>
          <h2>Admin Data Dashboard</h2>
          <p>Browse and safely edit operational Beyond data.</p>
        </div>
        <span className="admin-compact-panel-summary">
          {loadingTables ? "Loading…" : `${tables.length} tables`}
        </span>
        <button
          type="button"
          className="admin-compact-panel-toggle"
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse Admin Data Dashboard" : "Expand Admin Data Dashboard"}
          onClick={() => setExpanded((value) => !value)}
        >
          <ChevronDown size={17} />
        </button>
      </div>

      {expanded ? (
        <div className="admin-compact-panel-body admin-data-body">
          <div className="admin-data-toolbar">
            <div className="admin-data-table-picker">
              <Database size={16} />
              <select value={selectedTable} onChange={(event) => setSelectedTable(event.target.value)}>
                {groups.map(([group, groupTables]) => (
                  <optgroup key={group} label={group}>
                    {groupTables.map((table) => (
                      <option key={table.name} value={table.name}>{table.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <button type="button" className="secondary-button" onClick={() => loadRows()} disabled={loadingRows || !selectedTable}>
              <RefreshCw size={15} /> {loadingRows ? "Loading…" : "Refresh"}
            </button>
            <button type="button" className="primary-button" onClick={openCreate} disabled={!selectedTable || !currentTable?.writable}>
              <Plus size={15} /> Add row
            </button>
          </div>

          <div className="admin-data-meta-row">
            <div>
              <strong>{currentTable?.label || "Table"}</strong>
              <span>{count} rows · primary key: {pk}</span>
              {selectedTable === "auth_users" ? <span>Delete here to remove the actual login account, not only its profile/business row.</span> : null}
            </div>
            <label className="admin-data-search">
              <Search size={15} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search loaded rows…" />
            </label>
          </div>

          {error ? <div className="admin-error admin-data-error">{error}</div> : null}

          <div className="admin-data-grid-wrap">
            {loadingRows ? (
              <div className="admin-data-empty">Loading data…</div>
            ) : filteredRows.length ? (
              <table className="admin-data-grid">
                <thead>
                  <tr>
                    {columns.map((column) => <th key={column}>{column}</th>)}
                    <th className="admin-data-actions-head">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => (
                    <tr key={String(row?.[pk] ?? index)}>
                      {columns.map((column) => (
                        <td key={column} title={typeof row?.[column] === "object" ? prettyJson(row[column]) : String(row?.[column] ?? "")}>{formatCell(row?.[column])}</td>
                      ))}
                      <td className="admin-data-actions">
                        {currentTable?.writable ? <button type="button" aria-label="Edit row" onClick={() => openEdit(row)}><Edit3 size={14} /></button> : null}
                        {currentTable?.deletable !== false ? <button type="button" className="danger" aria-label={selectedTable === "auth_users" ? "Delete user account" : "Delete row"} onClick={() => removeRow(row)}><Trash2 size={14} /></button> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="admin-data-empty">No rows found.</div>
            )}
          </div>

          <div className="admin-data-note">
            Showing up to 100 rows at a time. Use the search field to filter the currently loaded rows. Destructive changes require confirmation.
          </div>
        </div>
      ) : null}

      {editor ? (
        <div className="admin-data-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setEditor(null); }}>
          <div className="admin-data-modal" role="dialog" aria-modal="true" aria-label={editor.mode === "create" ? "Add database row" : "Edit database row"}>
            <div className="admin-data-modal-head">
              <div>
                <span className="admin-label">{editor.mode === "create" ? "ADD ROW" : "EDIT ROW"}</span>
                <h3>{currentTable?.label || selectedTable}</h3>
              </div>
              <button type="button" onClick={() => setEditor(null)} disabled={saving} aria-label="Close"><X size={17} /></button>
            </div>
            <p>Edit the row as JSON. Keep IDs and relationship fields valid.</p>
            <textarea value={editorText} onChange={(event) => setEditorText(event.target.value)} spellCheck={false} />
            <div className="admin-data-modal-actions">
              <button type="button" className="secondary-button" onClick={() => setEditor(null)} disabled={saving}>Cancel</button>
              <button type="button" className="primary-button" onClick={saveEditor} disabled={saving}>{saving ? "Saving…" : "Save row"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
