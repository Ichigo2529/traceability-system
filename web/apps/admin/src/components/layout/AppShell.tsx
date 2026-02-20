import { memo, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import layouts from "../../styles/layouts.module.css";
import {
  ShellBar,
  ShellBarItem,
  ShellBarSpacer,
  SideNavigation,
  SideNavigationItem,
  SideNavigationSubItem,
  Avatar,
  Button,
  Input,
  Popover,
  List,
  ListItemStandard,
  Label,
  SideNavigationDomRef,
  FlexBox,
  FlexBoxAlignItems,
  FlexBoxDirection,
  FlexBoxJustifyContent,
  BusyIndicator,
  Text,
} from "@ui5/webcomponents-react";
import { Suspense } from "react";

// ... existing imports ...
// (I'll keep the imports short for the tool call)
import "@ui5/webcomponents-icons/dist/home.js";
import "@ui5/webcomponents-icons/dist/group.js";
import "@ui5/webcomponents-icons/dist/employee.js";
import "@ui5/webcomponents-icons/dist/role.js";
import "@ui5/webcomponents-icons/dist/product.js";
import "@ui5/webcomponents-icons/dist/dimension.js";
import "@ui5/webcomponents-icons/dist/number-sign.js";
import "@ui5/webcomponents-icons/dist/org-chart.js";
import "@ui5/webcomponents-icons/dist/customer.js";
import "@ui5/webcomponents-icons/dist/supplier.js";
import "@ui5/webcomponents-icons/dist/attachment-html.js";
import "@ui5/webcomponents-icons/dist/bar-code.js";
import "@ui5/webcomponents-icons/dist/process.js";
import "@ui5/webcomponents-icons/dist/factory.js";
import "@ui5/webcomponents-icons/dist/list.js";
import "@ui5/webcomponents-icons/dist/measure.js";
import "@ui5/webcomponents-icons/dist/survey.js";
import "@ui5/webcomponents-icons/dist/request.js";
import "@ui5/webcomponents-icons/dist/shipping-status.js";
import "@ui5/webcomponents-icons/dist/settings.js";
import "@ui5/webcomponents-icons/dist/machine.js";
import "@ui5/webcomponents-icons/dist/laptop.js";
import "@ui5/webcomponents-icons/dist/customer-and-supplier.js";
import "@ui5/webcomponents-icons/dist/approvals.js";
import "@ui5/webcomponents-icons/dist/heart.js";
import "@ui5/webcomponents-icons/dist/sys-monitor.js";
import "@ui5/webcomponents-icons/dist/history.js";
import "@ui5/webcomponents-icons/dist/log.js";
import "@ui5/webcomponents-icons/dist/bbyd-dashboard.js";
import "@ui5/webcomponents-icons/dist/dark-mode.js";
import "@ui5/webcomponents-icons/dist/light-mode.js";
import "@ui5/webcomponents-icons/dist/bell.js";
// Valid webcomponents-icons
import "@ui5/webcomponents-icons/dist/key-user-settings.js"; // Governance/Shield replacement
import "@ui5/webcomponents-icons/dist/wrench.js";
import "@ui5/webcomponents-icons/dist/official-service.js"; // Operations replacement
import "@ui5/webcomponents-icons/dist/accept.js";
import "@ui5/webcomponents-icons/dist/action.js";
import "@ui5/webcomponents-icons/dist/qr-code.js";
import "@ui5/webcomponents-icons/dist/grid.js"; // Master Data
import "@ui5/webcomponents-icons/dist/table-view.js"; // Alternative for grid/database
import "@ui5/webcomponents-icons/dist/attachment.js";
import "@ui5/webcomponents-icons/dist/add.js";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

type NavItem = {
  to: string;
  label: string;
  icon?: string;
  group?: "overview" | "master-data" | "engineering" | "operations" | "governance";
  roles?: string[];
};

const adminNav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: "bbyd-dashboard", group: "overview" },
  { to: "/admin/users", label: "Users", icon: "employee", group: "master-data" },
  { to: "/admin/roles", label: "Roles & Permissions", icon: "role", group: "master-data" },
  { to: "/admin/models", label: "Models", icon: "product", group: "master-data" },
  { to: "/admin/component-types", label: "Component Types", icon: "dimension", group: "master-data" },
  { to: "/admin/part-numbers", label: "Part Numbers", icon: "number-sign", group: "master-data" },
  { to: "/admin/departments", label: "Departments", icon: "org-chart", group: "master-data" },
  { to: "/admin/cost-centers", label: "Cost Centers", icon: "money-bills", group: "master-data" },
  { to: "/admin/sections", label: "Sections", icon: "customer-and-supplier", group: "master-data" },
  { to: "/admin/suppliers", label: "Vendors", icon: "supplier", group: "master-data" },
  { to: "/admin/supplier-part-profiles", label: "Vendor Part Profiles", icon: "attachment-html", group: "master-data" },
  { to: "/admin/barcode-templates", label: "Barcode Templates", icon: "bar-code", group: "master-data" },
  { to: "/admin/processes", label: "Processes", icon: "process", group: "engineering" },
  { to: "/admin/stations", label: "Stations", icon: "factory", group: "engineering" },
  { to: "/admin/bom", label: "BOM", icon: "list", group: "engineering" },
  { to: "/admin/templates", label: "Label Templates", icon: "measure", group: "engineering" },
  { to: "/admin/readiness", label: "Readiness Validator", icon: "survey", group: "engineering" },
  { to: "/admin/material-requests", label: "Material Requests", icon: "request", group: "operations" },
  { to: "/admin/inventory-do", label: "Delivery Orders (DO)", icon: "document", group: "operations" },
  { to: "/admin/vendor-pack-detail", label: "Vendor Pack Detail", icon: "customer-and-contacts", group: "operations" },
  { to: "/admin/inbound-packs", label: "Inbound Vendor Packs", icon: "shipping-status", group: "operations" },
  { to: "/admin/machines", label: "Machines", icon: "machine", group: "operations" },
  { to: "/admin/devices", label: "Devices", icon: "laptop", group: "operations" },
  { to: "/admin/recovery", label: "Set Recovery", icon: "wrench", group: "operations" },
  { to: "/admin/approvals", label: "Workflow Approvals", icon: "approvals", group: "governance" },
  { to: "/admin/heartbeat", label: "Device Heartbeat", icon: "heart", group: "governance" },
  { to: "/admin/system-health", label: "System Health", icon: "sys-monitor", group: "governance" },
  { to: "/admin/audit-logs", label: "Audit Logs", icon: "history", group: "governance" },
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
  { to: "/station/fg", label: "FG / Shipping", icon: "shipping-status" },
  { to: "/station/queue", icon: "sys-monitor", label: "Queue Monitor" },
  { to: "/station/material/request", icon: "request", label: "Prod Request", roles: ["PRODUCTION", "OPERATOR"] },
  { to: "/station/material/store", icon: "approvals", label: "Store Approvals", roles: ["STORE", "SUPERVISOR"] },
  { to: "/station/history", icon: "history", label: "Trace History" },
];

