import fs from "fs";
import path from "path";

// Files to migrate (from grep results)
const filesToMigrate = [
  "web/apps/admin/src/pages/admin/BarcodeTemplatesPage.tsx",
  "web/apps/admin/src/pages/admin/ComponentTypesPage.tsx",
  "web/apps/admin/src/pages/admin/DepartmentsPage.tsx",
  "web/apps/admin/src/pages/admin/DevicesPage.tsx",
  "web/apps/admin/src/pages/admin/InboundPacksPage.tsx",
  "web/apps/admin/src/pages/admin/MaterialRequestsPage.tsx",
  "web/apps/admin/src/pages/admin/ModelsPage.tsx",
  "web/apps/admin/src/pages/admin/PartNumbersPage.tsx",
  "web/apps/admin/src/pages/admin/ProcessesPage.tsx",
  "web/apps/admin/src/pages/admin/RolesPage.tsx",
  "web/apps/admin/src/pages/admin/StationsPage.tsx",
  "web/apps/admin/src/pages/admin/SupplierPartProfilesPage.tsx",
  "web/apps/admin/src/pages/admin/SuppliersPage.tsx",
  "web/apps/admin/src/pages/admin/UsersPage.tsx",
  "web/apps/admin/src/pages/AuditLogsPage.tsx",
  "web/apps/admin/src/pages/DevicesPage.tsx",
  "web/apps/admin/src/pages/HeartbeatMonitorPage.tsx",
  "web/apps/admin/src/pages/LabelTemplatesPage.tsx",
  "web/apps/admin/src/pages/MachinesPage.tsx",
  "web/apps/admin/src/pages/ModelDetailsPage.tsx",
  "web/apps/admin/src/pages/ModelsPage.tsx",
  "web/apps/admin/src/pages/RevisionDetailsPage.tsx",
  "web/apps/admin/src/pages/station/BondingStationPage.tsx",
  "web/apps/admin/src/pages/station/FgStationPage.tsx",
  "web/apps/admin/src/pages/station/JiggingStationPage.tsx",
  "web/apps/admin/src/pages/station/LabelStationPage.tsx",
  "web/apps/admin/src/pages/station/MagnetizeFluxStationPage.tsx",
  "web/apps/admin/src/pages/station/OperatorLoginPage.tsx",
  "web/apps/admin/src/pages/station/PackingStationPage.tsx",
  "web/apps/admin/src/pages/station/ProductionMaterialRequestPage.tsx",
  "web/apps/admin/src/pages/station/QueueMonitorPage.tsx",
  "web/apps/admin/src/pages/station/ScanStationPage.tsx",
  "web/apps/admin/src/pages/station/StationHistoryPage.tsx",
  "web/apps/admin/src/pages/station/StoreMaterialApprovalPage.tsx",
  "web/apps/admin/src/pages/UsersPage.tsx",
];

function migrateFile(filePath: string) {
  const fullPath = path.join("d:\\Project\\Traceability-system", filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ Not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, "utf-8");
  const original = content;

  // Check if already has PageStack import
  if (!content.includes("from \"@traceability/ui\"")) {
    // Find the import section and add PageStack import after other imports
    const importMatch = content.match(/(import\s+{\s*[^}]+\s*}\s+from\s+[^;]+;)/);
    if (importMatch) {
      // Add PageStack import after the last import statement before JSX
      const lastImportMatch = content.lastIndexOf("import ");
      const lastImportEnd = content.indexOf(";", lastImportMatch) + 1;
      const beforeImports = content.substring(0, lastImportEnd);
      const afterImports = content.substring(lastImportEnd);
      
      content = beforeImports + '\nimport { PageStack } from "@traceability/ui";' + afterImports;
    }
  }

  // Replace the wrapper div with PageStack
  // Find <div className="admin-page-stack"> and replace with <PageStack>
  content = content.replace(
    /<div\s+className=["']admin-page-stack["']\s*>/g,
    "<PageStack>"
  );

  // Find the corresponding closing </div> and replace with </PageStack>
  // This is tricky - we need to find the matching closing tag
  // For now, let's do a simple replacement that works for most files
  // (Find </div> at the end of the component return, before the closing brace)
  
  // Look for pattern: </div>\n  );\n}
  content = content.replace(
    /(\s+)<\/div>\s*\n(\s+)\);\s*\n(\s*)\}/g,
    (match, space1, space2, space3) => {
      // Only replace if this looks like the end of the main component
      // Check if there are function definitions after this
      const restOfFile = content.substring(content.indexOf(match) + match.length);
      if (restOfFile.trim().startsWith("function ") || restOfFile.trim().startsWith("export function")) {
        return `${space1}</PageStack>\n${space2});\n${space3}}`;
      }
      return match;
    }
  );

  if (content !== original) {
    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`✅ Migrated: ${filePath}`);
    return true;
  } else {
    console.log(`⚠️  No changes: ${filePath}`);
    return false;
  }
}

// Run migration
console.log(`Starting migration of ${filesToMigrate.length} files...\n`);

let migrated = 0;
for (const file of filesToMigrate) {
  if (migrateFile(file)) {
    migrated++;
  }
}

console.log(`\n✅ Migration complete: ${migrated}/${filesToMigrate.length} files updated`);
