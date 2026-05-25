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

export interface AdminDashboardTotals {
  stations_total: number;
  stations_active: number;
  stations_by_type: Partial<Record<StationType, number>>;
  operators_total: number;
  operators_active: number;
  response_units_total?: number;
  response_units_active?: number;
  citizens_total: number;
  citizens_verified?: number;
  citizens_unverified?: number;
}

export interface AdminDashboardKycSummary {
  approved: number;
  rejected: number;
  pending: number;
  not_submitted: number;
}

export interface AdminDashboardIncidentKpis {
  total: number;
  resolved: number;
  reached: number;
  active: number;
  false_alarm: number;
  unrouted: number;
  voice_failed: number;
  resolution_rate_pct: number;
  reached_rate_pct: number;
  avg_route_to_reach_seconds: number;
  avg_create_to_resolve_seconds: number;
}

export interface AdminDashboardIncidentWindow {
  total: number;
  resolved: number;
  reached: number;
  active: number;
  false_alarm: number;
  unrouted: number;
  voice_failed: number;
}

export interface AdminDashboardIncidents {
  kpis: AdminDashboardIncidentKpis;
  service_breakdown: Record<string, number>;
  category_breakdown: Record<string, number>;
  status_counts: Record<string, number>;
  windowed: {
    today: AdminDashboardIncidentWindow;
    last_7_days: AdminDashboardIncidentWindow;
    last_30_days: AdminDashboardIncidentWindow;
    last_365_days: AdminDashboardIncidentWindow;
    all_time: AdminDashboardIncidentWindow;
  };
}

export interface AdminDashboardDailyTrendPoint {
  date: string;
  total: number;
  resolved: number;
}

export interface AdminDashboardWeeklyTrendPoint {
  week_start: string;
  total: number;
  resolved: number;
}

export interface AdminDashboardMonthlyTrendPoint {
  month_start: string;
  total: number;
  resolved: number;
}

export interface AdminDashboardTrends {
  daily_last_7: AdminDashboardDailyTrendPoint[];
  daily_last_30: AdminDashboardDailyTrendPoint[];
  weekly_last_12: AdminDashboardWeeklyTrendPoint[];
  monthly_last_12: AdminDashboardMonthlyTrendPoint[];
}

export interface AdminDashboardTopStationResolver {
  id: string;
  name: string;
  type: string;
  city: string;
  non_response_count: number;
  reached_count: number;
  resolved_count: number;
  active_count: number;
  total_assigned: number;
}

export interface AdminDashboardTopStationNonResponse {
  id: string;
  name: string;
  type: string;
  city: string;
  non_response_count: number;
}

export interface AdminDashboardForwarding {
  total_forwards: number;
  by_kind: Record<string, number>;
  last_7d: number;
}

export interface AdminDashboardSatisfaction {
  average: number | null;
  rated_count: number;
}

export interface AdminDashboardData {
  generated_at?: string;
  totals: AdminDashboardTotals;
  kyc?: AdminDashboardKycSummary;
  incidents?: AdminDashboardIncidents;
  trends?: AdminDashboardTrends;
  top_stations?: {
    best_resolvers?: AdminDashboardTopStationResolver[];
    most_non_response?: AdminDashboardTopStationNonResponse[];
  };
  forwarding?: AdminDashboardForwarding;
  satisfaction?: AdminDashboardSatisfaction;
}

export interface OperatorDashboardStation {
  id: string;
  name: string;
  type: StationType;
  city?: string;
  is_active?: boolean;
  non_response_count?: number;
}

export interface OperatorDashboardForwarding {
  forwarded_in_count: number;
  forwarded_away_count: number;
  station_non_response_count: number;
}

export interface OperatorDashboardResponseUnits {
  total: number;
  active: number;
  on_assignment: number;
}

export interface OperatorDashboardRecentIncident {
  id: string;
  status: IncidentStatus;
  service_type?: string;
  category?: string;
  created_at: string;
  assigned_station_at?: string | null;
  address_line?: string;
  reporter_name?: string | null;
  assigned_unit_name?: string | null;
  forward_chain?: ForwardChainStep[];
}

export interface OperatorDashboardActiveQueue {
  active_total: number;
  recent: OperatorDashboardRecentIncident[];
}

