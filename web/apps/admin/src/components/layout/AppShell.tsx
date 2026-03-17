import { memo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { getNavIcon } from "./nav-icons";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Suspense } from "react";
import { Sun, Moon, Bell, Plus, Loader2, User, LogOut } from "lucide-react";
import layouts from "../../styles/layouts.module.css";

type NavItem = {
  to: string;
  label: string;
  icon?: string;
  group?: "overview" | "master-data" | "engineering" | "operations" | "governance";
  roles?: string[];
};

const adminNav: NavItem[] = [
  {
    to: "/admin",
    label: "Dashboard",
    icon: "bbyd-dashboard",
    group: "overview",
    roles: ["ADMIN", "STORE", "PROCESS_ENGINEER"],
  },
  { to: "/admin/users", label: "Users", icon: "employee", group: "master-data", roles: ["ADMIN"] },
  { to: "/admin/roles", label: "Roles & Permissions", icon: "role", group: "master-data", roles: ["ADMIN"] },
  { to: "/admin/models", label: "Models", icon: "product", group: "master-data", roles: ["ADMIN", "PROCESS_ENGINEER"] },
  {
    to: "/admin/component-types",
    label: "Component Types",
    icon: "dimension",
    group: "master-data",
    roles: ["ADMIN", "PROCESS_ENGINEER"],
  },
  {
    to: "/admin/part-numbers",
    label: "Part Numbers",
    icon: "number-sign",
    group: "master-data",
    roles: ["ADMIN", "PROCESS_ENGINEER", "STORE"],
  },
  {
    to: "/admin/master-routing-steps",
    label: "Master Routing Steps",
    icon: "bullet-text",
    group: "master-data",
    roles: ["ADMIN", "PROCESS_ENGINEER"],
  },
  { to: "/admin/departments", label: "Departments", icon: "org-chart", group: "master-data", roles: ["ADMIN"] },
  { to: "/admin/cost-centers", label: "Cost Centers", icon: "money-bills", group: "master-data", roles: ["ADMIN"] },
  { to: "/admin/sections", label: "Sections", icon: "customer-and-supplier", group: "master-data", roles: ["ADMIN"] },
  { to: "/admin/suppliers", label: "Vendors", icon: "supplier", group: "master-data", roles: ["ADMIN", "STORE"] },
  {
    to: "/admin/supplier-part-profiles",
    label: "Vendor Part Profiles",
    icon: "attachment-html",
    group: "master-data",
    roles: ["ADMIN", "STORE"],
  },
  {
    to: "/admin/barcode-templates",
    label: "Barcode Templates",
    icon: "bar-code",
    group: "master-data",
    roles: ["ADMIN", "PROCESS_ENGINEER"],
  },
  {
    to: "/admin/processes",
    label: "Processes",
    icon: "process",
    group: "engineering",
    roles: ["ADMIN", "PROCESS_ENGINEER"],
  },
  {
    to: "/admin/stations",
    label: "Stations",
    icon: "factory",
    group: "engineering",
    roles: ["ADMIN", "PROCESS_ENGINEER"],
  },
  { to: "/admin/bom", label: "BOM", icon: "list", group: "engineering", roles: ["ADMIN", "PROCESS_ENGINEER"] },
  {
    to: "/admin/templates",
    label: "Label Templates",
    icon: "measure",
    group: "engineering",
    roles: ["ADMIN", "PROCESS_ENGINEER"],
  },
  {
    to: "/admin/readiness",
    label: "Readiness Validator",
    icon: "survey",
    group: "engineering",
    roles: ["ADMIN", "PROCESS_ENGINEER"],
  },
  {
    to: "/admin/material-requests",
    label: "Material Requests",
    icon: "request",
    group: "operations",
    roles: ["ADMIN", "STORE"],
  },
  {
    to: "/admin/inventory-do",
    label: "Delivery Orders (DO)",
    icon: "document",
    group: "operations",
    roles: ["ADMIN", "STORE"],
  },
  {
    to: "/admin/vendor-pack-detail",
    label: "Vendor Pack Detail",
    icon: "customer-and-contacts",
    group: "operations",
    roles: ["ADMIN", "STORE"],
  },
  {
    to: "/admin/inbound-packs",
    label: "Inbound Vendor Packs",
    icon: "shipping-status",
    group: "operations",
    roles: ["ADMIN", "STORE"],
  },
  {
    to: "/admin/forklift-intake",
    label: "Forklift Intake",
    icon: "shipping-status",
    group: "operations",
    roles: ["ADMIN", "STORE", "FORKLIFT"],
  },
  {
    to: "/admin/machines",
    label: "Machines",
    icon: "machine",
    group: "operations",
    roles: ["ADMIN", "PROCESS_ENGINEER"],
  },
  { to: "/admin/devices", label: "Devices", icon: "laptop", group: "operations", roles: ["ADMIN"] },
  { to: "/admin/recovery", label: "Set Recovery", icon: "wrench", group: "operations", roles: ["ADMIN"] },
  { to: "/admin/approvals", label: "Workflow Approvals", icon: "approvals", group: "governance", roles: ["ADMIN"] },
  { to: "/admin/email-settings", label: "Email Settings", icon: "email", group: "governance", roles: ["ADMIN"] },
  { to: "/admin/heartbeat", label: "Device Heartbeat", icon: "heart", group: "governance", roles: ["ADMIN"] },
  { to: "/admin/system-health", label: "System Health", icon: "sys-monitor", group: "governance", roles: ["ADMIN"] },
  { to: "/admin/audit-logs", label: "Audit Logs", icon: "history", group: "governance", roles: ["ADMIN"] },
];

