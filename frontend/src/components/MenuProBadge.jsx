import "./MenuProBadge.css";

const TOOLTIP = {
  en: "PRO feature · Included with the Premium plan",
  he: "יכולת PRO · כלולה בחבילת Premium",
  ar: "ميزة PRO · مشمولة في خطة Premium",
};

export default function MenuProBadge({ language = "en", className = "" }) {
  const tooltip = TOOLTIP[language] || TOOLTIP.en;
  return (
    <span
      className={`beyond-pro-badge ${className}`.trim()}
      data-pro-tooltip={tooltip}
      aria-label={tooltip}
      title={tooltip}
    >
      PRO
    </span>
  );
}
