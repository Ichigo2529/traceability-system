export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  error_code?: string;
  message?: string;
}

// Auth
export interface User {
  id: string;
  username: string;
  display_name: string;
  roles: string[];
  employee_code?: string;
  email?: string;
  department?: string;
  auth_source?: "LOCAL" | "LDAP";
  is_active?: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  user: User;
}

// Device
export interface DeviceInfo {
  device_id?: string;
  device_token?: string;
  device_code?: string;
  name?: string;
  device_type?: "pi" | "pc" | "tablet" | "kiosk";
  ip_address?: string | null;
  station_id?: string | null;
  process_id?: string | null;
  status?: "active" | "disabled" | "maintenance";
  last_heartbeat_at?: string | null;
  secret_key?: string | null;
  secret_key_masked?: string | null;
  activation_pin?: string | null;
  is_new?: boolean;
  machine?: Machine | null;
  station?: Station | null;
  process?: Process | null;
  assigned_station?: { id: string; name: string | null } | null;
  assigned_process?: { id: string; name: string | null } | null;
  server_time?: string;
  shift_day?: string;
  operator_session?: {
    session_id: string;
    user_id: string;
  } | null;

  id?: string;
  fingerprint?: string;
  hostname?: string | null;
  machine_id?: string | null;
  assigned_machine?: { id: string; name: string | null } | null;
  is_active?: boolean;
  last_seen?: string | null;
  created_at?: string;
}

export interface DeviceRegisterRequest {
  fingerprint: string;
  hostname?: string;
}

export interface DeviceActivationRequest {
  device_code: string;
  activation_pin: string;
  hostname?: string;
  fingerprint?: string;
}

export interface OperatorSession {
  session_id: string;
  user: User;
}

// Machines
export interface Machine {
  id: string;
  name: string;
  station_type: string;
  line_code: string | null;
  supported_variants: string[];
  is_active?: boolean;
}

// Events
export interface TraceEvent {
  event_id: string;
  event_type: string;
  unit_id?: string;
  machine_id?: string;
  payload?: any;
  created_at_device: string;
  target_state?: string;
}

export interface EventSubmissionResponse {
  event_id: string;
  accepted: boolean;
  duplicate: boolean;
  shift_day: string;
  received_at: string;
  [key: string]: any;
}

export interface LabelGenerationResponse {
  assy_id: string;
  labels: Array<{
    tray_id: string;
    serial: number;
    payload: string;
  }>;
}

