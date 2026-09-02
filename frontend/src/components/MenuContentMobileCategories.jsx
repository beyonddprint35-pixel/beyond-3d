import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronRight, EyeOff, Pencil, Plus } from "lucide-react";
import { groupBranch, ordered } from "../features/menu-engine/studio/menuStructure";

function VisibilitySwitch({ entry, name, t, onChange }) {
  const visible = entry.visible !== false;
  return (
    <label className="menu-content-v2-mobile-visibility">
      <input type="checkbox" role="switch" checked={visible} aria-label={`${t.visible}: ${name}`} onChange={(event) => onChange(event.target.checked)} />
      <span className="menu-content-v2-mobile-switch-track" aria-hidden="true" />
      <small>{visible ? t.shown : t.hidden}</small>
    </label>
  );
}

function MoveButtons({ index, count, horizontal = false, rtl, name, t, onMove }) {
  const firstStep = horizontal && rtl ? 1 : -1;
  const FirstIcon = horizontal ? ArrowLeft : ArrowUp;
  const LastIcon = horizontal ? ArrowRight : ArrowDown;
  return (
    <div className="menu-content-v2-mobile-move" dir="ltr">
      {[firstStep, -firstStep].map((step, position) => {
        const Icon = position === 0 ? FirstIcon : LastIcon;
        const label = horizontal ? (position === 0 ? t.moveLeft : t.moveRight) : (position === 0 ? t.moveUp : t.moveDown);
        return <button type="button" key={step} disabled={index + step < 0 || index + step >= count} aria-label={`${label}: ${name}`} title={label} onClick={() => onMove(step)}><Icon size={17} /></button>;
      })}
    </div>
  );
}

export default function MenuContentMobileCategories({
  menu, categories, activeCategory, contentLanguage, contentDir, rtl, t,
  textValue, priceSummary, onSelectCategory, onEdit, onAddCategory, onAddItem,
  onMoveGroup, onMoveItem, onVisibility,
}) {
  const branch = activeCategory ? groupBranch(menu.groups, activeCategory.id) : [];
  const groupName = (group) => textValue(group.name, contentLanguage) || (group.parent_id ? t.subcategoryName : t.categoryName);
  const itemName = (item) => textValue(item.name, contentLanguage) || t.itemName;
  function branchItemCount(group) {
    const ids = new Set(groupBranch(menu.groups, group.id).map((entry) => entry.id));
    return menu.items.filter((item) => ids.has(item.group_id)).length;
  }
  function renderItems(group, hiddenByParent) {
    const items = ordered(menu.items.filter((item) => item.group_id === group.id));
    return (
      <>
        <div className="menu-content-v2-mobile-item-list">
          {items.map((item, index) => (
            <div className={`menu-content-v2-mobile-item-entry ${item.visible === false || hiddenByParent ? "is-hidden" : ""}`} key={item.id}>
              <button type="button" className="menu-content-v2-mobile-item-row" onClick={() => onEdit({ type: "item", id: item.id })}>
                <span><strong dir={contentDir}>{itemName(item)}</strong><small>{priceSummary(item, menu.currency_symbol || "₪", contentLanguage) || t.noPrice}</small></span>
                <ChevronRight size={16} />
              </button>
              <div className="menu-content-v2-mobile-item-actions">
                <MoveButtons index={index} count={items.length} name={itemName(item)} t={t} onMove={(step) => onMoveItem(item.id, step)} />
                <VisibilitySwitch entry={item} name={itemName(item)} t={t} onChange={(visible) => onVisibility("items", item.id, visible)} />
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="menu-content-v2-mobile-add-item" onClick={() => onAddItem(group.id)}><Plus size={16} /> {t.addItem}</button>
      </>
    );
  }
  function renderGroup(group, isRoot) {
    const siblings = isRoot ? categories : ordered(menu.groups.filter((entry) => entry.parent_id === group.parent_id));
    const index = siblings.findIndex((entry) => entry.id === group.id);
    const hiddenByParent = !isRoot && activeCategory.visible === false;
    return (
      <section key={group.id} className={isRoot ? "menu-content-v2-mobile-category-content" : "menu-content-v2-mobile-subcategory"} aria-label={groupName(group)}>
        <header className="menu-content-v2-mobile-category-head">
          <div><span>{isRoot ? t.categoryEyebrow : t.subcategoryEyebrow}</span><h3 dir={contentDir}>{groupName(group)}</h3><small>{t.items(branchItemCount(group))}</small></div>
          <button type="button" className="menu-content-v2-mobile-category-edit" onClick={() => onEdit({ type: "category", id: group.id })} title={t.mobileEdit} aria-label={`${t.mobileEdit}: ${groupName(group)}`}><Pencil size={16} /></button>
        </header>
        <div className="menu-content-v2-mobile-group-actions">
          <MoveButtons index={index} count={siblings.length} horizontal={isRoot} rtl={rtl} name={groupName(group)} t={t} onMove={(step) => onMoveGroup(group.id, step)} />
          <VisibilitySwitch entry={group} name={groupName(group)} t={t} onChange={(visible) => onVisibility("groups", group.id, visible)} />
        </div>
        {group.visible === false || hiddenByParent ? <p className="menu-content-v2-mobile-hidden-note"><EyeOff size={14} />{hiddenByParent ? t.hiddenByCategory : t.hiddenGroup}</p> : null}
        {isRoot ? <div className="menu-content-v2-mobile-subcategory-heading"><button type="button" onClick={() => onAddCategory(group.id)}><Plus size={17} /> {t.addSubcategory}</button></div> : null}
        {renderItems(group, group.visible === false || hiddenByParent)}
        {isRoot ? <>
          {branch.length > 1 ? <div className="menu-content-v2-mobile-subcategory-heading"><strong>{t.subcategories}</strong></div> : null}
          {branch.slice(1).map((child) => renderGroup(child, false))}
        </> : null}
      </section>
    );
  }
  return (
    <div className="menu-content-v2-mobile-category-browser">
      <div className="menu-content-v2-mobile-category-nav">
        <div className="menu-content-v2-mobile-category-rail" aria-label={t.categories}>
          {categories.map((group) => (
            <button type="button" aria-pressed={activeCategory?.id === group.id} className={`menu-content-v2-mobile-category-tab ${activeCategory?.id === group.id ? "active" : ""}`} key={group.id} onClick={() => onSelectCategory(group.id)}>
              <strong dir={contentDir}>{groupName(group)}</strong><small>{group.visible === false ? <><EyeOff size={12} /> {t.hidden} · </> : null}{t.items(branchItemCount(group))}</small>
            </button>
          ))}
        </div>
        <button type="button" className="menu-content-v2-mobile-category-add" onClick={() => onAddCategory()} title={t.addCategory} aria-label={t.addCategory}><Plus size={21} /></button>
      </div>
      {activeCategory ? renderGroup(activeCategory, true) : null}
    </div>
  );
}
