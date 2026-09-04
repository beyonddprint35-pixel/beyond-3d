import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, Search, UserRoundCog } from "lucide-react";
import {
  loadAdminMenuOwnership,
  transferAdminMenuOwnership,
} from "../features/menu-engine/data/adminMenuOwnershipService";

function userLabel(user) {
  if (!user) return "Unassigned";
  const name = String(user.name || "").trim();
  return name ? `${name} · ${user.email || ""}` : (user.email || user.id);
}

export default function AdminMenuOwnershipManager() {
  const [menus, setMenus] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [selectedMenuId, setSelectedMenuId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await loadAdminMenuOwnership();
      setMenus(data.projects || []);
      setUsers(data.users || []);
      setSelectedMenuId((current) => current || data.projects?.[0]?.id || "");
    } catch (err) {
      setError(err.message || "Could not load menu ownership.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const filteredMenus = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return menus;
    return menus.filter((menu) => {
      const owner = usersById.get(menu.owner_user_id);
      return [menu.name, menu.published_slug, owner?.email, owner?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [menus, search, usersById]);

  const selectedMenu = menus.find((menu) => menu.id === selectedMenuId);
  const currentOwner = selectedMenu ? usersById.get(selectedMenu.owner_user_id) : null;
  const selectedUser = usersById.get(selectedUserId);
  const canTransfer = Boolean(selectedMenuId && selectedUserId && selectedUserId !== selectedMenu?.owner_user_id && !saving);

  async function transfer() {
    if (!canTransfer || !selectedMenu || !selectedUser) return;
    const ok = window.confirm(
      `Reassign “${selectedMenu.name || "Untitled menu"}” from ${userLabel(currentOwner)} to ${userLabel(selectedUser)}?`,
    );
    if (!ok) return;

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await transferAdminMenuOwnership(selectedMenu.id, selectedUser.id);
      setMenus((current) => current.map((menu) => (
        menu.id === selectedMenu.id ? { ...menu, owner_user_id: selectedUser.id } : menu
      )));
      setNotice(result.warning || `Menu assigned to ${userLabel(selectedUser)}.`);
      setSelectedUserId("");
    } catch (err) {
      setError(err.message || "Could not reassign this menu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={{ marginBottom: 34, padding: 20, border: "1px solid rgba(73,116,229,.28)", borderRadius: 20, background: "rgba(73,116,229,.07)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div className="section-kicker">MENU ADMIN</div>
          <h2 style={{ margin: "5px 0 5px", fontSize: 24 }}>Menu ownership</h2>
          <p style={{ margin: 0, opacity: .72 }}>Assign or reassign any menu to a verified Beyond user.</p>
        </div>
        <button type="button" className="secondary-button" onClick={load} disabled={loading}>
          <RefreshCw size={15} /> {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error ? <div className="admin-error" style={{ marginBottom: 14 }}>{error}</div> : null}
      {notice ? <div style={{ display: "flex", gap: 8, alignItems: "center", padding: 12, borderRadius: 12, marginBottom: 14, background: "rgba(60,180,115,.12)" }}><CheckCircle2 size={17} /> {notice}</div> : null}

      {!loading && !error ? (
        <div style={{ display: "grid", gap: 14 }}>
          <label style={{ display: "grid", gap: 7 }}>
            <span className="admin-label">FIND MENU</span>
            <div style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: 14, top: 15, opacity: .55 }} />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search menu, slug or current owner…"
                style={{ width: "100%", minHeight: 46, padding: "0 14px 0 40px", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(0,0,0,.18)", color: "inherit" }}
              />
            </div>
          </label>

          <label style={{ display: "grid", gap: 7 }}>
            <span className="admin-label">MENU</span>
            <select value={selectedMenuId} onChange={(event) => { setSelectedMenuId(event.target.value); setSelectedUserId(""); setNotice(""); }} style={{ minHeight: 48, padding: "0 12px", borderRadius: 12 }}>
              {filteredMenus.map((menu) => (
                <option key={menu.id} value={menu.id}>{menu.name || "Untitled menu"}{menu.archived_at ? " · Archived" : ""}</option>
              ))}
            </select>
          </label>

          {selectedMenu ? (
            <div style={{ display: "grid", gap: 5, padding: 12, borderRadius: 12, background: "rgba(255,255,255,.045)" }}>
              <span className="admin-label">CURRENT OWNER</span>
              <strong>{userLabel(currentOwner) || selectedMenu.owner_user_id || "Unassigned"}</strong>
              <small style={{ opacity: .6 }}>Created by stays unchanged when ownership is transferred.</small>
            </div>
          ) : null}

          <label style={{ display: "grid", gap: 7 }}>
            <span className="admin-label">ASSIGN TO VERIFIED USER</span>
            <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} style={{ minHeight: 48, padding: "0 12px", borderRadius: 12 }}>
              <option value="">Choose a verified user…</option>
              {users.map((user) => <option key={user.id} value={user.id}>{userLabel(user)}</option>)}
            </select>
          </label>

          <button type="button" className="primary-button" onClick={transfer} disabled={!canTransfer} style={{ minHeight: 48, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <UserRoundCog size={17} /> {saving ? "Reassigning…" : selectedMenu?.owner_user_id ? "Reassign menu" : "Assign menu"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