export interface OperatorDashboardData {
  generated_at?: string;
  my_station: OperatorDashboardStation;
  kpis: AdminDashboardIncidentKpis;
  incidents: {
    windowed: {
      today: AdminDashboardIncidentWindow;
      last_7_days: AdminDashboardIncidentWindow;
      last_30_days: AdminDashboardIncidentWindow;
      last_365_days: AdminDashboardIncidentWindow;
      all_time: AdminDashboardIncidentWindow;
    };
    service_breakdown: Record<string, number>;
    category_breakdown: Record<string, number>;
    status_counts: Record<string, number>;
  };
  trends?: AdminDashboardTrends;
  forwarding?: OperatorDashboardForwarding;
  response_units?: OperatorDashboardResponseUnits;
  active_queue?: OperatorDashboardActiveQueue;
  satisfaction?: AdminDashboardSatisfaction;
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

export type ResponseUnitType = "individual" | "team";

export interface AssignedUnitBrief {
  id: string;
  name: string;
  unit_type: ResponseUnitType;
  is_active?: boolean;
  is_on_assignment?: boolean;
}

export interface ResponseUnit extends AssignedUnitBrief {
  station_id?: string;
  station_name?: string;
  notes?: string;
  login_user_id?: string;
  login_phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateResponseUnitPayload {
  name: string;
  unit_type: ResponseUnitType;
  phone: string;
  email: string;
  full_name?: string;
  password?: string;
  notes?: string;
}

export interface CreateResponseUnitResponse extends ResponseUnit {
  temporary_password?: string;
}

export interface UnitLocationPing {
  latitude: string | number;
  longitude: string | number;
  location_accuracy_m?: number | null;
  recorded_at?: string;
}

export interface UnitTrackingResponse {
  incident_id: string;
  assigned_unit: AssignedUnitBrief | null;
  latest_location: UnitLocationPing | null;
  pings: UnitLocationPing[];
}

export interface ForwardChainStep {
  order: number;
  station_id: string;
  station_name: string;
  station_type: string;
  kind?: string | null;
  target_service_type?: string | null;
  reason?: string | null;
  forwarded_at?: string | null;
  from_station_id?: string | null;
  from_station_name?: string | null;
  initiated_by_name?: string | null;
  is_current?: boolean;
}

export interface ForwardAwayInfo {
  kind?: string;
  to_station_name?: string;
  to_station_type?: string;
  forwarded_at?: string;
  current_assigned_station_name?: string;
  forward_chain?: ForwardChainStep[];
}

export type OperatorIncidentsScope = "active" | "forwarded_away" | "all";

export type OperatorPerspective = "active" | "forwarded_away";

export type OperatorDisplayStatus = "forwarded" | "auto_forwarded" | string;

export interface IncidentForwardErrorBody {
  error: string;
  code?: "no_further_stations" | "station_in_chain" | string;
  service_type?: string;
  forward_chain?: ForwardChainStep[];
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
  language?: string;
  confidence?: number | null;
  service_type?: string;
  voice_request_id?: string;
  voice_error?: string;
  // media
  audio_url?: string;
  // assignment
  assigned_station?: AssignedStation | null;
  assigned_unit?: AssignedUnitBrief | null;
  unit_assigned_at?: string | null;
  distance_to_station_km?: number | null;
  // timestamps
  created_at: string;
  updated_at?: string;
  // read state (operator list/detail)
  is_read?: boolean;
  is_new?: boolean;
  // forward chain & operator perspective
  forward_chain?: ForwardChainStep[];
  operator_perspective?: OperatorPerspective;
  operator_display_status?: OperatorDisplayStatus;
  operator_display_message?: string;
  forward_away_info?: ForwardAwayInfo;
}

export interface IncidentsListResponse {
  data: Incident[];
  unread_count?: number;
  active?: Incident[];
  forwarded_away?: Incident[];
}

export interface IncidentForwardMeta {
  id: string;
  kind: "manual_nearest" | "manual_station" | "auto_timeout" | string;
  to_station_id: string;
  to_station_name: string;
  to_station_type: string;
}

export interface IncidentForwardResponse extends Incident {
  forward?: IncidentForwardMeta;
}

export interface IncidentForwardingSettings {
  undispatched_forward_minutes: number;
  updated_at?: string;
}

export interface StationNonResponseStat extends Station {
  type_display?: string;
  non_response_count: number;
}

export interface StationNonResponseStatsResponse {
  undispatched_forward_minutes: number;
  total_non_responses: number;
  data: StationNonResponseStat[];
}

export interface IncidentForwardHistoryEntry {
  id: string;
  incident_id: string;
  kind: string;
  target_service_type?: string;
  reason?: string;
  from_station?: string;
  from_station_name?: string;
  to_station?: string;
  to_station_name?: string;
  initiated_by?: string | null;
  initiated_by_name?: string | null;
  created_at: string;
}

export interface IncidentForwardHistoryResponse {
  total: number;
  data: IncidentForwardHistoryEntry[];
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
