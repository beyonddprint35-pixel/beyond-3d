import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import AdminPricingSettings from "../components/AdminPricingSettings";
import Admin from "./Admin";

export default function AdminWithPricing() {
  const [target, setTarget] = useState(null);
  const [password, setPassword] = useState("");

  useEffect(() => {
    let mount = null;

    function sync() {
      const adminPage = document.querySelector(".admin-page");
      const heading = document.querySelector(".admin-heading");
      const storedPassword = sessionStorage.getItem("beyond_admin_password") || "";

      if (!adminPage || !heading || !storedPassword) {
        if (mount) {
          mount.remove();
          mount = null;
          setTarget(null);
        }
        setPassword(storedPassword);
        return;
      }

      setPassword(storedPassword);

      if (!mount || !mount.isConnected) {
        mount = document.createElement("div");
        mount.className = "admin-pricing-portal";
        heading.insertAdjacentElement("afterend", mount);
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

  return (
    <>
      <Admin />
      {target && password
        ? createPortal(<AdminPricingSettings password={password} />, target)
        : null}
    </>
  );
}
