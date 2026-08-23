import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import CustomerShowcaseSection from "./CustomerShowcaseSection";

export default function CustomerShowcasePortal() {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    let mount = null;

    function sync() {
      if (window.location.pathname !== "/") {
        if (mount) {
          mount.remove();
          mount = null;
          setTarget(null);
        }
        return;
      }

      const finalSection = document.querySelector(".menu-home-final");
      if (!finalSection || !finalSection.parentElement) return;

      if (!mount || !mount.isConnected) {
        mount = document.createElement("div");
        mount.className = "menu-customer-showcase-portal";
        finalSection.insertAdjacentElement("beforebegin", mount);
        setTarget(mount);
      }
    }

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (mount) mount.remove();
    };
  }, []);

  return target ? createPortal(<CustomerShowcaseSection />, target) : null;
}
