import type { AssignedUnitBrief, Incident, IncidentStatus } from "@/types";
import { isForwardedAwayIncident } from "@/lib/forward-chain";

export function normalizeIncidentStatus(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "_");
}

/** Statuses the response unit advances via PATCH (field app). */
const UNIT_FIELD_STATUSES = new Set(["en_route", "reached", "served"]);

/** Operator or unit may mark false alarm from these statuses. */
const FALSE_ALARM_FROM = new Set(["dispatched", "en_route", "reached"]);

const TERMINAL = new Set(["resolved", "false_alarm"]);

export function canMarkFalseAlarm(current: string): boolean {
  return FALSE_ALARM_FROM.has(normalizeIncidentStatus(current));
}

export function isTerminalStatus(current: string): boolean {
  return TERMINAL.has(normalizeIncidentStatus(current));
}

/** System-only steps before operator acknowledges (opens detail). */
export function isAutoOnlyStatus(current: string): boolean {
  const s = normalizeIncidentStatus(current);
  return s === "pending" || s === "routed";
}

export function isUnread(incident: { is_read?: boolean; is_new?: boolean }): boolean {
  return incident.is_new === true || incident.is_read === false;
}

/**
 * Manual forward (operator) — matches backend workflow:
 * - routed → forward OK
 * - dispatched without unit → forward OK
 * - dispatched with unit / en_route+ → blocked
 */
export function canForwardIncident(incident: Incident): boolean {
  if (isForwardedAwayIncident(incident)) return false;
  if (isTerminalStatus(incident.status)) return false;
  const s = normalizeIncidentStatus(incident.status);
  if (s === "routed") return true;
  if (s === "dispatched" && !incident.assigned_unit) return true;
  return false;
}

/** First open / mark-read should move `routed` → `dispatched`. */
export function shouldAcknowledgeOnOpen(incident: Incident): boolean {
  const s = normalizeIncidentStatus(incident.status);
  return s === "routed" || isUnread(incident);
}

/** Operator never PATCHes en_route / reached / served / resolved. */
export function getOperatorPrimaryNextStatus(_incident: Incident): IncidentStatus | null {
  return null;
}

export function isUnitFieldStatus(status: string): boolean {
  return UNIT_FIELD_STATUSES.has(normalizeIncidentStatus(status));
}

/** At `dispatched`, operator must assign a unit before field work begins. */
export function needsUnitAssignment(incident: Incident): boolean {
  return (
    normalizeIncidentStatus(incident.status) === "dispatched" &&
    !incident.assigned_unit
  );
}

/** Waiting for citizen feedback or unit manual close. */
export function isAwaitingClosure(status: string): boolean {
  return normalizeIncidentStatus(status) === "served";
}

/** Show field-unit guidance while unit is on an active assignment. */
export function isFieldProgressByUnit(incident: Incident): boolean {
  if (!incident.assigned_unit) return false;
  const s = normalizeIncidentStatus(incident.status);
  return s === "dispatched" || UNIT_FIELD_STATUSES.has(s);
}

export function getOperatorWorkflowHint(incident: Incident): string | null {
  const s = normalizeIncidentStatus(incident.status);
  if (s === "pending") {
    return "System is processing the citizen report.";
  }
  if (s === "routed") {
    return "Wrong station? Forward below, or open to acknowledge and dispatch.";
  }
  if (needsUnitAssignment(incident)) {
    return "Forward if this belongs elsewhere, or assign a unit to dispatch.";
  }
  if (
    incident.assigned_unit &&
    normalizeIncidentStatus(incident.status) === "dispatched"
  ) {
    return "Unit assigned — field team marks en route from the unit app.";
  }
  if (isFieldProgressByUnit(incident) && UNIT_FIELD_STATUSES.has(s)) {
    return "Response unit updates en route, on scene, and served via the field app.";
  }
  if (isAwaitingClosure(s)) {
    return "Awaiting citizen feedback or unit closure to resolve.";
  }
  return null;
}

export function canAssignUnit(incident: Incident): boolean {
  if (isTerminalStatus(incident.status)) return false;
  return !incident.assigned_unit;
}

export function canDetachUnit(incident: Incident): boolean {
  return Boolean(incident.assigned_unit) && !isTerminalStatus(incident.status);
}

export function shouldShowUnitTracking(incident: Incident): boolean {
  if (!incident.assigned_unit) return false;
  const s = normalizeIncidentStatus(incident.status);
  return s === "dispatched" || UNIT_FIELD_STATUSES.has(s);
}

/** @deprecated Use isFieldProgressByUnit */
export function isFieldStatusManagedByUnit(incident: Incident): boolean {
  return isFieldProgressByUnit(incident);
}

/** @deprecated Operator does not advance the primary chain */
export function getPrimaryNextStatus(_current: string): IncidentStatus | null {
  return null;
}

/** @deprecated Operator does not advance the primary chain */
export function getPrimaryNextLabel(_current: string): string {
  return "";
}
