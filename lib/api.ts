import { getAccessToken, clearAuth } from "@/lib/auth";
import type { ForwardTarget } from "@/lib/incident-forward";
import type {
  LoginRequest,
  LoginResponse,
  AdminDashboardData,
  OperatorDashboardData,
  Station,
  Operator,
  OperatorsListResponse,
  CreateOperatorResponse,
  ResetPasswordResponse,
  Incident,
  IncidentsListResponse,
  IncidentForwardResponse,
  IncidentForwardingSettings,
  StationNonResponseStatsResponse,
  IncidentForwardHistoryResponse,
  Citizen,
  KycStatus,
  ResponseUnit,
  CreateResponseUnitPayload,
  CreateResponseUnitResponse,
  UnitTrackingResponse,
} from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://eras-api.onrender.com";

// Capture native fetch before any browser extension can monkey-patch it
const nativeFetch: typeof fetch =
  typeof window !== "undefined"
    ? window.fetch.bind(window)
    : (globalThis.fetch as typeof fetch);

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T | null> {
  try {
    const token = getAccessToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await nativeFetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      clearAuth();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return null;
    }

    if (!res.ok) return null;

    if (res.status === 204) return null;

    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function parseApiErrorBody(body: unknown): string {
  if (body === null || body === undefined) return "Request failed";
  if (typeof body === "string") {
    if (body.trimStart().startsWith("<!") || body.includes("<html")) {
      return "Server error — try again or contact support.";
    }
    return body;
  }
  if (typeof body !== "object") return "Request failed";
  const o = body as Record<string, unknown>;
  if (typeof o.detail === "string") return o.detail;
  if (Array.isArray(o.detail)) {
    return o.detail.map((d) => String(d)).join(". ");
  }
  const parts: string[] = [];
  for (const [key, val] of Object.entries(o)) {
    if (key === "detail") continue;
    if (Array.isArray(val)) parts.push(`${key}: ${val.join(", ")}`);
    else if (typeof val === "string") parts.push(val);
  }
  return parts.length > 0 ? parts.join(". ") : "Request failed";
}

/** Like `request` but returns a human-readable error message on failure. */
async function requestWithError<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null }> {
  try {
    const token = getAccessToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await nativeFetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      clearAuth();
      if (typeof window !== "undefined") window.location.href = "/login";
      return { data: null, error: "Session expired" };
    }

    if (res.status === 204) return { data: null, error: null };

    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    if (!res.ok) {
      return { data: null, error: parseApiErrorBody(body) };
    }

    return { data: body as T, error: null };
  } catch {
    return { data: null, error: "Network error" };
  }
}

/** Returns true on 2xx (including 204), false on any error. */
async function requestDelete(endpoint: string): Promise<boolean> {
  let res: Response;
  try {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    res = await nativeFetch(`${BASE_URL}${endpoint}`, {
      method: "DELETE",
      headers,
    });
  } catch (err) {
    console.error("Delete request failed:", err);
    return false;
  }

  if (res.status === 401) {
    clearAuth();
    if (typeof window !== "undefined") window.location.href = "/login";
    return false;
  }

  // Log response for debugging
  if (!res.ok) {
    console.error(`Delete failed with status ${res.status}:`, await res.text().catch(() => "Unable to read response"));
  }

  return res.ok;
}

