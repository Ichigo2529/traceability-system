import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { RoleGuard } from "./RoleGuard";

const LoginPage = lazy(() => import("../pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const AdminDashboardPage = lazy(() => import("../pages/admin/AdminDashboardPage").then((m) => ({ default: m.AdminDashboardPage })));
const UsersPage = lazy(() => import("../pages/admin/UsersPage").then((m) => ({ default: m.UsersPage })));
const RolesPage = lazy(() => import("../pages/admin/RolesPage").then((m) => ({ default: m.RolesPage })));
const ModelsPage = lazy(() => import("../pages/admin/ModelsPage").then((m) => ({ default: m.ModelsPage })));
const ComponentTypesPage = lazy(() => import("../pages/admin/ComponentTypesPage").then((m) => ({ default: m.ComponentTypesPage })));
const PartNumbersPage = lazy(() => import("../pages/admin/PartNumbersPage").then((m) => ({ default: m.PartNumbersPage })));
const MasterRoutingStepsPage = lazy(() => import("../pages/admin/MasterRoutingStepsPage").then((m) => ({ default: m.MasterRoutingStepsPage })));
const ProcessesPage = lazy(() => import("../pages/admin/ProcessesPage").then((m) => ({ default: m.ProcessesPage })));
const StationsPage = lazy(() => import("../pages/admin/StationsPage").then((m) => ({ default: m.StationsPage })));
const DevicesPage = lazy(() => import("../pages/admin/DevicesPage").then((m) => ({ default: m.DevicesPage })));
const ApprovalsPage = lazy(() => import("../pages/admin/ApprovalsPage").then((m) => ({ default: m.ApprovalsPage })));
const SuppliersPage = lazy(() => import("../pages/admin/SuppliersPage").then((m) => ({ default: m.SuppliersPage })));
const DepartmentsPage = lazy(() => import("../pages/admin/DepartmentsPage").then((m) => ({ default: m.DepartmentsPage })));
const CostCentersPage = lazy(() => import("../pages/admin/CostCentersPage").then((m) => ({ default: m.CostCentersPage })));
const SectionsPage = lazy(() => import("../pages/admin/SectionsPage").then((m) => ({ default: m.SectionsPage })));
const SupplierPartProfilesPage = lazy(() =>
  import("../pages/admin/SupplierPartProfilesPage").then((m) => ({ default: m.SupplierPartProfilesPage }))
);
const BarcodeTemplatesPage = lazy(() =>
  import("../pages/admin/BarcodeTemplatesPage").then((m) => ({ default: m.BarcodeTemplatesPage }))
);
const InboundPacksPage = lazy(() => import("../pages/admin/InboundPacksPage").then((m) => ({ default: m.InboundPacksPage })));
const InventoryDoPage = lazy(() => import("../pages/admin/InventoryDoPage").then((m) => ({ default: m.InventoryDoPage })));
const VendorPackDetailPage = lazy(() => import("../pages/admin/VendorPackDetailPage").then((m) => ({ default: m.VendorPackDetailPage })));
const MaterialRequestsPage = lazy(() => import("../pages/admin/MaterialRequestsPage"));
const MaterialRequestCreatePage = lazy(() => import("../pages/admin/MaterialRequestCreatePage").then((m) => ({ default: m.MaterialRequestCreatePage })));
const MaterialRequestDetailsPage = lazy(() => import("../pages/admin/MaterialRequestDetailsPage").then((m) => ({ default: m.MaterialRequestDetailsPage })));
const SetRecoveryPage = lazy(() => import("../pages/admin/SetRecoveryPage").then((m) => ({ default: m.SetRecoveryPage })));
const EmailSettingsPage = lazy(() => import("../pages/admin/EmailSettingsPage"));

const Ui5SmokeTest = lazy(() => import("../pages/Ui5SmokeTest"));
const MachinesPage = lazy(() => import("../pages/MachinesPage"));
const ModelDetailsPage = lazy(() => import("../pages/ModelDetailsPage"));
const RevisionDetailsPage = lazy(() => import("../pages/RevisionDetailsPage"));
const LabelTemplatesPage = lazy(() => import("../pages/LabelTemplatesPage"));
const ReadinessValidatorPage = lazy(() => import("../pages/ReadinessValidatorPage"));
const AuditLogsPage = lazy(() => import("../pages/AuditLogsPage"));
const BomPage = lazy(() => import("../pages/BomPage"));
const HeartbeatMonitorPage = lazy(() => import("../pages/HeartbeatMonitorPage"));
const SystemHealthPage = lazy(() => import("../pages/SystemHealthPage"));

const DeviceRegisterPage = lazy(() => import("../pages/station/DeviceRegisterPage").then((m) => ({ default: m.DeviceRegisterPage })));
const JiggingStationPage = lazy(() => import("../pages/station/JiggingStationPage").then((m) => ({ default: m.JiggingStationPage })));
const OperatorLoginPage = lazy(() => import("../pages/station/OperatorLoginPage").then((m) => ({ default: m.OperatorLoginPage })));
const BondingStationPage = lazy(() => import("../pages/station/BondingStationPage").then((m) => ({ default: m.BondingStationPage })));
const MagnetizeFluxStationPage = lazy(() =>
  import("../pages/station/MagnetizeFluxStationPage").then((m) => ({ default: m.MagnetizeFluxStationPage }))
);
const ScanStationPage = lazy(() => import("../pages/station/ScanStationPage").then((m) => ({ default: m.ScanStationPage })));
const LabelStationPage = lazy(() => import("../pages/station/LabelStationPage").then((m) => ({ default: m.LabelStationPage })));
const PackingStationPage = lazy(() => import("../pages/station/PackingStationPage").then((m) => ({ default: m.PackingStationPage })));
const StationHistoryPage = lazy(() => import("../pages/station/StationHistoryPage").then((m) => ({ default: m.StationHistoryPage })));
const FgStationPage = lazy(() => import("../pages/station/FgStationPage").then((m) => ({ default: m.FgStationPage })));
const QueueMonitorPage = lazy(() => import("../pages/station/QueueMonitorPage").then((m) => ({ default: m.QueueMonitorPage })));
const ProductionMaterialRequestPage = lazy(() =>
  import("../pages/station/ProductionMaterialRequestPage").then((m) => ({ default: m.ProductionMaterialRequestPage }))
);
const StoreMaterialApprovalPage = lazy(() =>
  import("../pages/station/StoreMaterialApprovalPage").then((m) => ({ default: m.StoreMaterialApprovalPage }))
);

export function AppRoutes() {
  return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/test-ui5" element={<Ui5SmokeTest />} />

        <Route
          path="/admin"
          element={
            <RoleGuard role="ADMIN">
              <AppShell mode="admin" />
            </RoleGuard>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="models" element={<ModelsPage />} />
          <Route path="component-types" element={<ComponentTypesPage />} />
          <Route path="part-numbers" element={<PartNumbersPage />} />
          <Route path="master-routing-steps" element={<MasterRoutingStepsPage />} />
          <Route path="processes" element={<ProcessesPage />} />
          <Route path="stations" element={<StationsPage />} />
          <Route path="devices" element={<DevicesPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="email-settings" element={<EmailSettingsPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="departments" element={<DepartmentsPage />} />
          <Route path="cost-centers" element={<CostCentersPage />} />
          <Route path="sections" element={<SectionsPage />} />
          <Route path="supplier-part-profiles" element={<SupplierPartProfilesPage />} />
          <Route path="barcode-templates" element={<BarcodeTemplatesPage />} />
          <Route path="inventory-do" element={<InventoryDoPage />} />
          <Route path="vendor-pack-detail" element={<VendorPackDetailPage />} />
          <Route path="inbound-packs" element={<InboundPacksPage />} />
          <Route path="material-requests" element={<MaterialRequestsPage />} />
          <Route path="material-requests/new" element={<MaterialRequestCreatePage />} />
          <Route path="material-requests/:id" element={<MaterialRequestDetailsPage />} />
          <Route path="machines" element={<MachinesPage />} />
          <Route path="models/:id" element={<ModelDetailsPage />} />
          <Route path="models/:id/revisions/:revisionId" element={<RevisionDetailsPage />} />
          <Route path="templates" element={<LabelTemplatesPage />} />
          <Route path="bom" element={<BomPage />} />
          <Route path="readiness" element={<ReadinessValidatorPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="heartbeat" element={<HeartbeatMonitorPage />} />
          <Route path="system-health" element={<SystemHealthPage />} />
          <Route path="recovery" element={<SetRecoveryPage />} />
        </Route>

        <Route
          path="/station"
          element={
            <RoleGuard role="OPERATOR">
              <AppShell mode="station" />
            </RoleGuard>
          }
        >
          <Route path="register" element={<DeviceRegisterPage />} />
          <Route path="login" element={<OperatorLoginPage />} />
          <Route path="jigging" element={<JiggingStationPage />} />
          <Route path="bonding" element={<BondingStationPage />} />
          <Route path="magnetize-flux" element={<MagnetizeFluxStationPage />} />
          <Route path="scan" element={<ScanStationPage />} />
          <Route path="label" element={<LabelStationPage />} />
          <Route path="packing" element={<PackingStationPage />} />
          <Route path="fg" element={<FgStationPage />} />
          <Route path="queue" element={<QueueMonitorPage />} />
          <Route path="material/request" element={<ProductionMaterialRequestPage />} />
          <Route path="material/store" element={<StoreMaterialApprovalPage />} />
          <Route path="history" element={<StationHistoryPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
  );
}
