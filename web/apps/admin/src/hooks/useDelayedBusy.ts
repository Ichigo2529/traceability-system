import { useEffect, useState } from "react";

export function useDelayedBusy(isBusy: boolean, delayMs = 250) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isBusy) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, isBusy]);

  return visible;
}

