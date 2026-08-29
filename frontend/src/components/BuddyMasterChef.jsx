import "./BuddyMasterChef.css";

const PIZZA_BUDDY_IMAGE =
  "/images/pizza-buddy-laptop.webp";

export default function BuddyMasterChef() {
  return (
    <div
      className="buddy-master-chef"
      aria-hidden="true"
    >
      <img
        src={PIZZA_BUDDY_IMAGE}
        alt=""
        draggable="false"
        decoding="async"
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center bottom",
          userSelect: "none",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
