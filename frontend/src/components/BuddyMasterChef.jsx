import "./BuddyMasterChef.css";

const FINAL_CTA_TACOS_BUDDY_IMAGE =
  "/images/tacos-buddy-phone.webp?v=final-cta-tacos";

export default function BuddyMasterChef() {
  return (
    <div
      className="buddy-master-chef"
      data-buddy="tacos"
      aria-hidden="true"
    >
      <img
        src={FINAL_CTA_TACOS_BUDDY_IMAGE}
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
