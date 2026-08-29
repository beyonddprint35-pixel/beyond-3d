export default function BuddyMascot() {
  return (
    <div
      className="buddy-mascot"
      aria-hidden="true"
    >
      <img
        src="/images/salad-buddy-presenting.webp"
        alt=""
        draggable="false"
        decoding="async"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: "contain",
          objectPosition: "center bottom",
          userSelect: "none",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
