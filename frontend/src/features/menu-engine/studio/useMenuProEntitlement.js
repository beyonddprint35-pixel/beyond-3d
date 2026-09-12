import { useEffect, useMemo, useState } from "react";

import {
  loadMenuSubscription,
  menuSubscriptionAccess,
  peekMenuSubscription,
} from "../data/menuSubscriptionService";

export default function useMenuProEntitlement(projectId) {
  const validProjectId = projectId && projectId !== "draft" ? String(projectId) : "";
  const [subscription, setSubscription] = useState(() => (
    validProjectId ? peekMenuSubscription(validProjectId, { allowStale: true }) : null
  ));
  const [loading, setLoading] = useState(() => Boolean(validProjectId && !subscription));
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!validProjectId) {
      setSubscription(null);
      setLoading(false);
      setError("");
      return () => { cancelled = true; };
    }

    const cached = peekMenuSubscription(validProjectId, { allowStale: true });
    if (cached) setSubscription(cached);
    setLoading(!cached);
    setError("");

    loadMenuSubscription(validProjectId)
      .then((next) => {
        if (!cancelled) setSubscription(next);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError?.message || "Could not verify the subscription plan.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [validProjectId]);

  const access = useMemo(() => menuSubscriptionAccess(subscription), [subscription]);
  return { ...access, subscription, loading, error };
}