const stationNav: NavItem[] = [
  { to: "/station/register", label: "Device Register", icon: "laptop" },
  { to: "/station/login", label: "Operator Login", icon: "employee" },
  { to: "/station/jigging", label: "Jigging / Wash", icon: "wrench" },
  { to: "/station/bonding", label: "Bonding", icon: "attachment" },
  { to: "/station/magnetize-flux", label: "Magnetize / Flux", icon: "action" },
  { to: "/station/scan", label: "Assembly", icon: "factory" },
  { to: "/station/label", label: "Label", icon: "qr-code" },
  { to: "/station/packing", label: "Packing", icon: "product" },
  { to: "/station/fg", icon: "shipping-status", label: "FG / Shipping" },
  { to: "/station/queue", icon: "sys-monitor", label: "Queue Monitor" },
  { to: "/station/material/request", icon: "request", label: "Prod Request", roles: ["PRODUCTION", "OPERATOR"] },
  { to: "/station/material/store", icon: "approvals", label: "Store Approvals", roles: ["STORE", "SUPERVISOR"] },
  { to: "/station/history", icon: "history", label: "Trace History" },
];

const navSections = [
  { key: "overview", title: "Overview", icon: "home" },
  { key: "master-data", title: "Master Data", icon: "grid" },
  { key: "engineering", title: "Engineering", icon: "wrench" },
  { key: "operations", title: "Operations", icon: "official-service" },
  { key: "governance", title: "Governance", icon: "key-user-settings" },
] as const;

