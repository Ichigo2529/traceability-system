import { ApiClient } from "../client";
import {
  User,
  Role,
  Permission,
  DeviceInfo,
  Machine,
  Model,
  Process,
  Station,
  WorkflowApprovalConfig,
  ComponentType,
  PartNumberMaster,
  ModelRevision,
  Variant,
  BomRow,
  RoutingStep,
  LabelTemplate,
  LabelBinding,
  ModelReadinessResult,
  ConfigAuditLog,
  Supplier,
  Department,
  SupplierPartProfile,
  SupplierPackParserInfo,
  BarcodeTemplate,
  InventoryDoRecord,
  SupplierPackRecord,
  MaterialRequest,
  MaterialRequestDetail,
  MaterialRequestItem,
} from "../types";

export class AdminService {
  constructor(private client: ApiClient) {}

  // Users
  async getUsers(): Promise<User[]> {
    return this.client.get<User[]>("/admin/users");
  }

  async createUser(user: Partial<User> & { password?: string }): Promise<User> {
    return this.client.post<User>("/admin/users", user);
  }

  async updateUser(id: string, user: Partial<User> & { password?: string }): Promise<User> {
    return this.client.put<User>(`/admin/users/${id}`, user);
  }

  async deleteUser(id: string): Promise<void> {
    return this.client.delete(`/admin/users/${id}`);
  }

  async getRoles(): Promise<Role[]> {
    return this.client.get<Role[]>("/admin/roles");
  }

  async createRole(data: { name: string; description?: string; permissions?: string[] }): Promise<Role> {
    return this.client.post<Role>("/admin/roles", data);
  }

  async updateRole(id: string, data: { name?: string; description?: string; permissions?: string[] }): Promise<Role> {
    return this.client.put<Role>(`/admin/roles/${id}`, data);
  }

  async deleteRole(id: string): Promise<void> {
    return this.client.delete(`/admin/roles/${id}`);
  }

  async getPermissions(): Promise<Permission[]> {
    return this.client.get<Permission[]>("/admin/permissions");
  }

  // Devices
  async getDevices(): Promise<DeviceInfo[]> {
    return this.client.get<DeviceInfo[]>("/admin/devices");
  }

  async createDevice(data: Partial<DeviceInfo> & { device_code?: string; activation_pin?: string }): Promise<DeviceInfo> {
    return this.client.post<DeviceInfo>("/admin/devices", data);
  }

  async updateDevice(id: string, data: Partial<DeviceInfo>): Promise<DeviceInfo> {
    return this.client.put<DeviceInfo>(`/admin/devices/${id}`, data);
  }

  async deleteDevice(id: string): Promise<void> {
    return this.client.delete(`/admin/devices/${id}`);
  }

  async setDeviceStatus(id: string, status: "active" | "disabled" | "maintenance"): Promise<{ id: string; status: string }> {
    return this.client.post(`/admin/devices/${id}/status`, { status });
  }

  async regenerateDeviceSecret(id: string): Promise<{ id: string; secret_key: string; secret_key_masked: string }> {
    return this.client.post(`/admin/devices/${id}/regenerate-secret`, {});
  }

  async assignDeviceMachine(deviceId: string, machineId: string) {
    return this.client.put(`/admin/devices/${deviceId}/assign-machine`, { machine_id: machineId });
  }

  // Machines
  async getMachines(): Promise<Machine[]> {
    return this.client.get<Machine[]>("/admin/machines");
  }

  async createMachine(machine: Omit<Machine, "id">): Promise<Machine> {
    return this.client.post<Machine>("/admin/machines", machine);
  }

  async updateMachine(id: string, machine: Partial<Machine>): Promise<Machine> {
    return this.client.put<Machine>(`/admin/machines/${id}`, machine);
  }

  async deleteMachine(id: string): Promise<void> {
    return this.client.delete(`/admin/machines/${id}`);
  }

  async getProcesses(): Promise<Process[]> {
    return this.client.get<Process[]>("/admin/processes");
  }

  async createProcess(data: Omit<Process, "id">): Promise<Process> {
    return this.client.post<Process>("/admin/processes", data);
  }

  async updateProcess(id: string, data: Partial<Process>): Promise<Process> {
    return this.client.put<Process>(`/admin/processes/${id}`, data);
  }

