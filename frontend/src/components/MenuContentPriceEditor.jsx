import { Plus, Trash2 } from "lucide-react";

const PRICE_TYPES = [
  { key: "one_third", en: "1/3", he: "1/3", ar: "1/3" },
  { key: "one_half", en: "1/2", he: "1/2", ar: "1/2" },
  { key: "small", en: "Small", he: "קטן", ar: "صغير" },
  { key: "large", en: "Large", he: "גדול", ar: "كبير" },
  { key: "shot", en: "Shot", he: "שוט", ar: "شوت" },
  { key: "glass", en: "Glass", he: "כוס", ar: "كأس" },
  { key: "bottle", en: "Bottle", he: "בקבוק", ar: "زجاجة" },
  { key: "custom", en: "Custom", he: "מותאם אישית", ar: "مخصص" },
];

function optionLabel(option, language) {
  return String(
    option?.[`label_${language}`]
      || option?.label
      || option?.label_en
      || option?.label_he
      || option?.label_ar
      || "",
  );
}

function resolveTypeKey(option) {
  const stored = String(option?.label_key || "").trim();
  if (PRICE_TYPES.some((entry) => entry.key === stored)) return stored;
  const labels = [option?.label, option?.label_en, option?.label_he, option?.label_ar]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
  const match = PRICE_TYPES.find((entry) => entry.key !== "custom" && labels.some((label) => [entry.en, entry.he, entry.ar].map((value) => value.toLowerCase()).includes(label)));
  return match?.key || "custom";
}

function typedOption(typeKey, price = "", previous = {}) {
  const type = PRICE_TYPES.find((entry) => entry.key === typeKey) || PRICE_TYPES.at(-1);
  if (type.key === "custom") {
    return {
      ...previous,
      label_key: "custom",
      price: String(price || previous.price || ""),
    };
  }
  return {
    ...previous,
    label_key: type.key,
    label: type.en,
    label_en: type.en,
    label_he: type.he,
    label_ar: type.ar,
    price: String(price || previous.price || ""),
  };
}

export default function MenuContentPriceEditor({
  item,
  currencySymbol = "₪",
  contentLanguage = "en",
  contentDir = "ltr",
  t,
  onChange,
}) {
  const options = Array.isArray(item?.price_options) ? item.price_options : [];
  const multiple = options.length > 0;

  function setOptions(nextOptions) {
    onChange?.({ price: "", price_options: nextOptions });
  }

  function emptyCustomOption(price = "") {
    return typedOption("custom", price, {
      label: "",
      label_en: "",
      label_he: "",
      label_ar: "",
    });
  }

  function useMultiplePrices() {
    const existing = String(item?.price || "").trim();
    setOptions([
      emptyCustomOption(existing),
      emptyCustomOption(""),
    ]);
  }

  function useSinglePrice() {
    const firstPrice = String(options[0]?.price || "").trim();
    onChange?.({ price: firstPrice, price_options: [] });
  }

  function updateOption(index, patch) {
    setOptions(options.map((option, optionIndex) => optionIndex === index ? { ...option, ...patch } : option));
  }

  function changeType(index, typeKey) {
    setOptions(options.map((option, optionIndex) => optionIndex === index ? typedOption(typeKey, option.price, option) : option));
  }

  function updateCustomLabel(index, value) {
    const key = `label_${contentLanguage}`;
    const option = options[index] || {};
    updateOption(index, {
      [key]: value,
      ...(contentLanguage === "en" || !option.label ? { label: value } : {}),
      label_key: "custom",
    });
  }

  function addOption() {
    setOptions([
      ...options,
      emptyCustomOption(""),
    ]);
  }

  function removeOption(index) {
    const next = options.filter((_, optionIndex) => optionIndex !== index);
    if (!next.length) {
      onChange?.({ price: "", price_options: [] });
      return;
    }
    setOptions(next);
  }

  if (!multiple) {
    return (
      <div className="menu-content-v2-price-editor">
        <div className="menu-content-v2-field">
          <label>{t.price}</label>
          <div className="menu-content-v2-price">
            <span>{currencySymbol}</span>
            <input
              inputMode="decimal"
              dir="ltr"
              value={item?.price || ""}
              onChange={(event) => onChange?.({ price: event.target.value, price_options: [] })}
              placeholder="0"
            />
          </div>
        </div>
        <button type="button" className="menu-content-v2-price-mode" onClick={useMultiplePrices}>
          <Plus size={14} /> {t.useMultiplePrices}
        </button>
      </div>
    );
  }

  return (
    <div className="menu-content-v2-price-options">
      <header>
        <div><strong>{t.priceOptions}</strong><small>{t.multiPriceHelp}</small></div>
        <button type="button" onClick={useSinglePrice}>{t.useSinglePrice}</button>
      </header>

      {options.map((option, optionIndex) => {
        const typeKey = resolveTypeKey(option);
        return (
          <div className="menu-content-v2-price-option" key={`${item?.id || "item"}-price-${optionIndex}`}>
            <div className="menu-content-v2-price-option-type">
              <label>{t.priceType}</label>
              <select value={typeKey} onChange={(event) => changeType(optionIndex, event.target.value)}>
                {PRICE_TYPES.map((type) => <option key={type.key} value={type.key}>{type[contentLanguage] || type.en}</option>)}
              </select>
              {typeKey === "custom" ? (
                <input
                  className="menu-content-v2-price-option-custom"
                  dir={contentDir}
                  value={optionLabel(option, contentLanguage)}
                  onChange={(event) => updateCustomLabel(optionIndex, event.target.value)}
                  placeholder={t.customPriceLabel}
                />
              ) : null}
            </div>

            <label className="menu-content-v2-price-option-price">
              {t.optionPrice}
              <span>{currencySymbol}</span>
              <input
                inputMode="decimal"
                dir="ltr"
                value={option.price || ""}
                onChange={(event) => updateOption(optionIndex, { price: event.target.value })}
                placeholder="0"
              />
            </label>

            <button type="button" className="menu-content-v2-price-option-remove" onClick={() => removeOption(optionIndex)} title={t.removePriceOption}>
              <Trash2 size={14} />
            </button>
          </div>
        );
      })}

      <button type="button" className="menu-content-v2-price-add" onClick={addOption}>
        <Plus size={14} /> {t.addPriceOption}
      </button>
    </div>
  );
}
