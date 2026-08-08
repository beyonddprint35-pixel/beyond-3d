function Brand({
  size = 42,
  textSize = 18,
  gap = 12,
  className = "",
  subtitle = "",
}) {
  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: `${gap}px`,
        minWidth: 0,
      }}
    >
      <img
        src="/beyond-logo.png"
        alt="Beyond logo"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          objectFit: "contain",
          display: "block",
          flexShrink: 0,
        }}
      />

      <div
        style={{
          display: "grid",
          gap: subtitle ? "3px" : 0,
        }}
      >
        <strong
          style={{
            color: "#ffffff",
            fontSize: `${textSize}px`,
            lineHeight: 1,
            fontWeight: 800,
            letterSpacing: "0.32em",
            whiteSpace: "nowrap",
          }}
        >
          BEYOND
        </strong>

        {subtitle && (
          <span
            style={{
              color: "#6f829d",
              fontSize: "10px",
              lineHeight: 1.2,
              letterSpacing: "0.08em",
              whiteSpace: "nowrap",
            }}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

export default Brand;
