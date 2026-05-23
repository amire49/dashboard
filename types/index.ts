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
  lat?: number | string;
  long?: number | string;
  latitude?: number | string;
  longitude?: number | string;
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

export type IncidentType = "fire" | "medical" | "crime" | "police" | string;
export type IncidentStatus =
  | "pending"
  | "routed"
  | "dispatched"
  | "en_route"
  | "reached"
  | "served"
  | "resolved"
  | "false_alarm"
  | string;

export interface AssignedStation {
  id: string;
  name: string;
  type: string;
  type_display: string;
  phone: string;
  latitude: string;
  longitude: string;
  address: string;
  city: string;
}

export interface Incident {
  id: string;
  category: IncidentType;
  status: IncidentStatus;
  // reporter is a nested object
  reporter?: {
    id: string;
    full_name: string;
    phone: string;
  } | null;
  // location
  latitude?: string | number | null;
  longitude?: string | number | null;
  location_accuracy_m?: number | null;
  altitude_m?: number | null;
  address_line?: string;
  notes?: string;
  // AI output
  amharic_text?: string;
  english_text?: string;
  confidence?: number | null;
  service_type?: string;
  voice_request_id?: string;
  voice_error?: string;
  // media
  audio_url?: string;
  // assignment
  assigned_station?: AssignedStation | null;
  distance_to_station_km?: number | null;
  // timestamps
  created_at: string;
  updated_at?: string;
  // read state (operator list/detail)
  is_read?: boolean;
  is_new?: boolean;
}

export interface IncidentsListResponse {
  data: Incident[];
  unread_count?: number;
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

export type KycStatus = "pending" | "approved" | "rejected" | "not_submitted";

export interface KycDocument {
  id: string;
  id_type: "national_id" | "passport" | "drivers_license" | string;
  id_number: string;
  image_front: string;
  image_back: string;
  image_selfie: string;
  submitted_at: string;
  reviewed_at?: string | null;
  status: KycStatus;
  rejection_reason?: string | null;
}

export interface Citizen {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  role: Role;
  is_verified: boolean;
  kyc_status: KycStatus;
  kyc_processed_at: string | null;
  is_active: boolean;
  created_at: string;
  // Computed field for backward compatibility
  joined_at?: string;
  kyc?: KycDocument | null;
}
