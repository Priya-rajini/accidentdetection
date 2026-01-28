export type Severity = "Low" | "Medium" | "High" | "Critical";

export type HospitalStatus = "Ambulance Dispatched" | "Pending";
export type TrafficStatus = "Road Blocked" | "Diverted" | "Cleared";
export type InvestigationStatus = "Pending" | "Under Investigation" | "Completed";
export type RoadType = "Highway" | "City" | "Junction";

export interface AccidentAlert {
  id: string;
  createdAt: string; // ISO
  severity: Severity;
  confidence?: number; // 0-1
  lat: number;
  lng: number;
  location: string;

  // Dummy routing / assignments
  assignedHospital: string;
  assignedPoliceStation: string;

  // Details
  injured: number;
  vehicles: number;
  roadType: RoadType;

  // Evidence
  photoDataUrl?: string; // base64 data URL
  source: "image" | "video";

  // Workflow status (dashboard-specific)
  hospitalStatus: HospitalStatus;
  trafficStatus: TrafficStatus;
  investigationStatus: InvestigationStatus;

  // UI helper
  isNew: boolean;
}

const STORAGE_KEY = "safroute.accidentAlerts.v1";

function safeParseAlerts(raw: string | null): AccidentAlert[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as AccidentAlert[];
  } catch {
    return [];
  }
}

function loadAlerts(): AccidentAlert[] {
  if (typeof window === "undefined") return [];
  return safeParseAlerts(window.localStorage.getItem(STORAGE_KEY));
}

function saveAlerts(alerts: AccidentAlert[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

const emitter = new EventTarget();
const EVENT_NAME = "accident-alerts-updated";

export function getAccidentAlerts(): AccidentAlert[] {
  return loadAlerts();
}

export function subscribeAccidentAlerts(onChange: (alerts: AccidentAlert[]) => void) {
  const handler = () => onChange(loadAlerts());
  const listener = handler as EventListener;
  emitter.addEventListener(EVENT_NAME, listener);

  // Also listen for other tabs/windows
  const storageListener = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) handler();
  };
  window.addEventListener("storage", storageListener);

  // Initial fire
  handler();

  return () => {
    emitter.removeEventListener(EVENT_NAME, listener);
    window.removeEventListener("storage", storageListener);
  };
}

export function publishAccidentAlert(alert: AccidentAlert) {
  const alerts = loadAlerts();
  const next = [alert, ...alerts];
  saveAlerts(next);
  emitter.dispatchEvent(new Event(EVENT_NAME));
}

export function markAlertNotNew(alertId: string) {
  const alerts = loadAlerts();
  const next = alerts.map((a) => (a.id === alertId ? { ...a, isNew: false } : a));
  saveAlerts(next);
  emitter.dispatchEvent(new Event(EVENT_NAME));
}

