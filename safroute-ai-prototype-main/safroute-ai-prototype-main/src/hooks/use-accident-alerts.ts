import { useEffect, useState } from "react";
import { getAccidentAlerts, subscribeAccidentAlerts, type AccidentAlert } from "@/lib/accidentAlerts";

export function useAccidentAlerts() {
  const [alerts, setAlerts] = useState<AccidentAlert[]>(() => getAccidentAlerts());

  useEffect(() => {
    return subscribeAccidentAlerts(setAlerts);
  }, []);

  return alerts;
}

