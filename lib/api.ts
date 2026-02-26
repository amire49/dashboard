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
} from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://eras-backend.onrender.com";

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

    const res = await fetch(`${BASE_URL}${endpoint}`, {
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
    return request<null>(`/api/admin/stations/${id}/`, {
      method: "DELETE",
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
    return request<null>(`/api/admin/operators/${id}/`, {
      method: "DELETE",
    });
  },

  resetPassword(id: string) {
    return request<ResetPasswordResponse>(
      `/api/admin/operators/${id}/reset-password/`,
      { method: "POST" }
    );
  },
};