  async deleteProcess(id: string): Promise<void> {
    return this.client.delete(`/admin/processes/${id}`);
  }

  async getStations(): Promise<Station[]> {
    return this.client.get<Station[]>("/admin/stations");
  }

  async createStation(data: Omit<Station, "id">): Promise<Station> {
    return this.client.post<Station>("/admin/stations", data);
  }

  async updateStation(id: string, data: Partial<Station>): Promise<Station> {
    return this.client.put<Station>(`/admin/stations/${id}`, data);
  }

  async deleteStation(id: string): Promise<void> {
    return this.client.delete(`/admin/stations/${id}`);
  }

  async getWorkflowApprovals(): Promise<WorkflowApprovalConfig[]> {
    return this.client.get<WorkflowApprovalConfig[]>("/admin/workflow-approvals");
  }

  async createWorkflowApproval(data: Omit<WorkflowApprovalConfig, "id">): Promise<WorkflowApprovalConfig> {
    return this.client.post<WorkflowApprovalConfig>("/admin/workflow-approvals", data);
  }

  async updateWorkflowApproval(id: string, data: Partial<WorkflowApprovalConfig>): Promise<WorkflowApprovalConfig> {
    return this.client.put<WorkflowApprovalConfig>(`/admin/workflow-approvals/${id}`, data);
  }

  async deleteWorkflowApproval(id: string): Promise<void> {
    return this.client.delete(`/admin/workflow-approvals/${id}`);
  }

  async getHeartbeatSettings(): Promise<{ online_window_minutes: number }> {
    return this.client.get<{ online_window_minutes: number }>("/admin/settings/heartbeat");
  }

  async updateHeartbeatSettings(onlineWindowMinutes: number): Promise<{ online_window_minutes: number }> {
    return this.client.put<{ online_window_minutes: number }>("/admin/settings/heartbeat", {
      online_window_minutes: onlineWindowMinutes,
    });
  }

  // Component types / part numbers
  async getComponentTypes(): Promise<ComponentType[]> {
    return this.client.get<ComponentType[]>("/admin/component-types");
  }

  async createComponentType(data: { code: string; name: string; description?: string; is_active?: boolean }): Promise<ComponentType> {
    return this.client.post<ComponentType>("/admin/component-types", data);
  }

  async updateComponentType(id: string, data: Partial<{ code: string; name: string; description: string; is_active: boolean }>): Promise<ComponentType> {
    return this.client.put<ComponentType>(`/admin/component-types/${id}`, data);
  }

  async deleteComponentType(id: string): Promise<void> {
    return this.client.delete(`/admin/component-types/${id}`);
  }

  async getPartNumbers(): Promise<PartNumberMaster[]> {
    return this.client.get<PartNumberMaster[]>("/admin/part-numbers");
  }

  async createPartNumber(data: {
    part_number: string;
    component_type_id?: string;
    description?: string;
    default_pack_size?: number;
    rm_location?: string;
    is_active?: boolean;
  }): Promise<PartNumberMaster> {
    return this.client.post<PartNumberMaster>("/admin/part-numbers", data);
  }

  async updatePartNumber(
    id: string,
    data: Partial<{
      part_number: string;
      component_type_id: string;
      description: string;
      default_pack_size: number;
      rm_location: string;
      is_active: boolean;
    }>
  ): Promise<PartNumberMaster> {
    return this.client.put<PartNumberMaster>(`/admin/part-numbers/${id}`, data);
  }

  async deletePartNumber(id: string): Promise<void> {
    return this.client.delete(`/admin/part-numbers/${id}`);
  }

  // Models
  async getModels(): Promise<Model[]> {
    return this.client.get<Model[]>("/admin/models");
  }

  async createModel(data: Pick<Model, "name" | "code"> & Partial<Pick<Model, "description" | "pack_size" | "active" | "part_number">>): Promise<Model> {
    return this.client.post<Model>("/admin/models", data);
  }

  async updateModel(id: string, data: Partial<Model>): Promise<Model> {
    return this.client.put<Model>(`/admin/models/${id}`, data);
  }

  async deleteModel(id: string): Promise<void> {
    return this.client.delete(`/admin/models/${id}`);
  }