export const AppShell = memo(function AppShell({ mode }: { mode: "admin" | "station" }) {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");

  const nav =
    mode === "admin"
      ? adminNav.filter((item) => {
          if (user?.roles?.includes("ADMIN")) return true;
          const neededRoles = (item as { roles?: string[] }).roles;
          if (!neededRoles?.length) return false;
          return neededRoles.some((role) => user?.roles?.includes(role));
        })
      : stationNav.filter((item) => {
          const neededRoles = (item as { roles?: string[] }).roles;
          if (!neededRoles?.length) return true;
          return neededRoles.some((role) => user?.roles?.includes(role));
        });

  const handleSearch = (query: string) => {
    if (!query.trim()) return;
    const lowerQuery = query.toLowerCase();
    const searchResult = nav.find(
      (item) => item.label.toLowerCase().includes(lowerQuery) || item.to.toLowerCase().includes(lowerQuery)
    );
    if (searchResult) {
      navigate(searchResult.to);
      setSearchValue("");
    }
  };

  const isKioskLayout = mode === "station" && location.pathname === "/station/register";
  if (isKioskLayout) {
    return <Outlet />;
  }

  const normalizedPath = location.pathname.replace(/\/$/, "");

  return (
    <div
      className={cn(mode === "admin" ? "text-sm" : "text-base")}
      style={{ height: "100vh", display: "flex", flexDirection: "column" }}
    >
      {/* Header */}
      <header className="flex h-14 items-center gap-4 border-b bg-background px-4 shadow-sm">
        <button
          type="button"
          onClick={() => navigate(mode === "admin" ? "/admin" : "/station/login")}
          className="flex items-center gap-2 shrink-0"
        >
          <img src="/logo.png" alt="MMI Logo" className="h-6 max-h-6" />
        </button>
        <span className="font-semibold text-foreground truncate">
          Traceability System | {mode === "admin" ? "Admin Console" : "Station Interface"}
        </span>
        <div className="flex-1 flex justify-center max-w-xs">
          <Input
            placeholder="Search pages..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch(searchValue);
            }}
            className="max-w-[300px]"
            aria-label="Search navigation pages"
          />
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open notifications">
                <Bell className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex flex-col items-start gap-0.5">
                <span className="font-medium">System Health OK</span>
                <span className="text-xs text-muted-foreground">System started successfully · Just now</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-0.5">
                <span className="font-medium">Approvals</span>
                <span className="text-xs text-muted-foreground">No pending approvals · Today</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/admin/system-health")}>View All</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" onClick={() => {}} aria-label="Quick create">
            <Plus className="h-4 w-4 mr-1" /> Quick Create
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-full focus:ring-2 focus:ring-ring"
                aria-label={`User profile: ${user?.display_name}`}
              >
                <Avatar className="h-8 w-8 border-2 border-border">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {user?.display_name?.[0] ?? "U"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{user?.display_name ?? "User"}</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {(user?.roles ?? []).join(", ") || "No role"}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/admin/users")}>
                <User className="mr-2 h-4 w-4" /> My Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  logout();
                }}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn("flex flex-col border-r bg-card w-[280px] shrink-0 overflow-y-auto", layouts.glassCard)}
          style={{ borderTop: "none", borderBottom: "none", borderLeft: "none", borderRadius: 0 }}
          aria-label="Main navigation menu"
        >
          <nav className="flex flex-col gap-1 p-2">
            {mode === "admin"
              ? navSections.map((section) => {
                  const items = nav.filter((n) => n.group === section.key);
                  if (items.length === 0) return null;
                  const SectionIcon = getNavIcon(section.icon);
                  return (
                    <div key={section.key} className="pt-2 first:pt-0">
                      <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <SectionIcon className="h-3.5 w-3.5" />
                        {section.title}
                      </div>
                      {items.map((item) => {
                        const normalizedTo = item.to.replace(/\/$/, "");
                        const isSelected =
                          normalizedTo === "/admin"
                            ? normalizedPath === "/admin"
                            : normalizedPath === normalizedTo || normalizedPath.startsWith(normalizedTo + "/");
                        const Icon = getNavIcon(item.icon);
                        return (
                          <button
                            key={item.to}
                            type="button"
                            onClick={() => navigate(item.to)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                              isSelected
                                ? "bg-primary/10 text-primary font-medium"
                                : "hover:bg-accent hover:text-accent-foreground"
                            )}
                            aria-current={isSelected ? "page" : undefined}
                            aria-label={`Navigate to ${item.label}`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              : nav.map((item) => {
                  const isSelected = location.pathname === item.to;
                  const Icon = getNavIcon(item.icon);
                  return (
                    <button
                      key={item.to}
                      type="button"
                      onClick={() => navigate(item.to)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                        isSelected
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-accent hover:text-accent-foreground"
                      )}
                      aria-current={isSelected ? "page" : undefined}
                      aria-label={`Navigate to ${item.label}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </button>
                  );
                })}
            <div className="mt-auto border-t pt-2">
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                aria-label="Sign out of the system"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sign Out
              </button>
            </div>
          </nav>
        </aside>

        <main
          className="page-container flex-1 overflow-auto relative flex flex-col"
          role="main"
          aria-label="Main content area"
          style={{ padding: 0 }}
        >
          <Suspense
            fallback={
              <div className="flex w-full h-full items-center justify-center flex-col gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading page...</p>
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
});
