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

export const incidentsAPI = {
  list() {
    return request<IncidentsListResponse>("/api/operator/incidents/");
  },

  get(id: string) {
    return request<Incident>(`/api/operator/incidents/${id}/`);
  },

  updateStatus(id: string, status: string) {
    return request<Incident>(`/api/operator/incidents/${id}/update-status/`, {
      method: "POST",
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

// ── Mock Citizens API (swap with real endpoints when available) ───────────────

const MOCK_CITIZENS: Citizen[] = [
  { id: "c1", full_name: "Abebe Kebede",   phone: "0911234567", email: "abebe@example.com",   joined_at: "2026-01-15T08:00:00Z", is_active: true,  kyc_status: "approved",      kyc: { id: "k1", id_type: "national_id",      id_number: "ETH-1234567", image_front: "https://placehold.co/400x250/e2e8f0/64748b?text=ID+Front", image_back: "https://placehold.co/400x250/e2e8f0/64748b?text=ID+Back", image_selfie: "https://placehold.co/400x250/e2e8f0/64748b?text=Selfie", submitted_at: "2026-01-16T10:00:00Z", reviewed_at: "2026-01-17T09:00:00Z", status: "approved", rejection_reason: null } },
  { id: "c2", full_name: "Tigist Alemu",   phone: "0922345678", email: "tigist@example.com",   joined_at: "2026-02-03T09:30:00Z", is_active: true,  kyc_status: "pending",       kyc: { id: "k2", id_type: "passport",         id_number: "EP-9876543", image_front: "https://placehold.co/400x250/e2e8f0/64748b?text=Passport", image_back: "https://placehold.co/400x250/e2e8f0/64748b?text=Passport+Back", image_selfie: "https://placehold.co/400x250/e2e8f0/64748b?text=Selfie", submitted_at: "2026-02-04T11:00:00Z", reviewed_at: null, status: "pending", rejection_reason: null } },
  { id: "c3", full_name: "Dawit Haile",    phone: "0933456789", email: "dawit@example.com",    joined_at: "2026-02-10T14:00:00Z", is_active: true,  kyc_status: "rejected",      kyc: { id: "k3", id_type: "drivers_license",  id_number: "DL-5551234", image_front: "https://placehold.co/400x250/e2e8f0/64748b?text=License", image_back: "https://placehold.co/400x250/e2e8f0/64748b?text=License+Back", image_selfie: "https://placehold.co/400x250/e2e8f0/64748b?text=Selfie", submitted_at: "2026-02-11T08:00:00Z", reviewed_at: "2026-02-12T10:00:00Z", status: "rejected", rejection_reason: "Image quality too low" } },
  { id: "c4", full_name: "Meron Tadesse",  phone: "0944567890", email: "meron@example.com",    joined_at: "2026-02-20T10:00:00Z", is_active: true,  kyc_status: "pending",       kyc: { id: "k4", id_type: "national_id",      id_number: "ETH-7654321", image_front: "https://placehold.co/400x250/e2e8f0/64748b?text=ID+Front", image_back: "https://placehold.co/400x250/e2e8f0/64748b?text=ID+Back", image_selfie: "https://placehold.co/400x250/e2e8f0/64748b?text=Selfie", submitted_at: "2026-02-21T09:00:00Z", reviewed_at: null, status: "pending", rejection_reason: null } },
  { id: "c5", full_name: "Yonas Girma",    phone: "0955678901", email: "yonas@example.com",    joined_at: "2026-03-01T07:00:00Z", is_active: false, kyc_status: "not_submitted", kyc: null },
  { id: "c6", full_name: "Hana Bekele",    phone: "0966789012", email: "hana@example.com",     joined_at: "2026-03-05T11:00:00Z", is_active: true,  kyc_status: "approved",      kyc: { id: "k6", id_type: "passport",         id_number: "EP-1122334", image_front: "https://placehold.co/400x250/e2e8f0/64748b?text=Passport", image_back: "https://placehold.co/400x250/e2e8f0/64748b?text=Passport+Back", image_selfie: "https://placehold.co/400x250/e2e8f0/64748b?text=Selfie", submitted_at: "2026-03-06T08:00:00Z", reviewed_at: "2026-03-07T10:00:00Z", status: "approved", rejection_reason: null } },
  { id: "c7", full_name: "Samuel Worku",   phone: "0977890123", email: "samuel@example.com",   joined_at: "2026-03-12T13:00:00Z", is_active: true,  kyc_status: "pending",       kyc: { id: "k7", id_type: "national_id",      id_number: "ETH-3344556", image_front: "https://placehold.co/400x250/e2e8f0/64748b?text=ID+Front", image_back: "https://placehold.co/400x250/e2e8f0/64748b?text=ID+Back", image_selfie: "https://placehold.co/400x250/e2e8f0/64748b?text=Selfie", submitted_at: "2026-03-13T09:00:00Z", reviewed_at: null, status: "pending", rejection_reason: null } },
  { id: "c8", full_name: "Liya Solomon",   phone: "0988901234", email: "liya@example.com",     joined_at: "2026-03-18T09:00:00Z", is_active: true,  kyc_status: "not_submitted", kyc: null },
  { id: "c9", full_name: "Biruk Tesfaye",  phone: "0999012345", email: "biruk@example.com",    joined_at: "2026-03-25T15:00:00Z", is_active: true,  kyc_status: "pending",       kyc: { id: "k9", id_type: "drivers_license",  id_number: "DL-9988776", image_front: "https://placehold.co/400x250/e2e8f0/64748b?text=License", image_back: "https://placehold.co/400x250/e2e8f0/64748b?text=License+Back", image_selfie: "https://placehold.co/400x250/e2e8f0/64748b?text=Selfie", submitted_at: "2026-03-26T10:00:00Z", reviewed_at: null, status: "pending", rejection_reason: null } },
  { id: "c10", full_name: "Rahel Mekonnen", phone: "0900123456", email: "rahel@example.com",   joined_at: "2026-04-01T08:00:00Z", is_active: true,  kyc_status: "approved",      kyc: { id: "k10", id_type: "national_id",     id_number: "ETH-6677889", image_front: "https://placehold.co/400x250/e2e8f0/64748b?text=ID+Front", image_back: "https://placehold.co/400x250/e2e8f0/64748b?text=ID+Back", image_selfie: "https://placehold.co/400x250/e2e8f0/64748b?text=Selfie", submitted_at: "2026-04-02T09:00:00Z", reviewed_at: "2026-04-03T11:00:00Z", status: "approved", rejection_reason: null } },
];

function delay<T>(val: T, ms = 400): Promise<T> {
  return new Promise(r => setTimeout(() => r(val), ms));
}

export const citizensAPI = {
  list(): Promise<Citizen[]> {
    return delay([...MOCK_CITIZENS]);
  },
  get(id: string): Promise<Citizen | null> {
    return delay(MOCK_CITIZENS.find(c => c.id === id) ?? null);
  },
  reviewKyc(citizenId: string, action: "approve" | "reject", reason?: string): Promise<Citizen | null> {
    const c = MOCK_CITIZENS.find(c => c.id === citizenId);
    if (!c || !c.kyc) return delay(null);
    const newStatus: KycStatus = action === "approve" ? "approved" : "rejected";
    c.kyc.status = newStatus;
    c.kyc.reviewed_at = new Date().toISOString();
    c.kyc.rejection_reason = reason ?? null;
    c.kyc_status = newStatus;
    return delay({ ...c });
  },
};