  // Revisions
  async getRevisions(modelId: string): Promise<ModelRevision[]> {
    return this.client.get<ModelRevision[]>(`/admin/models/${modelId}/revisions`);
  }

  async createRevision(
    modelId: string,
    data: {
      revision_code: string;
      description?: string;
      base_part_number?: string;
      clone_from_revision_id?: string;
    }
  ): Promise<ModelRevision> {
    return this.client.post<ModelRevision>(`/admin/models/${modelId}/revisions`, data);
  }

  async getRevision(modelId: string, revisionId: string): Promise<ModelRevision> {
    return this.client.get<ModelRevision>(`/admin/models/${modelId}/revisions/${revisionId}`);
  }

  async updateRevision(modelId: string, revisionId: string, data: Partial<ModelRevision>): Promise<ModelRevision> {
    return this.client.put<ModelRevision>(`/admin/models/${modelId}/revisions/${revisionId}`, data);
  }

  async activateRevision(modelId: string, revisionId: string): Promise<{ id: string; status: string }> {
    return this.client.post(`/admin/models/${modelId}/revisions/${revisionId}/activate`, {});
  }

  // Variants
  async getVariants(modelId: string, revisionId: string): Promise<Variant[]> {
    return this.client.get<Variant[]>(`/admin/models/${modelId}/revisions/${revisionId}/variants`);
  }

  async createVariant(modelId: string, revisionId: string, data: Partial<Variant>): Promise<Variant> {
    return this.client.post<Variant>(`/admin/models/${modelId}/revisions/${revisionId}/variants`, data);
  }

  async updateVariant(modelId: string, revisionId: string, variantId: string, data: Partial<Variant>): Promise<Variant> {
    return this.client.put<Variant>(`/admin/models/${modelId}/revisions/${revisionId}/variants/${variantId}`, data);
  }

  async deleteVariant(modelId: string, revisionId: string, variantId: string): Promise<void> {
    return this.client.delete(`/admin/models/${modelId}/revisions/${revisionId}/variants/${variantId}`);
  }

  async setDefaultVariant(modelId: string, revisionId: string, variantId: string): Promise<{ variant_id: string; is_default: boolean }> {
    return this.client.post(`/admin/models/${modelId}/revisions/${revisionId}/variants/${variantId}/set-default`, {});
  }

  // BOM
  async getBom(modelId: string, revisionId: string): Promise<BomRow[]> {
    return this.client.get<BomRow[]>(`/admin/models/${modelId}/revisions/${revisionId}/bom`);
  }

  async createBomRow(modelId: string, revisionId: string, data: Partial<BomRow>): Promise<BomRow> {
    return this.client.post<BomRow>(`/admin/models/${modelId}/revisions/${revisionId}/bom`, data);
  }

  async updateBomRow(modelId: string, revisionId: string, bomId: string, data: Partial<BomRow>): Promise<BomRow> {
    return this.client.put<BomRow>(`/admin/models/${modelId}/revisions/${revisionId}/bom/${bomId}`, data);
  }

  async deleteBomRow(modelId: string, revisionId: string, bomId: string): Promise<void> {
    return this.client.delete(`/admin/models/${modelId}/revisions/${revisionId}/bom/${bomId}`);
  }

  // Routing
  async getRouting(modelId: string, revisionId: string): Promise<RoutingStep[]> {
    return this.client.get<RoutingStep[]>(`/admin/models/${modelId}/revisions/${revisionId}/routing`);
  }

  async createRoutingStep(modelId: string, revisionId: string, data: Partial<RoutingStep>): Promise<RoutingStep> {
    return this.client.post<RoutingStep>(`/admin/models/${modelId}/revisions/${revisionId}/routing`, data);
  }

  async updateRoutingStep(modelId: string, revisionId: string, stepId: string, data: Partial<RoutingStep>): Promise<RoutingStep> {
    return this.client.put<RoutingStep>(`/admin/models/${modelId}/revisions/${revisionId}/routing/${stepId}`, data);
  }

  async deleteRoutingStep(modelId: string, revisionId: string, stepId: string): Promise<void> {
    return this.client.delete(`/admin/models/${modelId}/revisions/${revisionId}/routing/${stepId}`);
  }