// Trace
export interface Unit {
  id: string;
  unitType: string;
  status: string;
  lineCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenealogyNode {
  depth: number;
  link_type: string;
  direction: "UPSTREAM" | "DOWNSTREAM";
  related_id: string;
  related_type: string;
  related_status: string;
}

export interface TraceResult {
  unit: Unit;
  genealogy: {
    upstream: GenealogyNode[];
    downstream: GenealogyNode[];
  };
  events: any[];
}

// Admin
export interface Role {
  id: string;
  name: string;
  description?: string | null;
  permissions: string[];
}

export interface Model {
  id: string;
  name: string;
  code: string;
  part_number?: string | null;
  pack_size?: number;
  active?: boolean;
  description?: string | null;
  active_revision_id?: string | null;
  active_revision_code?: string | null;
  updated_at?: string;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  module?: string | null;
  description?: string | null;
}

export interface Process {
  id: string;
  process_code: string;
  name: string;
  sequence_order: number;
  active: boolean;
}

export interface Station {
  id: string;
  station_code: string;
  name: string;
  line?: string | null;
  area?: string | null;
  process_id?: string | null;
  process_name?: string | null;
  active: boolean;
}

export interface WorkflowApprovalConfig {
  id: string;
  flow_code: string;
  flow_name: string;
  from_status: string;
  to_status: string;
  level: number;
  approver_role_id?: string | null;
  approver_role_name?: string | null;
  approver_users?: Array<{
    user_id: string;
    display_name?: string | null;
    email?: string | null;
    is_default?: boolean;
  }>;
  default_approver_user_id?: string | null;
  default_approver_email?: string | null;
  active: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface ComponentType {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MasterRoutingStep {
  id: string;
  step_code: string;
  description?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PartNumberMaster {
  id: string;
  part_number: string;
  component_type_id?: string | null;
  component_type_code?: string | null;
  component_type_name?: string | null;
  description?: string | null;
  default_pack_size?: number | null;
  rm_location?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  code: string;
  vendor_id?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type Vendor = Supplier;

export interface Department {
  id: string;
  code: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SupplierPartProfile {
  id: string;
  supplier_id: string;
  vendor_id?: string;
  supplier_code?: string | null;
  vendor_code?: string | null;
  supplier_name?: string | null;
  vendor_name?: string | null;
  part_number: string;
  supplier_part_number: string;
  vendor_part_number?: string;
  parser_key: string;
  default_pack_qty?: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SupplierPackParserInfo {
  key: string;
}

export interface BarcodeTemplate {
  id: string;
  key: string;
  name: string;
  format: "ASTERISK_DFI";
  identifiers: string[];
  lot_identifiers: string[];
  quantity_identifiers: string[];
  part_identifiers: string[];
  vendor_identifiers: string[];
  production_date_identifiers: string[];
  is_active: boolean;
  version: number;
  effective_from?: string | null;
  effective_to?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryDoRecord {
  id: string;
  supplier_id?: string | null;
  vendor_id?: string | null;
  supplier_code?: string | null;
  vendor_code?: string | null;
  supplier_name?: string | null;
  vendor_name?: string | null;
  do_number: string;
  supplier?: string | null;
  part_number?: string | null;
  description?: string | null;
  lot_number?: string | null;
  gr_number?: string | null;
  material_code?: string | null;
  total_qty?: number | null;
  qty_received: number;
  qty_issued: number;
  reject_qty?: number | null;
  received_date?: string | null;
  received_at?: string | null;
}

export interface SupplierPackRecord {
  id: string;
  unit_id: string;
  part_number: string;
  supplier_id: string;
  vendor_id?: string;
  supplier_code?: string | null;
  vendor_code?: string | null;
  supplier_name?: string | null;
  vendor_name?: string | null;
  do_id?: string | null;
  do_number?: string | null;
  supplier_lot?: string | null;
  vendor_lot?: string | null;
  pack_barcode_raw: string;
  pack_qty_total: number;
  pack_qty_remaining: number;
  production_date?: string | null;
  parsed_data?: Record<string, unknown> | null;
  received_at?: string | null;
}

export type MaterialRequestStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "ISSUED" | "CANCELLED";

export interface MaterialRequestItem {
  id?: string;
  item_no: number;
  part_number: string;
  description?: string | null;
  requested_qty?: number | null;
  issued_qty?: number | null;
  uom?: string | null;
  do_number?: string | null;
  lot_number?: string | null;
  remarks?: string | null;
  issue_allocations?: MaterialRequestIssueAllocation[];
}

export interface MaterialRequestIssueAllocation {
  id: string;
  material_request_item_id?: string;
  do_number: string;
  issued_packs: number;
  issued_qty: number;
  supplier_pack_size: number;
  vendor_pack_size?: number;
  supplier_id?: string | null;
  vendor_id?: string | null;
  supplier_name?: string | null;
  vendor_name?: string | null;
  remarks?: string | null;
}

export interface MaterialRequest {
  id: string;
  request_no: string;
  dmi_no?: string | null;
  request_date: string;
  model_id?: string | null;
  model_code?: string | null;
  model_name?: string | null;
  section?: string | null;
  cost_center?: string | null;
  process_name?: string | null;
  status: MaterialRequestStatus;
  remarks?: string | null;
  request_department_name?: string | null;
  requested_by_user_id?: string | null;
  requested_by_name?: string | null;
  approved_by_user_id?: string | null;
  issued_by_user_id?: string | null;
  issued_by_name?: string | null;
  issued_at?: string | null;
  received_by_user_id?: string | null;
  received_by_name?: string | null;
  received_at?: string | null;
  item_count?: number;
  created_at?: string;
  updated_at?: string;
  alert_status?: "QUEUED_MOCK" | "SENT" | "FAILED";
  alert_recipients?: Array<{
    user_id: string;
    display_name?: string | null;
    email?: string | null;
    source?: "WORKFLOW_USER" | "WORKFLOW_ROLE";
  }>;
}

export interface MetaCostCenter {
  cost_center_id: string;
  cost_code: string;
  short_text?: string | null;
  group_code?: string | null;
  is_default: boolean;
}

export interface MaterialRequestMeta {
  section: {
    id: string;
    section_code: string;
    section_name: string;
  } | null;
  department?: {
    name: string;
  } | null;
  allowed_cost_centers: MetaCostCenter[];
  default_cost_center_id: string | null;
  strict_mode?: boolean;
}

export interface MaterialRequestDetail extends MaterialRequest {
  items: MaterialRequestItem[];
}

export interface MaterialRequestCatalogItem {
  model_id: string;
  model_code: string;
  model_name: string;
  model_part_number?: string | null;
  revision_id?: string;
  revision_code?: string;
  part_number: string;
  component_name?: string | null;
  rm_location?: string | null;
  qty_per_assy?: number | null;
  pack_size?: number | null;
  active: boolean;
  uom_default: string;
}

export interface MaterialRequestNextNumbers {
  request_no: string;
  dmi_no: string;
  request_date: string;
  generated_at: string;
}

export interface MaterialRequestIssueOption {
  do_id?: string | null;
  do_number: string;
  gr_number?: string | null;
  supplier_id?: string | null;
  vendor_id?: string | null;
  supplier_name?: string | null;
  vendor_name?: string | null;
  pack_size: number;
  available_qty: number;
  available_packs: number;
}

export interface MaterialRequestSupplierOption {
  supplier_id: string;
  vendor_id?: string;
  supplier_name?: string | null;
  vendor_name?: string | null;
  supplier_part_number?: string | null;
  vendor_part_number?: string | null;
  default_pack_qty?: number | null;
}

export type MaterialRequestVendorOption = MaterialRequestSupplierOption;

export interface MaterialRequestIssueItemOption {
  item_id: string;
  item_no: number;
  part_number: string;
  requested_qty: number;
  already_issued_qty: number;
  issue_options: MaterialRequestIssueOption[];
  supplier_options: MaterialRequestSupplierOption[];
  vendor_options?: MaterialRequestVendorOption[];
}

export interface MaterialRequestIssueOptionsResponse {
  request_id: string;
  status: MaterialRequestStatus;
  items: MaterialRequestIssueItemOption[];
}

export enum RevisionStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export interface Variant {
  id: string;
  revision_id: string;
  code: string;
  description?: string | null;
  mapped_codes?: Record<string, string> | null;
  is_default?: boolean;
  created_at?: string;
}

export interface BomRow {
  id: string;
  revision_id: string;
  component_name?: string | null;
  component_unit_type: string;
  component_part_number?: string | null;
  rm_location?: string | null;
  supplier_name?: string | null;
  supplier_part_number?: string | null;
  supplier_pack_size?: number | null;
  pack_2d_format?: string | null;
  qty_per_assy: number;
  required: boolean;
  variant_id?: string | null;
  variant_rule?: string | null;
  unit_type?: string;
  created_at?: string;
}

export interface RoutingStep {
  id: string;
  routing_id?: string;
  step_code: string;
  sequence: number;
  mandatory: boolean;
  variant_id?: string | null;
  variant_rule?: string | null;
  description?: string | null;
  component_type?: string | null;
}

export interface LabelTemplate {
  id: string;
  name: string;
  revision_id?: string | null;
  template_body: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LabelBinding {
  id: string;
  model_revision_id: string;
  variant_id?: string | null;
  unit_type: string;
  process_point: string;
  label_template_id: string;
  created_at?: string;
}

export interface ModelRevision {
  id: string;
  model_id: string;
  revision_code: string;
  status: RevisionStatus;
  description?: string | null;
  base_part_number?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ModelReadinessIssue {
  code: string;
  message: string;
  scope?: string;
  path?: string;
}

export interface ModelReadinessResult {
  status: "PASS" | "FAIL";
  issues: ModelReadinessIssue[];
  revision_id?: string;
  revision_code?: string;
}

export interface ConfigAuditLog {
  id: string;
  user_id?: string | null;
  username?: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  before_data?: Record<string, unknown> | null;
  after_data?: Record<string, unknown> | null;
  created_at: string;
}
