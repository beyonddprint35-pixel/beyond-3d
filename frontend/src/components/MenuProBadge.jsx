import "./MenuProBadge.css";

const TOOLTIP = {
  en: "Available with a Pro plan subscription",
  he: "זמין במסגרת מנוי Beyond Pro",
  ar: "متاح ضمن اشتراك Beyond Pro",
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
