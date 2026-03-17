import { createSdk, getApiBaseUrl } from "@traceability/sdk";
import { eden } from "./eden";
import { callEdenWithFallback, callEdenWithFallbackVoid } from "./eden-fallback";

export const sdk = createSdk(getApiBaseUrl(import.meta.env.VITE_API_BASE_URL));

function readAccessToken() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("auth_tokens");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { access_token?: string };
    return parsed.access_token ?? null;
  } catch {
    return null;
  }
}

export function authHeaders() {
  const token = readAccessToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}

async function preferEden<T>(call: () => Promise<any>, fallback: () => Promise<T>, scope = "admin"): Promise<T> {
  return callEdenWithFallback<T>(scope, call, fallback);
}

async function preferEdenVoid(call: () => Promise<any>, fallback: () => Promise<void>, scope = "admin"): Promise<void> {
  return callEdenWithFallbackVoid(scope, call, fallback);
}

function installAdminEdenFallback() {
  const admin = sdk.admin as any;

  const orig = {
    getUsers: admin.getUsers.bind(admin),
    createUser: admin.createUser.bind(admin),
    updateUser: admin.updateUser.bind(admin),
    deleteUser: admin.deleteUser.bind(admin),
    getRoles: admin.getRoles.bind(admin),
    getPermissions: admin.getPermissions.bind(admin),
    createRole: admin.createRole.bind(admin),
    updateRole: admin.updateRole.bind(admin),
    deleteRole: admin.deleteRole.bind(admin),
    getDevices: admin.getDevices.bind(admin),
    createDevice: admin.createDevice.bind(admin),
    updateDevice: admin.updateDevice.bind(admin),
    deleteDevice: admin.deleteDevice.bind(admin),
    setDeviceStatus: admin.setDeviceStatus.bind(admin),
    regenerateDeviceSecret: admin.regenerateDeviceSecret.bind(admin),
    getProcesses: admin.getProcesses.bind(admin),
    createProcess: admin.createProcess.bind(admin),
    updateProcess: admin.updateProcess.bind(admin),
    deleteProcess: admin.deleteProcess.bind(admin),
    getStations: admin.getStations.bind(admin),
    createStation: admin.createStation.bind(admin),
    updateStation: admin.updateStation.bind(admin),
    deleteStation: admin.deleteStation.bind(admin),
    getModels: admin.getModels.bind(admin),
    createModel: admin.createModel.bind(admin),
    updateModel: admin.updateModel.bind(admin),
    deleteModel: admin.deleteModel.bind(admin),
    getComponentTypes: admin.getComponentTypes.bind(admin),
    createComponentType: admin.createComponentType.bind(admin),
    updateComponentType: admin.updateComponentType.bind(admin),
    deleteComponentType: admin.deleteComponentType.bind(admin),
    getPartNumbers: admin.getPartNumbers.bind(admin),
    createPartNumber: admin.createPartNumber.bind(admin),
    updatePartNumber: admin.updatePartNumber.bind(admin),
    deletePartNumber: admin.deletePartNumber.bind(admin),
    getSuppliers: admin.getSuppliers.bind(admin),
    createSupplier: admin.createSupplier.bind(admin),
    updateSupplier: admin.updateSupplier.bind(admin),
    deleteSupplier: admin.deleteSupplier.bind(admin),
    getDepartments: admin.getDepartments.bind(admin),
    createDepartment: admin.createDepartment.bind(admin),
    updateDepartment: admin.updateDepartment.bind(admin),
    deleteDepartment: admin.deleteDepartment.bind(admin),
    getSupplierPartProfiles: admin.getSupplierPartProfiles.bind(admin),
    createSupplierPartProfile: admin.createSupplierPartProfile.bind(admin),
    updateSupplierPartProfile: admin.updateSupplierPartProfile.bind(admin),
    deleteSupplierPartProfile: admin.deleteSupplierPartProfile.bind(admin),
    getSupplierPackParsers: admin.getSupplierPackParsers.bind(admin),
    getInventoryDoRecords: admin.getInventoryDoRecords.bind(admin),
    getSupplierPacks: admin.getSupplierPacks.bind(admin),
    receiveSupplierPack: admin.receiveSupplierPack.bind(admin),
    getWorkflowApprovals: admin.getWorkflowApprovals.bind(admin),
    createWorkflowApproval: admin.createWorkflowApproval.bind(admin),
    updateWorkflowApproval: admin.updateWorkflowApproval.bind(admin),
    deleteWorkflowApproval: admin.deleteWorkflowApproval.bind(admin),
    getHeartbeatSettings: admin.getHeartbeatSettings.bind(admin),
    updateHeartbeatSettings: admin.updateHeartbeatSettings.bind(admin),
    getMachines: admin.getMachines.bind(admin),
    createMachine: admin.createMachine.bind(admin),
    updateMachine: admin.updateMachine.bind(admin),
    deleteMachine: admin.deleteMachine.bind(admin),
    assignDeviceMachine: admin.assignDeviceMachine.bind(admin),
    getAuditLogs: admin.getAuditLogs.bind(admin),
    getRevisions: admin.getRevisions.bind(admin),
    createRevision: admin.createRevision.bind(admin),
    getRevision: admin.getRevision.bind(admin),
    updateRevision: admin.updateRevision.bind(admin),
    activateRevision: admin.activateRevision.bind(admin),
    getVariants: admin.getVariants.bind(admin),
    createVariant: admin.createVariant.bind(admin),
    updateVariant: admin.updateVariant.bind(admin),
    deleteVariant: admin.deleteVariant.bind(admin),
    setDefaultVariant: admin.setDefaultVariant.bind(admin),
    getBom: admin.getBom.bind(admin),
    createBomRow: admin.createBomRow.bind(admin),
    updateBomRow: admin.updateBomRow.bind(admin),
    deleteBomRow: admin.deleteBomRow.bind(admin),
    getRouting: admin.getRouting.bind(admin),
    createRoutingStep: admin.createRoutingStep.bind(admin),
    updateRoutingStep: admin.updateRoutingStep.bind(admin),
    deleteRoutingStep: admin.deleteRoutingStep.bind(admin),
    getLabelTemplates: admin.getLabelTemplates.bind(admin),
    createLabelTemplate: admin.createLabelTemplate.bind(admin),
    updateLabelTemplate: admin.updateLabelTemplate.bind(admin),
    deleteLabelTemplate: admin.deleteLabelTemplate.bind(admin),
    getLabelBindings: admin.getLabelBindings.bind(admin),
    createLabelBinding: admin.createLabelBinding.bind(admin),
    updateLabelBinding: admin.updateLabelBinding.bind(admin),
    deleteLabelBinding: admin.deleteLabelBinding.bind(admin),
    validateModel: admin.validateModel.bind(admin),
  };

  admin.getUsers = () =>
    preferEden(() => (eden as any).admin.users.get({ headers: authHeaders() }), orig.getUsers, "admin.users");
  admin.createUser = (payload: any) =>
    preferEden(
      () => (eden as any).admin.users.post(payload, { headers: authHeaders() }),
      () => orig.createUser(payload),
      "admin.users"
    );
  admin.updateUser = (id: string, payload: any) =>
    preferEden(
      () => (eden as any).admin.users({ id }).put(payload, { headers: authHeaders() }),
      () => orig.updateUser(id, payload),
      "admin.users"
    );
  admin.deleteUser = (id: string) =>
    preferEdenVoid(
      () => (eden as any).admin.users({ id }).delete({ headers: authHeaders() }),
      () => orig.deleteUser(id),
      "admin.users"
    );

  admin.getRoles = () =>
    preferEden(() => (eden as any).admin.roles.get({ headers: authHeaders() }), orig.getRoles, "admin.roles");
  admin.getPermissions = () =>
    preferEden(
      () => (eden as any).admin.permissions.get({ headers: authHeaders() }),
      orig.getPermissions,
      "admin.roles"
    );
  admin.createRole = (payload: any) =>
    preferEden(
      () => (eden as any).admin.roles.post(payload, { headers: authHeaders() }),
      () => orig.createRole(payload),
      "admin.roles"
    );
  admin.updateRole = (id: string, payload: any) =>
    preferEden(
      () => (eden as any).admin.roles({ id }).put(payload, { headers: authHeaders() }),
      () => orig.updateRole(id, payload),
      "admin.roles"
    );
  admin.deleteRole = (id: string) =>
    preferEdenVoid(
      () => (eden as any).admin.roles({ id }).delete({ headers: authHeaders() }),
      () => orig.deleteRole(id),
      "admin.roles"
    );

  admin.getDevices = () =>
    preferEden(() => (eden as any).admin.devices.get({ headers: authHeaders() }), orig.getDevices, "admin.devices");
  admin.createDevice = (payload: any) =>
    preferEden(
      () => (eden as any).admin.devices.post(payload, { headers: authHeaders() }),
      () => orig.createDevice(payload),
      "admin.devices"
    );
  admin.updateDevice = (id: string, payload: any) =>
    preferEden(
      () => (eden as any).admin.devices({ id }).put(payload, { headers: authHeaders() }),
      () => orig.updateDevice(id, payload),
      "admin.devices"
    );
  admin.deleteDevice = (id: string) =>
    preferEdenVoid(
      () => (eden as any).admin.devices({ id }).delete({ headers: authHeaders() }),
      () => orig.deleteDevice(id),
      "admin.devices"
    );
  admin.setDeviceStatus = (id: string, status: "active" | "disabled" | "maintenance") =>
    preferEden(
      () => (eden as any).admin.devices({ id }).status.post({ status }, { headers: authHeaders() }),
      () => orig.setDeviceStatus(id, status),
      "admin.devices"
    );
  admin.regenerateDeviceSecret = (id: string) =>
    preferEden(
      () => (eden as any).admin.devices({ id })["regenerate-secret"].post({}, { headers: authHeaders() }),
      () => orig.regenerateDeviceSecret(id),
      "admin.devices"
    );

  admin.getProcesses = () =>
    preferEden(
      () => (eden as any).admin.processes.get({ headers: authHeaders() }),
      orig.getProcesses,
      "admin.processes"
    );
  admin.createProcess = (payload: any) =>
    preferEden(
      () => (eden as any).admin.processes.post(payload, { headers: authHeaders() }),
      () => orig.createProcess(payload),
      "admin.processes"
    );
  admin.updateProcess = (id: string, payload: any) =>
    preferEden(
      () => (eden as any).admin.processes({ id }).put(payload, { headers: authHeaders() }),
      () => orig.updateProcess(id, payload),
      "admin.processes"
    );
  admin.deleteProcess = (id: string) =>
    preferEdenVoid(
      () => (eden as any).admin.processes({ id }).delete({ headers: authHeaders() }),
      () => orig.deleteProcess(id),
      "admin.processes"
    );

  admin.getStations = () =>
    preferEden(() => (eden as any).admin.stations.get({ headers: authHeaders() }), orig.getStations, "admin.stations");
  admin.createStation = (payload: any) =>
    preferEden(
      () => (eden as any).admin.stations.post(payload, { headers: authHeaders() }),
      () => orig.createStation(payload),
      "admin.stations"
    );
  admin.updateStation = (id: string, payload: any) =>
    preferEden(
      () => (eden as any).admin.stations({ id }).put(payload, { headers: authHeaders() }),
      () => orig.updateStation(id, payload),
      "admin.stations"
    );
  admin.deleteStation = (id: string) =>
    preferEdenVoid(
      () => (eden as any).admin.stations({ id }).delete({ headers: authHeaders() }),
      () => orig.deleteStation(id),
      "admin.stations"
    );

  admin.getModels = () =>
    preferEden(() => (eden as any).admin.models.get({ headers: authHeaders() }), orig.getModels, "admin.models");
  admin.createModel = (payload: any) =>
    preferEden(
      () => (eden as any).admin.models.post(payload, { headers: authHeaders() }),
      () => orig.createModel(payload),
      "admin.models"
    );
  admin.updateModel = (id: string, payload: any) =>
    preferEden(
      () => (eden as any).admin.models({ id }).put(payload, { headers: authHeaders() }),
      () => orig.updateModel(id, payload),
      "admin.models"
    );
  admin.deleteModel = (id: string) =>
    preferEdenVoid(
      () => (eden as any).admin.models({ id }).delete({ headers: authHeaders() }),
      () => orig.deleteModel(id),
      "admin.models"
    );

  admin.getComponentTypes = () =>
    preferEden(
      () => (eden as any).admin["component-types"].get({ headers: authHeaders() }),
      orig.getComponentTypes,
      "admin.component-types"
    );
  admin.createComponentType = (payload: any) =>
    preferEden(
      () => (eden as any).admin["component-types"].post(payload, { headers: authHeaders() }),
      () => orig.createComponentType(payload),
      "admin.component-types"
    );
  admin.updateComponentType = (id: string, payload: any) =>
    preferEden(
      () => (eden as any).admin["component-types"]({ id }).put(payload, { headers: authHeaders() }),
      () => orig.updateComponentType(id, payload),
      "admin.component-types"
    );
  admin.deleteComponentType = (id: string) =>
    preferEdenVoid(
      () => (eden as any).admin["component-types"]({ id }).delete({ headers: authHeaders() }),
      () => orig.deleteComponentType(id),
      "admin.component-types"
    );

  admin.getPartNumbers = () =>
    preferEden(
      () => (eden as any).admin["part-numbers"].get({ headers: authHeaders() }),
      orig.getPartNumbers,
      "admin.part-numbers"
    );
  admin.createPartNumber = (payload: any) =>
    preferEden(
      () => (eden as any).admin["part-numbers"].post(payload, { headers: authHeaders() }),
      () => orig.createPartNumber(payload),
      "admin.part-numbers"
    );
  admin.updatePartNumber = (id: string, payload: any) =>
    preferEden(
      () => (eden as any).admin["part-numbers"]({ id }).put(payload, { headers: authHeaders() }),
      () => orig.updatePartNumber(id, payload),
      "admin.part-numbers"
    );
  admin.deletePartNumber = (id: string) =>
    preferEdenVoid(
      () => (eden as any).admin["part-numbers"]({ id }).delete({ headers: authHeaders() }),
      () => orig.deletePartNumber(id),
      "admin.part-numbers"
    );

  admin.getSuppliers = () =>
    preferEden(
      () => (eden as any).admin.suppliers.get({ headers: authHeaders() }),
      orig.getSuppliers,
      "admin.suppliers"
    );
  admin.createSupplier = (payload: any) =>
    preferEden(
      () => (eden as any).admin.suppliers.post(payload, { headers: authHeaders() }),
      () => orig.createSupplier(payload),
      "admin.suppliers"
    );
  admin.updateSupplier = (id: string, payload: any) =>
    preferEden(
      () => (eden as any).admin.suppliers({ id }).put(payload, { headers: authHeaders() }),
      () => orig.updateSupplier(id, payload),
      "admin.suppliers"
    );
  admin.deleteSupplier = (id: string) =>
    preferEdenVoid(
      () => (eden as any).admin.suppliers({ id }).delete({ headers: authHeaders() }),
      () => orig.deleteSupplier(id),
      "admin.suppliers"
    );

  admin.getDepartments = () =>
    preferEden(
      () => (eden as any).admin.departments.get({ headers: authHeaders() }),
      orig.getDepartments,
      "admin.departments"
    );
  admin.createDepartment = (payload: any) =>
    preferEden(
      () => (eden as any).admin.departments.post(payload, { headers: authHeaders() }),
      () => orig.createDepartment(payload),
      "admin.departments"
    );
  admin.updateDepartment = (id: string, payload: any) =>
    preferEden(
      () => (eden as any).admin.departments({ id }).put(payload, { headers: authHeaders() }),
      () => orig.updateDepartment(id, payload),
      "admin.departments"
    );
  admin.deleteDepartment = (id: string) =>
    preferEdenVoid(
      () => (eden as any).admin.departments({ id }).delete({ headers: authHeaders() }),
      () => orig.deleteDepartment(id),
      "admin.departments"
    );

  admin.getSupplierPartProfiles = () =>
    preferEden(
      () => (eden as any).admin["supplier-part-profiles"].get({ headers: authHeaders() }),
      orig.getSupplierPartProfiles,
      "admin.supplier-part-profiles"
    );
  admin.createSupplierPartProfile = (payload: any) =>
    preferEden(
      () => (eden as any).admin["supplier-part-profiles"].post(payload, { headers: authHeaders() }),
      () => orig.createSupplierPartProfile(payload),
      "admin.supplier-part-profiles"
    );
  admin.updateSupplierPartProfile = (id: string, payload: any) =>
    preferEden(
      () => (eden as any).admin["supplier-part-profiles"]({ id }).put(payload, { headers: authHeaders() }),
      () => orig.updateSupplierPartProfile(id, payload),
      "admin.supplier-part-profiles"
    );
  admin.deleteSupplierPartProfile = (id: string) =>
    preferEdenVoid(
      () => (eden as any).admin["supplier-part-profiles"]({ id }).delete({ headers: authHeaders() }),
      () => orig.deleteSupplierPartProfile(id),
      "admin.supplier-part-profiles"
    );

  admin.getSupplierPackParsers = () =>
    preferEden(
      () => (eden as any).admin["supplier-pack-parsers"].get({ headers: authHeaders() }),
      orig.getSupplierPackParsers,
      "admin.supplier-packs"
    );
  admin.getInventoryDoRecords = () =>
    preferEden(
      () => (eden as any).admin["inventory-do"].get({ headers: authHeaders() }),
      orig.getInventoryDoRecords,
      "admin.supplier-packs"
    );
  admin.getSupplierPacks = () =>
    preferEden(
      () => (eden as any).admin["supplier-packs"].get({ headers: authHeaders() }),
      orig.getSupplierPacks,
      "admin.supplier-packs"
    );
  admin.receiveSupplierPack = (payload: any) =>
    preferEden(
      () => (eden as any).admin["supplier-packs"].receive.post(payload, { headers: authHeaders() }),
      () => orig.receiveSupplierPack(payload),
      "admin.supplier-packs"
    );

  admin.getWorkflowApprovals = () =>
    preferEden(
      () => (eden as any).admin["workflow-approvals"].get({ headers: authHeaders() }),
      orig.getWorkflowApprovals,
      "admin.workflow"
    );
  admin.createWorkflowApproval = (payload: any) =>
    preferEden(
      () => (eden as any).admin["workflow-approvals"].post(payload, { headers: authHeaders() }),
      () => orig.createWorkflowApproval(payload),
      "admin.workflow"
    );
  admin.updateWorkflowApproval = (id: string, payload: any) =>
    preferEden(
      () => (eden as any).admin["workflow-approvals"]({ id }).put(payload, { headers: authHeaders() }),
      () => orig.updateWorkflowApproval(id, payload),
      "admin.workflow"
    );
  admin.deleteWorkflowApproval = (id: string) =>
    preferEdenVoid(
      () => (eden as any).admin["workflow-approvals"]({ id }).delete({ headers: authHeaders() }),
      () => orig.deleteWorkflowApproval(id),
      "admin.workflow"
    );

  admin.getHeartbeatSettings = () =>
    preferEden(
      () => (eden as any).admin.settings.heartbeat.get({ headers: authHeaders() }),
      orig.getHeartbeatSettings,
      "admin.settings"
    );
  admin.updateHeartbeatSettings = (minutes: number) =>
    preferEden(
      () => (eden as any).admin.settings.heartbeat.put({ online_window_minutes: minutes }, { headers: authHeaders() }),
      () => orig.updateHeartbeatSettings(minutes),
      "admin.settings"
    );

  admin.getMachines = () =>
    preferEden(() => (eden as any).admin.machines.get({ headers: authHeaders() }), orig.getMachines, "admin.machines");
  admin.createMachine = (payload: any) =>
    preferEden(
      () => (eden as any).admin.machines.post(payload, { headers: authHeaders() }),
      () => orig.createMachine(payload),
      "admin.machines"
    );
  admin.updateMachine = (id: string, payload: any) =>
    preferEden(
      () => (eden as any).admin.machines({ id }).put(payload, { headers: authHeaders() }),
      () => orig.updateMachine(id, payload),
      "admin.machines"
    );
  admin.deleteMachine = (id: string) =>
    preferEdenVoid(
      () => (eden as any).admin.machines({ id }).delete({ headers: authHeaders() }),
      () => orig.deleteMachine(id),
      "admin.machines"
    );
  admin.assignDeviceMachine = (deviceId: string, machineId: string) =>
    preferEden(
      () =>
        (eden as any).admin
          .devices({ id: deviceId })
          ["assign-machine"].put({ machine_id: machineId }, { headers: authHeaders() }),
      () => orig.assignDeviceMachine(deviceId, machineId),
      "admin.machines"
    );

  admin.getAuditLogs = (filters?: any) =>
    preferEden(
      () => (eden as any).admin["audit-logs"].get({ headers: authHeaders(), query: filters }),
      () => orig.getAuditLogs(filters),
      "admin.audit"
    );

  admin.getRevisions = (modelId: string) =>
    preferEden(
      () => (eden as any).admin.models({ id: modelId }).revisions.get({ headers: authHeaders() }),
      () => orig.getRevisions(modelId),
      "admin.revisions"
    );
  admin.createRevision = (modelId: string, payload: any) =>
    preferEden(
      () => (eden as any).admin.models({ id: modelId }).revisions.post(payload, { headers: authHeaders() }),
      () => orig.createRevision(modelId, payload),
      "admin.revisions"
    );
  admin.getRevision = (modelId: string, revisionId: string) =>
    preferEden(
      () => (eden as any).admin.models({ id: modelId }).revisions({ revisionId }).get({ headers: authHeaders() }),
      () => orig.getRevision(modelId, revisionId),
      "admin.revisions"
    );
  admin.updateRevision = (modelId: string, revisionId: string, payload: any) =>
    preferEden(
      () =>
        (eden as any).admin.models({ id: modelId }).revisions({ revisionId }).put(payload, { headers: authHeaders() }),
      () => orig.updateRevision(modelId, revisionId, payload),
      "admin.revisions"
    );
  admin.activateRevision = (modelId: string, revisionId: string) =>
    preferEden(
      () =>
        (eden as any).admin
          .models({ id: modelId })
          .revisions({ revisionId })
          .activate.post({}, { headers: authHeaders() }),
      () => orig.activateRevision(modelId, revisionId),
      "admin.revisions"
    );

  admin.getVariants = (modelId: string, revisionId: string) =>
    preferEden(
      () =>
        (eden as any).admin.models({ id: modelId }).revisions({ revisionId }).variants.get({ headers: authHeaders() }),
      () => orig.getVariants(modelId, revisionId),
      "admin.variants"
    );
  admin.createVariant = (modelId: string, revisionId: string, payload: any) =>
    preferEden(
      () =>
        (eden as any).admin
          .models({ id: modelId })
          .revisions({ revisionId })
          .variants.post(payload, { headers: authHeaders() }),
      () => orig.createVariant(modelId, revisionId, payload),
      "admin.variants"
    );
  admin.updateVariant = (modelId: string, revisionId: string, variantId: string, payload: any) =>
    preferEden(
      () =>
        (eden as any).admin.models({ id: modelId }).revisions({ revisionId }).variants({ variantId }).put(payload, {
          headers: authHeaders(),
        }),
      () => orig.updateVariant(modelId, revisionId, variantId, payload),
      "admin.variants"
    );
  admin.deleteVariant = (modelId: string, revisionId: string, variantId: string) =>
    preferEdenVoid(
      () =>
        (eden as any).admin.models({ id: modelId }).revisions({ revisionId }).variants({ variantId }).delete({
          headers: authHeaders(),
        }),
      () => orig.deleteVariant(modelId, revisionId, variantId),
      "admin.variants"
    );
  admin.setDefaultVariant = (modelId: string, revisionId: string, variantId: string) =>
    preferEden(
      () =>
        (eden as any).admin
          .models({ id: modelId })
          .revisions({ revisionId })
          .variants({ variantId })
          ["set-default"].post({}, { headers: authHeaders() }),
      () => orig.setDefaultVariant(modelId, revisionId, variantId),
      "admin.variants"
    );

  admin.getBom = (modelId: string, revisionId: string) =>
    preferEden(
      () => (eden as any).admin.models({ id: modelId }).revisions({ revisionId }).bom.get({ headers: authHeaders() }),
      () => orig.getBom(modelId, revisionId),
      "admin.bom"
    );
  admin.createBomRow = (modelId: string, revisionId: string, payload: any) =>
    preferEden(
      () =>
        (eden as any).admin
          .models({ id: modelId })
          .revisions({ revisionId })
          .bom.post(payload, { headers: authHeaders() }),
      () => orig.createBomRow(modelId, revisionId, payload),
      "admin.bom"
    );
  admin.updateBomRow = (modelId: string, revisionId: string, bomId: string, payload: any) =>
    preferEden(
      () =>
        (eden as any).admin.models({ id: modelId }).revisions({ revisionId }).bom({ bomId }).put(payload, {
          headers: authHeaders(),
        }),
      () => orig.updateBomRow(modelId, revisionId, bomId, payload),
      "admin.bom"
    );
  admin.deleteBomRow = (modelId: string, revisionId: string, bomId: string) =>
    preferEdenVoid(
      () =>
        (eden as any).admin.models({ id: modelId }).revisions({ revisionId }).bom({ bomId }).delete({
          headers: authHeaders(),
        }),
      () => orig.deleteBomRow(modelId, revisionId, bomId),
      "admin.bom"
    );

  admin.getRouting = (modelId: string, revisionId: string) =>
    preferEden(
      () =>
        (eden as any).admin.models({ id: modelId }).revisions({ revisionId }).routing.get({ headers: authHeaders() }),
      () => orig.getRouting(modelId, revisionId),
      "admin.routing"
    );
  admin.createRoutingStep = (modelId: string, revisionId: string, payload: any) =>
    preferEden(
      () =>
        (eden as any).admin
          .models({ id: modelId })
          .revisions({ revisionId })
          .routing.post(payload, { headers: authHeaders() }),
      () => orig.createRoutingStep(modelId, revisionId, payload),
      "admin.routing"
    );
  admin.updateRoutingStep = (modelId: string, revisionId: string, stepId: string, payload: any) =>
    preferEden(
      () =>
        (eden as any).admin.models({ id: modelId }).revisions({ revisionId }).routing({ stepId }).put(payload, {
          headers: authHeaders(),
        }),
      () => orig.updateRoutingStep(modelId, revisionId, stepId, payload),
      "admin.routing"
    );
  admin.deleteRoutingStep = (modelId: string, revisionId: string, stepId: string) =>
    preferEdenVoid(
      () =>
        (eden as any).admin.models({ id: modelId }).revisions({ revisionId }).routing({ stepId }).delete({
          headers: authHeaders(),
        }),
      () => orig.deleteRoutingStep(modelId, revisionId, stepId),
      "admin.routing"
    );

  admin.getLabelTemplates = () =>
    preferEden(
      () => (eden as any).admin.templates.get({ headers: authHeaders() }),
      orig.getLabelTemplates,
      "admin.labels"
    );
  admin.createLabelTemplate = (payload: any) =>
    preferEden(
      () => (eden as any).admin.templates.post(payload, { headers: authHeaders() }),
      () => orig.createLabelTemplate(payload),
      "admin.labels"
    );
  admin.updateLabelTemplate = (id: string, payload: any) =>
    preferEden(
      () => (eden as any).admin.templates({ id }).put(payload, { headers: authHeaders() }),
      () => orig.updateLabelTemplate(id, payload),
      "admin.labels"
    );
  admin.deleteLabelTemplate = (id: string) =>
    preferEdenVoid(
      () => (eden as any).admin.templates({ id }).delete({ headers: authHeaders() }),
      () => orig.deleteLabelTemplate(id),
      "admin.labels"
    );

  admin.getLabelBindings = (revisionId?: string) =>
    preferEden(
      () =>
        (eden as any).admin.bindings.get({
          headers: authHeaders(),
          query: revisionId ? { revision_id: revisionId } : undefined,
        }),
      () => orig.getLabelBindings(revisionId),
      "admin.labels"
    );
  admin.createLabelBinding = (payload: any) =>
    preferEden(
      () => (eden as any).admin.bindings.post(payload, { headers: authHeaders() }),
      () => orig.createLabelBinding(payload),
      "admin.labels"
    );
  admin.updateLabelBinding = (id: string, payload: any) =>
    preferEden(
      () => (eden as any).admin.bindings({ id }).put(payload, { headers: authHeaders() }),
      () => orig.updateLabelBinding(id, payload),
      "admin.labels"
    );
  admin.deleteLabelBinding = (id: string) =>
    preferEdenVoid(
      () => (eden as any).admin.bindings({ id }).delete({ headers: authHeaders() }),
      () => orig.deleteLabelBinding(id),
      "admin.labels"
    );

  admin.validateModel = (modelId: string) =>
    preferEden(
      () => (eden as any).admin["validate-model"]({ id: modelId }).get({ headers: authHeaders() }),
      () => orig.validateModel(modelId),
      "admin.validation"
    );
}

installAdminEdenFallback();

export { eden };
