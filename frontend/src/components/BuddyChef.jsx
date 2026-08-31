import { PIZZA_BUDDY_IMAGE } from "../assets/buddy/buddyImageData";
import "./BuddyChef.css";

export default function BuddyChef() {
  return (
    <div
      className="buddy-chef"
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
