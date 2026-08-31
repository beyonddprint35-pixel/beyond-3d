import { TACOS_BUDDY_IMAGE } from "../assets/buddy/buddyImageData";
import "./BuddyMasterChef.css";

export default function BuddyMasterChef() {
  return (
    <div
      className="buddy-master-chef"
      data-buddy="tacos"
      aria-hidden="true"
    >
      <img
        src={TACOS_BUDDY_IMAGE}
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
