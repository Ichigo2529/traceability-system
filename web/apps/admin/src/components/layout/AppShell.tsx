import { Factory, MonitorCog, ShieldCheck, Users, Workflow, Boxes, Cpu, GitBranch, ScanLine, History, LogOut, Wrench, FileCheck2, ScrollText, PackageSearch, TestTube2, Waves, Link2, ListChecks, ListTodo, Building2, PackagePlus, Activity, ClipboardList, ClipboardPen, ClipboardCheck, Gauge, ScanBarcode } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/button";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: "overview" | "master-data" | "engineering" | "operations" | "governance";
  roles?: string[];
};

const adminNav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: MonitorCog, group: "overview" },
  { to: "/admin/users", label: "Users", icon: Users, group: "master-data" },
  { to: "/admin/roles", label: "Roles & Permissions", icon: ShieldCheck, group: "master-data" },
  { to: "/admin/models", label: "Models", icon: Boxes, group: "master-data" },
  { to: "/admin/component-types", label: "Component Types", icon: ListChecks, group: "master-data" },
  { to: "/admin/part-numbers", label: "Part Numbers", icon: PackageSearch, group: "master-data" },
  { to: "/admin/departments", label: "Departments", icon: Building2, group: "master-data" },
  { to: "/admin/suppliers", label: "Vendors", icon: Building2, group: "master-data" },
  { to: "/admin/supplier-part-profiles", label: "Vendor Part Profiles", icon: PackageSearch, group: "master-data" },
  { to: "/admin/barcode-templates", label: "Barcode Templates", icon: ScanBarcode, group: "master-data" },
  { to: "/admin/processes", label: "Processes", icon: Workflow, group: "engineering" },
  { to: "/admin/stations", label: "Stations", icon: Factory, group: "engineering" },
  { to: "/admin/bom", label: "BOM", icon: ListChecks, group: "engineering" },
  { to: "/admin/templates", label: "Label Templates", icon: Boxes, group: "engineering" },
  { to: "/admin/readiness", label: "Readiness Validator", icon: FileCheck2, group: "engineering" },
  { to: "/admin/material-requests", label: "Material Requests", icon: ClipboardList, group: "operations" },
  { to: "/admin/inbound-packs", label: "Inbound Vendor Packs", icon: PackagePlus, group: "operations" },
  { to: "/admin/machines", label: "Machines", icon: Wrench, group: "operations" },
  { to: "/admin/devices", label: "Devices", icon: Cpu, group: "operations" },
  { to: "/admin/approvals", label: "Workflow Approvals", icon: GitBranch, group: "governance" },
  { to: "/admin/heartbeat", label: "Device Heartbeat", icon: Activity, group: "governance" },
  { to: "/admin/system-health", label: "System Health", icon: Gauge, group: "governance" },
  { to: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText, group: "governance" },
];

const stationNav: NavItem[] = [
  { to: "/station/register", label: "Device Register", icon: Cpu },
  { to: "/station/login", label: "Operator Login", icon: Users },
  { to: "/station/jigging", label: "Jigging / Wash", icon: Waves },
  { to: "/station/bonding", label: "Bonding", icon: Link2 },
  { to: "/station/magnetize-flux", label: "Magnetize / Flux", icon: TestTube2 },
  { to: "/station/scan", label: "Assembly", icon: ScanLine },
  { to: "/station/label", label: "Label", icon: ListChecks },
  { to: "/station/packing", label: "Packing", icon: Boxes },
  { to: "/station/fg", label: "FG / Shipping", icon: PackageSearch },
  { to: "/station/queue", label: "Queue Monitor", icon: ListTodo },
  { to: "/station/material/request", label: "Prod Request", icon: ClipboardPen, roles: ["PRODUCTION", "OPERATOR"] },
  { to: "/station/material/store", label: "Store Approvals", icon: ClipboardCheck, roles: ["STORE", "SUPERVISOR"] },
  { to: "/station/history", label: "Trace History", icon: History },
];

export function AppShell({ mode }: { mode: "admin" | "station" }) {
  const { logout, user } = useAuth();
  const location = useLocation();
  const nav =
    mode === "admin"
      ? adminNav
      : stationNav.filter((item) => {
          const neededRoles = (item as { roles?: string[] }).roles;
          if (!neededRoles?.length) return true;
          return neededRoles.some((role) => user?.roles?.includes(role));
        });
  const isKioskLayout = mode === "station" && location.pathname === "/station/register";

  if (isKioskLayout) {
    return (
      <main className="factory-shell min-h-screen p-6 lg:p-8">
        <Outlet />
      </main>
    );
  }

  return (
    <div className="factory-shell grid min-h-screen grid-cols-1 md:grid-cols-[280px_1fr]">
      <aside className="sticky top-0 flex h-screen flex-col border-r border-slate-300/90 bg-white/95 p-4 backdrop-blur-sm">
        <div className="mb-6 flex items-center gap-3 rounded-md border border-primary/40 bg-gradient-to-r from-primary to-[#2c87bf] px-3 py-3 text-white shadow-enterprise">
          <Factory className="h-5 w-5" />
          <div>
            <p className="text-xs uppercase tracking-wide opacity-80">Traceability</p>
            <p className="font-semibold">{mode === "admin" ? "Admin Console" : "Shopfloor Station"}</p>
          </div>
        </div>

        <div className="app-menu-scroll min-h-0 flex-1 overflow-y-auto pr-1">
        {mode === "admin" ? (
          <nav className="space-y-4">
            {[
              { key: "overview", title: "Overview" },
              { key: "master-data", title: "Master Data" },
              { key: "engineering", title: "Engineering" },
              { key: "operations", title: "Operations" },
              { key: "governance", title: "Governance" },
            ].map((section) => {
              const sectionItems = nav.filter((item) => item.group === section.key);
              if (!sectionItems.length) return null;
              return (
                <div key={section.key} className="space-y-1.5">
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{section.title}</p>
                  {sectionItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          "group flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                          isActive
                            ? "border-primary/25 bg-primary/[0.1] text-primary shadow-enterprise-soft"
                            : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                        )
                      }
                    >
                      <item.icon className="h-4 w-4 text-slate-500 transition-colors group-hover:text-slate-700" />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              );
            })}
          </nav>
        ) : (
          <nav className="space-y-1.5">
            {nav.map((item) => (
            <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    isActive
                      ? "border-primary/25 bg-primary/[0.1] text-primary shadow-enterprise-soft"
                      : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                  )
                }
              >
                <item.icon className="h-4 w-4 text-slate-500 transition-colors group-hover:text-slate-700" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
        </div>

        <div className="mt-6 rounded-md border border-slate-300 bg-slate-50 p-3 shadow-enterprise-soft">
          <p className="text-xs text-muted-foreground">Signed in</p>
          <p className="text-sm font-semibold">{user?.display_name}</p>
          <p className="text-xs text-muted-foreground">{user?.roles?.join(", ")}</p>
          <Button className="mt-3 w-full" variant="outline" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      <main className="min-h-screen bg-slate-50/70 p-6 lg:p-8">
        <div key={location.pathname} className="route-transition route-surface">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
