import type { OptimizationSession } from "@/lib/routeEngine";

const ROUTE_SESSION_KEY = "routeOptimizationSession";

export function saveOptimizationSession(session: OptimizationSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ROUTE_SESSION_KEY, JSON.stringify(session));
}

export function loadOptimizationSession(): OptimizationSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ROUTE_SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as OptimizationSession;
  } catch {
    return null;
  }
}

export function clearOptimizationSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ROUTE_SESSION_KEY);
}

export function setApprovedPlan(mode: "baseline" | "dynamic") {
  const current = loadOptimizationSession();
  if (!current) return;

  current.approvedPlan = mode;
  current.savedAt = new Date().toISOString();
  saveOptimizationSession(current);
}