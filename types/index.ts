export type Role = "admin" | "operator" | "citizen";

export type StationType = "police" | "medical" | "fire";

export interface User {
  id: string;
  phone: string;
  full_name: string;
  email: string;
  role: Role;
  profile_image: string | null;
  station?: Station | null;
}

export interface Station {
  id: string;
  name: string;
  type: StationType;
  phone: string;
  email: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  capacity: number;
  is_active: boolean;
}

export interface Operator {
  id: string;
  phone: string;
  full_name: string;
  email: string;
  role: Role;
  station: Station | null;
  is_active: boolean;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AdminDashboardData {
  total_stations: number;
  active_stations: number;
  total_operators: number;
  active_operators: number;
  total_citizens: number;
  stations_by_type: {
    police: number;
    medical: number;
    fire: number;
  };
}

export interface OperatorDashboardData {
  my_station: {
    id: string;
    name: string;
    type: StationType;
  };
  pending_incidents: number;
  total_incidents_today: number;
  recent_incidents: Incident[];
}

export interface Incident {
  id: string;
  type: string;
  location: string;
  status: string;
  time: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  id: string;
  phone: string;
  full_name: string;
  email: string;
  role: Role;
  access_token: string;
  refresh_token: string;
  station?: Station | null;
}

export interface OperatorsListResponse {
  total: number;
  data: Operator[];
}

export interface CreateOperatorResponse extends Operator {
  temporary_password: string;
}

export interface ResetPasswordResponse {
  temporary_password: string;
}