  // Readiness Validator
  async validateModel(modelId: string): Promise<ModelReadinessResult> {
    return this.client.get<ModelReadinessResult>(`/admin/validate-model/${modelId}`);
  }

  // Label templates
  async getLabelTemplates(): Promise<LabelTemplate[]> {
    return this.client.get<LabelTemplate[]>("/admin/templates");
  }

  async createLabelTemplate(data: Partial<LabelTemplate>): Promise<LabelTemplate> {
    return this.client.post<LabelTemplate>("/admin/templates", data);
  }

  async updateLabelTemplate(id: string, data: Partial<LabelTemplate>): Promise<LabelTemplate> {
    return this.client.put<LabelTemplate>(`/admin/templates/${id}`, data);
  }

  async deleteLabelTemplate(id: string): Promise<void> {
    return this.client.delete(`/admin/templates/${id}`);
  }

  // Label bindings
  async getLabelBindings(revisionId?: string): Promise<LabelBinding[]> {
    const suffix = revisionId ? `?revision_id=${encodeURIComponent(revisionId)}` : "";
    return this.client.get<LabelBinding[]>(`/admin/bindings${suffix}`);
  }

  async createLabelBinding(data: Partial<LabelBinding>): Promise<LabelBinding> {
    return this.client.post<LabelBinding>("/admin/bindings", data);
  }

  async updateLabelBinding(id: string, data: Partial<LabelBinding>): Promise<LabelBinding> {
    return this.client.put<LabelBinding>(`/admin/bindings/${id}`, data);
  }

  async deleteLabelBinding(id: string): Promise<void> {
    return this.client.delete(`/admin/bindings/${id}`);
  }

  // Audit logs
  async getAuditLogs(filters?: { entity_type?: string; user_id?: string; date_from?: string; date_to?: string }): Promise<ConfigAuditLog[]> {
    const params = new URLSearchParams();
    if (filters?.entity_type) params.set("entity_type", filters.entity_type);
    if (filters?.user_id) params.set("user_id", filters.user_id);
    if (filters?.date_from) params.set("date_from", filters.date_from);
    if (filters?.date_to) params.set("date_to", filters.date_to);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return this.client.get<ConfigAuditLog[]>(`/admin/audit-logs${suffix}`);
  }

  // Suppliers / receiving packs
  async getSuppliers(): Promise<Supplier[]> {
    return this.client.get<Supplier[]>("/admin/suppliers");
  }

  async getVendors(): Promise<Supplier[]> {
    return this.getSuppliers();
  }

  async createSupplier(data: { name: string; code: string; vendor_id?: string; is_active?: boolean }): Promise<Supplier> {
    return this.client.post<Supplier>("/admin/suppliers", data);
  }

  async createVendor(data: { name: string; code: string; vendor_id?: string; is_active?: boolean }): Promise<Supplier> {
    return this.createSupplier(data);
  }

  async updateSupplier(
    id: string,
    data: Partial<{ name: string; code: string; vendor_id: string; is_active: boolean }>
  ): Promise<Supplier> {
    return this.client.put<Supplier>(`/admin/suppliers/${id}`, data);
  }

  async updateVendor(
    id: string,
    data: Partial<{ name: string; code: string; vendor_id: string; is_active: boolean }>
  ): Promise<Supplier> {
    return this.updateSupplier(id, data);
  }

  async deleteSupplier(id: string): Promise<void> {
    return this.client.delete(`/admin/suppliers/${id}`);
  }

  async deleteVendor(id: string): Promise<void> {
    return this.deleteSupplier(id);
  }

  async getDepartments(): Promise<Department[]> {
    return this.client.get<Department[]>("/admin/departments");
  }

  async createDepartment(data: { code: string; name: string; sort_order?: number; is_active?: boolean }): Promise<Department> {
    return this.client.post<Department>("/admin/departments", data);
  }

  async updateDepartment(
    id: string,
    data: Partial<{ code: string; name: string; sort_order: number; is_active: boolean }>
  ): Promise<Department> {
    return this.client.put<Department>(`/admin/departments/${id}`, data);
  }

  async deleteDepartment(id: string): Promise<void> {
    return this.client.delete(`/admin/departments/${id}`);
  }

  async getSupplierPartProfiles(): Promise<SupplierPartProfile[]> {
    return this.client.get<SupplierPartProfile[]>("/admin/supplier-part-profiles");
  }

