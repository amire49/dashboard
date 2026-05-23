import { getAccessToken, clearAuth } from "@/lib/auth";
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
  Citizen,
  KycStatus,
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
    return request<{ detail: string }>("/api/auth/change-password/", {
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