export const authAPI = {
  login(data: LoginRequest) {
    return request<LoginResponse>("/api/auth/login/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  me() {
    return request<LoginResponse>("/api/auth/me/");
  },

  updateProfile(data: Partial<{ full_name: string; email: string }>) {
    return request<LoginResponse>("/api/auth/profile/", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  changePassword(data: { old_password: string; new_password: string }) {
    return requestWithError<{ detail: string }>("/api/auth/change-password/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

export const dashboardAPI = {
  admin() {
    return request<AdminDashboardData>("/api/admin/dashboard/");
  },

  operator() {
    return request<OperatorDashboardData>("/api/operator/dashboard/");
  },
};

export const stationsAPI = {
  list() {
    return request<Station[]>("/api/admin/stations/");
  },

  create(data: Omit<Station, "id" | "is_active">) {
    return request<Station>("/api/admin/stations/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  delete(id: string) {
    return requestDelete(`/api/admin/stations/${id}/`);
  },
};

/** Extract incident rows from common API shapes (custom `{ data }`, DRF `{ results }`, or a bare array). */
function incidentsArrayFromListBody(body: unknown): Incident[] | null {
  if (body === null || body === undefined) return null;
  if (Array.isArray(body)) return body as Incident[];

  if (typeof body !== "object") return null;
  const o = body as Record<string, unknown>;

  if (Array.isArray(o.data)) return o.data as Incident[];
  if (Array.isArray(o.results)) return o.results as Incident[];

  const nested = o.data;
  if (nested && typeof nested === "object" && Array.isArray((nested as Record<string, unknown>).results)) {
    return (nested as { results: Incident[] }).results;
  }

  return null;
}

function unreadCountFromListBody(body: unknown): number | undefined {
  if (body === null || body === undefined || typeof body !== "object") return undefined;
  const n = (body as Record<string, unknown>).unread_count;
  return typeof n === "number" ? n : undefined;
}

function stationsArrayFromListBody(body: unknown): Station[] {
  if (body === null || body === undefined) return [];
  if (Array.isArray(body)) return body as Station[];
  if (typeof body !== "object") return [];
  const o = body as Record<string, unknown>;
  if (Array.isArray(o.data)) return o.data as Station[];
  if (Array.isArray(o.results)) return o.results as Station[];
  return [];
}

function unitsArrayFromListBody(body: unknown): ResponseUnit[] {
  if (body === null || body === undefined) return [];
  if (Array.isArray(body)) return body as ResponseUnit[];
  if (typeof body !== "object") return [];
  const o = body as Record<string, unknown>;
  if (Array.isArray(o.data)) return o.data as ResponseUnit[];
  if (Array.isArray(o.results)) return o.results as ResponseUnit[];
  return [];
}

export const incidentsAPI = {
  async list(): Promise<IncidentsListResponse | null> {
    const body = await request<unknown>("/api/operator/incidents/");
    if (body === null) return null;
    const data = incidentsArrayFromListBody(body);
    if (data === null) return null;
    return { data, unread_count: unreadCountFromListBody(body) };
  },

  get(id: string) {
    return request<Incident>(`/api/operator/incidents/${id}/`);
  },

  markRead(id: string) {
    return request<Incident>(`/api/operator/incidents/${id}/read/`, {
      method: "POST",
    });
  },

  updateStatus(id: string, status: string) {
    return request<Incident>(`/api/operator/incidents/${id}/status/`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async forward(
    incidentId: string,
    body: { target: ForwardTarget; station_id?: string; reason?: string }
  ) {
    return requestWithError<IncidentForwardResponse>(
      `/api/operator/incidents/${incidentId}/forward/`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );
  },

  async listOperatorStations(): Promise<Station[]> {
    const body = await request<unknown>("/api/operator/stations/");
    return stationsArrayFromListBody(body);
  },

  async assignUnit(incidentId: string, unitId: string) {
    return requestWithError<Incident>(
      `/api/operator/incidents/${incidentId}/assign-unit/`,
      {
        method: "POST",
        body: JSON.stringify({ unit_id: unitId }),
      }
    );
  },

  async detachUnit(incidentId: string) {
    return requestWithError<Incident>(
      `/api/operator/incidents/${incidentId}/detach-unit/`,
      { method: "POST" }
    );
  },

  getUnitTracking(incidentId: string) {
    return request<UnitTrackingResponse>(
      `/api/operator/incidents/${incidentId}/unit-tracking/`
    );
  },
};

export const unitsAPI = {
  async list(params?: {
    include_inactive?: boolean;
    available_only?: boolean;
  }): Promise<ResponseUnit[]> {
    const q = new URLSearchParams();
    if (params?.include_inactive) q.set("include_inactive", "true");
    if (params?.available_only) q.set("available_only", "true");
    const qs = q.toString();
    const endpoint = qs
      ? `/api/operator/units/?${qs}`
      : "/api/operator/units/";
    const body = await request<unknown>(endpoint);
    return unitsArrayFromListBody(body);
  },

  create(data: CreateResponseUnitPayload) {
    return requestWithError<CreateResponseUnitResponse>(
      "/api/operator/units/",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  get(id: string) {
    return request<ResponseUnit>(`/api/operator/units/${id}/`);
  },

  update(
    id: string,
    data: Partial<{
      name: string;
      unit_type: string;
      notes: string;
      is_active: boolean;
    }>
  ) {
    return requestWithError<ResponseUnit>(`/api/operator/units/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deactivate(id: string): Promise<{ ok: boolean; error: string | null }> {
    const patch = await requestWithError<ResponseUnit>(
      `/api/operator/units/${id}/`,
      {
        method: "PATCH",
        body: JSON.stringify({ is_active: false }),
      }
    );
    if (patch.data) return { ok: true, error: null };

    const del = await requestWithError<null>(`/api/operator/units/${id}/`, {
      method: "DELETE",
    });
    if (!del.error) return { ok: true, error: null };

    return {
      ok: false,
      error: patch.error ?? del.error ?? "Could not deactivate unit.",
    };
  },

  async reactivate(id: string): Promise<{ ok: boolean; error: string | null }> {
    const { data, error } = await this.update(id, { is_active: true });
    if (data) return { ok: true, error: null };
    return { ok: false, error: error ?? "Could not reactivate unit." };
  },
};

export const incidentForwardingAdminAPI = {
  getSettings() {
    return request<IncidentForwardingSettings>(
      "/api/admin/settings/incident-forwarding/"
    );
  },

  updateSettings(undispatched_forward_minutes: number) {
    return requestWithError<IncidentForwardingSettings>(
      "/api/admin/settings/incident-forwarding/",
      {
        method: "PATCH",
        body: JSON.stringify({ undispatched_forward_minutes }),
      }
    );
  },

  getNonResponseStats() {
    return request<StationNonResponseStatsResponse>(
      "/api/admin/stations/non-response-stats/"
    );
  },

  getForwardHistory(incidentId: string) {
    return request<IncidentForwardHistoryResponse>(
      `/api/admin/incidents/${incidentId}/forward-history/`
    );
  },
};

export const operatorsAPI = {
  list() {
    return request<OperatorsListResponse>("/api/admin/operators/");
  },

  create(data: {
    full_name: string;
    phone: string;
    email: string;
    station_id: string;
  }) {
    return request<CreateOperatorResponse>("/api/admin/operators/create/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update(id: string, data: Partial<Operator>) {
    return request<Operator>(`/api/admin/operators/${id}/`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  delete(id: string) {
    return requestDelete(`/api/admin/operators/${id}/`);
  },

  resetPassword(id: string) {
    return request<ResetPasswordResponse>(
      `/api/admin/operators/${id}/reset-password/`,
      { method: "POST" }
    );
  },

  reassignStation(id: string, data: { station_id: string }) {
    return requestWithError<Operator>(
      `/api/admin/operators/${id}/reassign-station/`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
  },
};

// ── Citizens API ───────────────────────────────────────────────────────────────

interface CitizensListResponse {
  data: Citizen[];
  total: number;
}

/** Extract citizen rows from common API shapes and normalize field names. */
function citizensArrayFromListBody(body: unknown): Citizen[] {
  if (body === null || body === undefined) return [];
  
  let citizens: Citizen[] = [];
  
  if (Array.isArray(body)) {
    citizens = body as Citizen[];
  } else if (typeof body === "object") {
    const o = body as Record<string, unknown>;
    
    if (Array.isArray(o.data)) {
      citizens = o.data as Citizen[];
    } else if (Array.isArray(o.results)) {
      citizens = o.results as Citizen[];
    } else {
      const nested = o.data;
      if (nested && typeof nested === "object" && Array.isArray((nested as Record<string, unknown>).results)) {
        citizens = (nested as { results: Citizen[] }).results;
      }
    }
  }

  // Normalize field names: map created_at to joined_at for backward compatibility
  return citizens.map(c => ({
    ...c,
    joined_at: c.joined_at || c.created_at,
  }));
}

export const citizensAPI = {
  async list(): Promise<Citizen[]> {
    const body = await request<unknown>("/api/admin/citizens/");
    return citizensArrayFromListBody(body);
  },

  async get(id: string): Promise<Citizen | null> {
    const citizen = await request<Citizen>(`/api/admin/citizens/${id}/`);
    if (!citizen) return null;
    
    // Normalize field names: map created_at to joined_at for backward compatibility
    return {
      ...citizen,
      joined_at: citizen.joined_at || citizen.created_at,
    };
  },

  reviewKyc(citizenId: string, action: "approve" | "reject", reason?: string) {
    return request<Citizen>(`/api/admin/citizens/${citizenId}/review-kyc/`, {
      method: "POST",
      body: JSON.stringify({ action, reason }),
    });
  },
};