  async getVendorPartProfiles(): Promise<SupplierPartProfile[]> {
    return this.getSupplierPartProfiles();
  }

  async createSupplierPartProfile(data: {
    supplier_id: string;
    vendor_id?: string;
    part_number: string;
    supplier_part_number?: string;
    vendor_part_number?: string;
    parser_key?: string;
    default_pack_qty?: number;
    is_active?: boolean;
  }): Promise<SupplierPartProfile> {
    const payload = {
      ...data,
      supplier_id: data.supplier_id ?? data.vendor_id,
      supplier_part_number: data.supplier_part_number ?? data.vendor_part_number,
    };
    return this.client.post<SupplierPartProfile>("/admin/supplier-part-profiles", payload);
  }

  async createVendorPartProfile(data: {
    vendor_id: string;
    part_number: string;
    vendor_part_number?: string;
    parser_key?: string;
    default_pack_qty?: number;
    is_active?: boolean;
  }): Promise<SupplierPartProfile> {
    return this.createSupplierPartProfile({
      ...data,
      supplier_id: data.vendor_id,
      supplier_part_number: data.vendor_part_number,
    });
  }

  async updateSupplierPartProfile(
    id: string,
    data: Partial<{
      supplier_id: string;
      vendor_id: string;
      part_number: string;
      supplier_part_number: string;
      vendor_part_number: string;
      parser_key: string;
      default_pack_qty: number;
      is_active: boolean;
    }>
  ): Promise<SupplierPartProfile> {
    const payload = {
      ...data,
      supplier_id: data.supplier_id ?? data.vendor_id,
      supplier_part_number: data.supplier_part_number ?? data.vendor_part_number,
    };
    return this.client.put<SupplierPartProfile>(`/admin/supplier-part-profiles/${id}`, payload);
  }

  async updateVendorPartProfile(
    id: string,
    data: Partial<{
      vendor_id: string;
      part_number: string;
      vendor_part_number: string;
      parser_key: string;
      default_pack_qty: number;
      is_active: boolean;
    }>
  ): Promise<SupplierPartProfile> {
    return this.updateSupplierPartProfile(id, {
      ...data,
      supplier_id: data.vendor_id,
      supplier_part_number: data.vendor_part_number,
    });
  }

  async deleteSupplierPartProfile(id: string): Promise<void> {
    return this.client.delete(`/admin/supplier-part-profiles/${id}`);
  }

  async deleteVendorPartProfile(id: string): Promise<void> {
    return this.deleteSupplierPartProfile(id);
  }

  async getSupplierPackParsers(): Promise<SupplierPackParserInfo[]> {
    return this.client.get<SupplierPackParserInfo[]>("/admin/supplier-pack-parsers");
  }

  async getVendorPackParsers(): Promise<SupplierPackParserInfo[]> {
    return this.getSupplierPackParsers();
  }

  // Barcode template master
  async getBarcodeTemplates(): Promise<BarcodeTemplate[]> {
    return this.client.get<BarcodeTemplate[]>("/admin/barcode-templates");
  }

  async createBarcodeTemplate(data: {
    key: string;
    name: string;
    identifiers: string[];
    lot_identifiers?: string[];
    quantity_identifiers?: string[];
    part_identifiers?: string[];
    vendor_identifiers?: string[];
    production_date_identifiers?: string[];
    is_active?: boolean;
    effective_from?: string;
    effective_to?: string;
    notes?: string;
  }): Promise<BarcodeTemplate> {
    return this.client.post<BarcodeTemplate>("/admin/barcode-templates", data);
  }

  async updateBarcodeTemplate(
    id: string,
    data: Partial<{
      key: string;
      name: string;
      identifiers: string[];
      lot_identifiers: string[];
      quantity_identifiers: string[];
      part_identifiers: string[];
      vendor_identifiers: string[];
      production_date_identifiers: string[];
      is_active: boolean;
      effective_from: string;
      effective_to: string;
      notes: string;
    }>
  ): Promise<BarcodeTemplate> {
    return this.client.put<BarcodeTemplate>(`/admin/barcode-templates/${id}`, data);
  }

  async deleteBarcodeTemplate(id: string): Promise<void> {
    return this.client.delete(`/admin/barcode-templates/${id}`);
  }

