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
import { Sun, Moon, Bell, Loader2, User, LogOut, Search } from "lucide-react";
type AdminGroup = "overview" | "master-data" | "engineering" | "operations" | "governance";
type StationGroup = "setup" | "production" | "monitor" | "materials" | "history";

type NavItem = {
  to: string;
  label: string;
  icon?: string;
  group?: AdminGroup | StationGroup;
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
  { to: "/station/register", label: "Device Register", icon: "laptop", group: "setup" },
  { to: "/station/login", label: "Operator Login", icon: "employee", group: "setup" },
  { to: "/station/jigging", label: "Jigging / Wash", icon: "wrench", group: "production" },
  { to: "/station/bonding", label: "Bonding", icon: "attachment", group: "production" },
  { to: "/station/magnetize-flux", label: "Magnetize / Flux", icon: "action", group: "production" },
  { to: "/station/scan", label: "Assembly", icon: "factory", group: "production" },
  { to: "/station/label", label: "Label", icon: "qr-code", group: "production" },
  { to: "/station/packing", label: "Packing", icon: "product", group: "production" },
  { to: "/station/fg", icon: "shipping-status", label: "FG / Shipping", group: "production" },
  { to: "/station/queue", icon: "sys-monitor", label: "Queue Monitor", group: "monitor" },
  {
    to: "/station/material/request",
    icon: "request",
    label: "Prod Request",
    group: "materials",
    roles: ["PRODUCTION", "OPERATOR"],
  },
  {
    to: "/station/material/store",
    icon: "approvals",
    label: "Store Approvals",
    group: "materials",
    roles: ["STORE", "SUPERVISOR"],
  },
  { to: "/station/history", icon: "history", label: "Trace History", group: "history" },
];

const adminNavSections = [
  { key: "overview", title: "Overview", icon: "home" },
  { key: "master-data", title: "Master Data", icon: "grid" },
  { key: "engineering", title: "Engineering", icon: "wrench" },
  { key: "operations", title: "Operations", icon: "official-service" },
  { key: "governance", title: "Governance", icon: "key-user-settings" },
] as const;

const stationNavSections = [
  { key: "setup", title: "Setup", icon: "laptop" },
  { key: "production", title: "Production", icon: "factory" },
  { key: "monitor", title: "Monitor", icon: "sys-monitor" },
  { key: "materials", title: "Materials", icon: "request" },
  { key: "history", title: "History", icon: "history" },
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
      {/* Header — brand (left) | actions (right) */}
      <header className="flex items-center justify-between h-14 border-b bg-background/95 backdrop-blur-sm px-4 shrink-0 z-10">
        {/* Left: Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate(mode === "admin" ? "/admin" : "/station/login")}
            className="shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Go to home"
          >
            <img src="/logo.png" alt="MMI Logo" className="h-7 w-auto" />
          </button>
          <div className="h-5 w-px bg-border shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">
            {mode === "admin" ? "Admin Console" : "Station Interface"}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-end gap-0.5">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            className="h-8 w-8"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Notifications" className="h-8 w-8">
                <Bell className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex flex-col items-start gap-0.5">
                <span className="font-medium text-sm">System Health OK</span>
                <span className="text-xs text-muted-foreground">System started successfully · Just now</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-0.5">
                <span className="font-medium text-sm">Approvals</span>
                <span className="text-xs text-muted-foreground">No pending approvals · Today</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/admin/system-health")} className="text-sm">
                View All
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Divider */}
          <div className="h-5 w-px bg-border mx-1" />

          {/* User avatar & dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`User menu — ${user?.display_name ?? "User"}`}
              >
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {user?.display_name?.[0]?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-sm text-foreground">{user?.display_name ?? "User"}</span>
                  <span className="text-xs text-muted-foreground">{(user?.roles ?? []).join(", ") || "No role"}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/admin/users")} className="text-sm">
                <User className="mr-2 h-4 w-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-sm text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className="flex flex-col border-r bg-sidebar w-[260px] shrink-0 overflow-y-auto"
          aria-label="Main navigation menu"
        >
          {/* Sidebar: menu search (find page by name) */}
          <div className="px-2 pt-2 pb-1 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search menu…"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch(searchValue);
                }}
                className="h-8 pl-8 text-sm bg-muted/50 border-muted-foreground/20 focus-visible:bg-background"
                aria-label="Search menu"
              />
            </div>
          </div>

          <nav className="flex flex-col py-2 px-2">
            {(mode === "admin" ? adminNavSections : stationNavSections).map((section, sectionIdx) => {
              const items = nav.filter((n) => n.group === section.key);
              if (items.length === 0) return null;
              return (
                <div key={section.key} className={cn("flex flex-col", sectionIdx > 0 && "mt-1")}>
                  {/* Section header — subtle label, not competing with nav items */}
                  {sectionIdx > 0 && <div className="mx-3 my-2 border-t border-border" />}
                  <p className="px-3 pt-1 pb-1 text-xs font-medium tracking-wide text-muted-foreground select-none">
                    {section.title}
                  </p>

                  {/* Nav items */}
                  {items.map((item) => {
                    const normalizedTo = item.to.replace(/\/$/, "");
                    const isSelected =
                      mode === "admin"
                        ? normalizedTo === "/admin"
                          ? normalizedPath === "/admin"
                          : normalizedPath === normalizedTo || normalizedPath.startsWith(normalizedTo + "/")
                        : location.pathname === item.to;
                    const Icon = getNavIcon(item.icon);
                    return (
                      <button
                        key={item.to}
                        type="button"
                        onClick={() => navigate(item.to)}
                        className={cn(
                          "group flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-left transition-colors duration-150",
                          isSelected
                            ? "bg-primary text-primary-foreground font-medium"
                            : "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
                        )}
                        aria-current={isSelected ? "page" : undefined}
                        aria-label={`Navigate to ${item.label}`}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isSelected ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                          )}
                        />
                        <span className="truncate text-sm leading-5">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}

            {/* Sign Out */}
            <div className="mt-auto">
              <div className="mx-3 my-2 border-t border-border" />
              <button
                type="button"
                onClick={logout}
                className="group flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                aria-label="Sign out of the system"
              >
                <LogOut className="h-4 w-4 shrink-0 group-hover:text-foreground" />
                <span className="leading-5">Sign Out</span>
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
              <div className="flex w-full h-full items-center justify-center flex-col gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading…</p>
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