export const AppShell = memo(function AppShell({ mode }: { mode: "admin" | "station" }) {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const sideNavRef = useRef<SideNavigationDomRef>(null);

  // Filter navigation items based on role
  const nav =
    mode === "admin"
      ? adminNav
      : stationNav.filter((item) => {
          const neededRoles = (item as { roles?: string[] }).roles;
          if (!neededRoles?.length) return true;
          return neededRoles.some((role) => user?.roles?.includes(role));
        });

  // Manual selection sync to prevent "sticky" highlights without remounting
  useEffect(() => {
    if (!sideNavRef.current) return;

    const syncSelection = () => {
      const currentSideNav = sideNavRef.current;
      if (!currentSideNav) return;

      const normalizedPath = location.pathname.replace(/\/$/, "");
      
      // Select all navigation items and sub-items
      const items = Array.from(currentSideNav.querySelectorAll("ui5-side-navigation-item, ui5-side-navigation-sub-item"));
      
      items.forEach((item: any) => {
        const to = item.getAttribute("data-to") || "";
        const normalizedTo = to.replace(/\/$/, "");
        
        let shouldBeSelected = false;
        if (normalizedTo) {
          shouldBeSelected = normalizedTo === "/admin" 
            ? normalizedPath === "/admin" 
            : (normalizedPath === normalizedTo || normalizedPath.startsWith(normalizedTo + "/"));
        }

        // Parent items should not be 'selected' even if children are active,
        // mirroring the user's request for neutral group headers.
        if (item.tagName === "UI5-SIDE-NAVIGATION-ITEM" && item.children.length > 0) {
            shouldBeSelected = false;
        }

        // Force property update
        if (item.selected !== shouldBeSelected) {
            item.selected = shouldBeSelected;
        }
      });
    };

    // Run sync after DOM updates
    requestAnimationFrame(syncSelection);
  }, [location.pathname]);

  const isKioskLayout = mode === "station" && location.pathname === "/station/register";
  const navSections = [
    { key: "overview", title: "Overview", icon: "home" },
    { key: "master-data", title: "Master Data", icon: "grid" },
    { key: "engineering", title: "Engineering", icon: "wrench" },
    { key: "operations", title: "Operations", icon: "official-service" },
    { key: "governance", title: "Governance", icon: "key-user-settings" },
  ] as const;

  const handleLogoClick = () => {
    navigate(mode === "admin" ? "/admin" : "/station/login");
  };

  const handleMenuItemClick = (e: any) => {
    const item = e.detail.item;
    // Get the path from our custom data attribute
    const to = item.getAttribute("data-to");
    if (to) {
      navigate(to);
    } else {
        // Fallback to text matching
        const found = nav.find(n => n.label === item.text);
        if (found) navigate(found.to);
    }
  };

  // Search functionality
  const handleSearch = (query: string) => {
    if (!query.trim()) return;
    
    const lowerQuery = query.toLowerCase();
    const searchResult = nav.find(
      (item) =>
        item.label.toLowerCase().includes(lowerQuery) ||
        item.to.toLowerCase().includes(lowerQuery)
    );
    
    if (searchResult) {
      navigate(searchResult.to);
      setSearchValue("");
    }
  };
  
  if (isKioskLayout) {
    return <Outlet />;
  }

  return (
    <div 
      className={mode === "admin" ? "ui5-content-density-compact" : "ui5-content-density-cozy"}
      style={{ height: "100vh", display: "flex", flexDirection: "column" }}
    >
      <ShellBar
        logo={<img src="/logo.png" alt="MMI Logo" style={{ maxHeight: "1.5rem", marginRight: "0.5rem" }} />}
        primaryTitle={`Traceability System | ${mode === "admin" ? "Admin Console" : "Station Interface"}`}
        onLogoClick={handleLogoClick}
        searchField={
          <Input
            placeholder="Search pages..."
            value={searchValue}
            onInput={(e: any) => setSearchValue(e.target.value)}
            onKeyDown={(e: any) => {
              if (e.key === "Enter") {
                handleSearch(searchValue);
              }
            }}
            style={{
              maxWidth: "300px",
              backgroundColor: "var(--sapShell_Background)",
              color: "var(--sapShell_TextColor)",
              borderRadius: "4px",
              padding: "0.5rem",
              border: "1px solid var(--sapShell_BorderColor)",
            }}
            aria-label="Search navigation pages"
          />
        }
        profile={
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Button
              icon={theme === "sap_horizon" ? "dark-mode" : "light-mode"}
              design="Transparent"
              onClick={toggleTheme}
              title={theme === "sap_horizon" ? "Switch to Dark Mode" : "Switch to Light Mode"}
              aria-label={theme === "sap_horizon" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            />
            <Avatar
              id="shellbar-avatar"
              initials={user?.display_name?.[0] ?? "U"}
              colorScheme="Accent6"
              aria-label={`User profile: ${user?.display_name}`}
              style={{ cursor: "pointer" }}
              onClick={() => setProfileOpen(true)}
            />
          </div>
        }
        onProfileClick={() => setProfileOpen(true)}
      >
        <ShellBarSpacer />
        <ShellBarItem
          id="shellbar-notifications"
          icon="bell"
          text="Notifications"
          onClick={() => setNotificationsOpen(true)}
          aria-label="Open notifications"
        />
        <ShellBarItem icon="add" text="Quick Create" onClick={() => {/* quick create stub */}} aria-label="Quick create" />
      </ShellBar>
      
      <div style={{ display: "flex", flex: 1, overflow: "hidden", boxSizing: "border-box" }}>
        <SideNavigation
          ref={sideNavRef}
          collapsed={false}
          onSelectionChange={handleMenuItemClick}
          className={layouts.glassCard}
          style={{ 
            height: "100%", 
            minWidth: "280px", 
            margin: "0", 
            borderRadius: "0",
            borderTop: "none",
            borderBottom: "none",
            borderLeft: "none"
          }}
          aria-label="Main navigation menu"
        >
          {mode === "admin" ? (
             navSections.map(section => {
               const items = nav.filter(n => n.group === section.key);
               if (items.length === 0) return null;
               
               // Assign color based on section
               let sectionColor = "var(--icon-blue)";
               if (section.key === "master-data") sectionColor = "var(--icon-indigo)";
               if (section.key === "engineering") sectionColor = "var(--icon-orange)";
               if (section.key === "operations") sectionColor = "var(--icon-green)";
               if (section.key === "governance") sectionColor = "var(--icon-purple)";

               const normalizedPath = location.pathname.replace(/\/$/, "");

               return (
                 <SideNavigationItem 
                   key={section.key} 
                   text={section.title} 
                   icon={section.icon} 
                   expanded
                   selected={false}
                   className="nav-group-header"
                   style={{ "--sapContent_IconColor": sectionColor } as any}
                   aria-label={`${section.title} navigation section`}
                 >
                   {items.map(item => {
                     const normalizedTo = item.to.replace(/\/$/, "");
                     const isSelected = normalizedTo === "/admin" 
                       ? normalizedPath === "/admin" 
                       : (normalizedPath === normalizedTo || normalizedPath.startsWith(normalizedTo + "/"));
                       
                     return (
                       <SideNavigationSubItem 
                          key={item.to} 
                          id={`nav-sub-${item.to.replace(/\//g, '-').substring(1) || 'root'}`}
                          text={item.label} 
                          icon={item.icon}
                          style={{ "--sapContent_IconColor": sectionColor } as any}
                          selected={isSelected}
                          data-to={item.to}
                          aria-label={`Navigate to ${item.label}`}
                          aria-current={isSelected ? "page" : undefined}
                       />
                     );
                   })}
                 </SideNavigationItem>
               );
             })
          ) : (
            nav.map(item => {
              const isSelected = location.pathname === item.to;
              return (
                <SideNavigationItem
                  key={item.to}
                  id={`nav-item-${item.to.replace(/\//g, '-').substring(1)}`}
                  text={item.label}
                  icon={item.icon}
                  selected={isSelected}
                  data-to={item.to}
                  aria-label={`Navigate to ${item.label}`}
                  aria-current={isSelected ? "page" : undefined}
                />
              );
            })
          )}
          
          <SideNavigationItem 
            slot="fixedItems" 
            text="Sign Out" 
            icon="log" 
            onClick={logout}
            aria-label="Sign out of the system"
          />
        </SideNavigation>

        <div 
          className="page-container"
          style={{ 
            flex: 1, 
            overflow: "hidden", 
            position: "relative", 
            boxSizing: "border-box", 
            height: "100%",
            display: "grid",
            gridTemplateRows: "1fr",
            padding: "0" 
          }}
          role="main"
          aria-label="Main content area"
        >
          <Suspense
            fallback={
              <FlexBox
                style={{ width: "100%", height: "100%" }}
                alignItems={FlexBoxAlignItems.Center}
                direction={FlexBoxDirection.Column}
                justifyContent={FlexBoxJustifyContent.Center}
              >
                <BusyIndicator active delay={0} text="Loading page..." />
                <Text style={{ marginTop: "1rem", opacity: 0.6 }}>Preparing screen...</Text>
              </FlexBox>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </div>

      {/* Notifications Popover — UI5 */}
      <Popover
        open={notificationsOpen}
        opener="shellbar-notifications"
        placement="Bottom"
        onClose={() => setNotificationsOpen(false)}
        style={{ width: "320px" }}
        headerText="Notifications"
      >
        <List>
          <ListItemStandard
            description="System started successfully"
            icon="sys-monitor"
            additionalText="Just now"
            additionalTextState="Positive"
          >
            System Health OK
          </ListItemStandard>
          <ListItemStandard
            description="No pending approvals"
            icon="approvals"
            additionalText="Today"
          >
            Approvals
          </ListItemStandard>
        </List>
        <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid var(--sapContent_BorderColor)", textAlign: "center" }}>
          <Button design="Transparent" onClick={() => { setNotificationsOpen(false); navigate("/admin/system-health"); }}>
            View All
          </Button>
        </div>
      </Popover>

      {/* Profile Popover — UI5 */}
      <Popover
        open={profileOpen}
        opener="shellbar-avatar"
        placement="Bottom"
        onClose={() => setProfileOpen(false)}
        style={{ width: "240px" }}
      >
        <div style={{ padding: "1rem 1rem 0.75rem 1rem", borderBottom: "1px solid var(--sapContent_BorderColor)" }}>
          <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.75rem" }}>
            <Avatar initials={user?.display_name?.[0] ?? "U"} colorScheme="Accent6" size="S" />
            <div>
              <Text style={{ fontWeight: 600, fontSize: "0.9rem", display: "block" }}>{user?.display_name ?? "User"}</Text>
              <Label style={{ fontSize: "0.75rem", opacity: 0.65 }}>{(user?.roles ?? []).join(", ") || "No role"}</Label>
            </div>
          </FlexBox>
        </div>
        <List>
          <ListItemStandard icon="employee" onClick={() => { setProfileOpen(false); navigate("/admin/users"); }}>
            My Profile
          </ListItemStandard>
          <ListItemStandard icon="log" onClick={() => { setProfileOpen(false); logout(); }}>
            Sign Out
          </ListItemStandard>
        </List>
      </Popover>
    </div>
  );
});