  async testBarcodeTemplateParse(data: {
    pack_barcode_raw: string;
    parser_key?: string;
    template_id?: string;
  }): Promise<{
    parser_key: string;
    parser_source: string;
    parsed: Record<string, unknown>;
  }> {
    return this.client.post("/admin/barcode-templates/test-parse", data);
  }

  async getInventoryDoRecords(): Promise<InventoryDoRecord[]> {
    return this.client.get<InventoryDoRecord[]>("/admin/inventory-do");
  }

  async createInventoryDoRecord(data: Partial<InventoryDoRecord> & { do_number: string }): Promise<InventoryDoRecord> {
    return this.client.post<InventoryDoRecord>("/admin/inventory-do", data);
  }

  async getSupplierPacks(): Promise<SupplierPackRecord[]> {
    return this.client.get<SupplierPackRecord[]>("/admin/supplier-packs");
  }

  async getVendorPacks(): Promise<SupplierPackRecord[]> {
    return this.getSupplierPacks();
  }

  async receiveSupplierPack(data: {
    supplier_id: string;
    vendor_id?: string;
    do_id?: string;
    do_number?: string;
    supplier_name?: string;
    vendor_name?: string;
    parser_key?: string;
    part_number?: string;
    supplier_lot?: string;
    vendor_lot?: string;
    supplier_part_number?: string;
    vendor_part_number?: string;
    material_code?: string;
    pack_barcode_raw: string;
    pack_qty_total?: number;
    production_date?: string;
    received_date?: string;
  }): Promise<SupplierPackRecord> {
    const payload = {
      ...data,
      supplier_id: data.supplier_id ?? data.vendor_id,
      supplier_name: data.supplier_name ?? data.vendor_name,
      supplier_lot: data.supplier_lot ?? data.vendor_lot,
      supplier_part_number: data.supplier_part_number ?? data.vendor_part_number,
    };
    return this.client.post<SupplierPackRecord>("/admin/supplier-packs/receive", payload);
  }

  async receiveVendorPack(data: {
    vendor_id: string;
    do_id?: string;
    do_number?: string;
    vendor_name?: string;
    parser_key?: string;
    part_number?: string;
    vendor_lot?: string;
    vendor_part_number?: string;
    material_code?: string;
    pack_barcode_raw: string;
    pack_qty_total?: number;
    production_date?: string;
    received_date?: string;
  }): Promise<SupplierPackRecord> {
    return this.receiveSupplierPack({
      ...data,
      supplier_id: data.vendor_id,
      supplier_name: data.vendor_name,
      supplier_lot: data.vendor_lot,
      supplier_part_number: data.vendor_part_number,
    });
  }

  // Material requests (Production -> Store)
  async getMaterialRequests(filters?: { status?: string; date_from?: string; date_to?: string }): Promise<MaterialRequest[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.date_from) params.set("date_from", filters.date_from);
    if (filters?.date_to) params.set("date_to", filters.date_to);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return this.client.get<MaterialRequest[]>(`/admin/material-requests${suffix}`);
  }

  async getMaterialRequestById(id: string): Promise<MaterialRequestDetail> {
    return this.client.get<MaterialRequestDetail>(`/admin/material-requests/${id}`);
  }

  async createMaterialRequest(data: {
    request_no?: string;
    dmi_no?: string;
    request_date?: string;
    model_id: string;
    section?: string;
    cost_center?: string;
    process_name?: string;
    received_by_user_id?: string;
    remarks?: string;
    items: MaterialRequestItem[];
  }): Promise<MaterialRequest> {
    return this.client.post<MaterialRequest>("/admin/material-requests", data);
  }

  async approveMaterialRequest(id: string): Promise<{ id: string; status: string }> {
    return this.client.post(`/admin/material-requests/${id}/approve`, {});
  }

  async rejectMaterialRequest(id: string, reason?: string): Promise<{ id: string; status: string }> {
    return this.client.post(`/admin/material-requests/${id}/reject`, { reason });
  }

  async issueMaterialRequest(id: string, payload?: { dmi_no?: string; remarks?: string }): Promise<{ id: string; status: string }> {
    return this.client.post(`/admin/material-requests/${id}/issue`, payload ?? {});
  }
}
