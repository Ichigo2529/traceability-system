import fs from "fs";
import path from "path";

// Files that had errors
const filesToFix = [
  "web/apps/admin/src/pages/admin/ApprovalsPage.tsx",
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

function fixClosingTags(filePath: string) {
  const fullPath = path.join("d:\\Project\\Traceability-system", filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ Not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, "utf-8");
  const original = content;

  // Find the return statement with <PageStack>
  const returnRegex = /return\s*\(\s*<PageStack>/;
  const returnMatch = content.match(returnRegex);
  
  if (!returnMatch) {
    console.log(`⚠️  No PageStack found: ${filePath}`);
    return false;
  }

  // Find the start position of <PageStack>
  const pageStackStart = content.indexOf("<PageStack>");
  
  if (pageStackStart === -1) {
    console.log(`⚠️  Could not find <PageStack>: ${filePath}`);
    return false;
  }

  // Count nested divs after the PageStack opening tag to find the correct closing div
  let pos = pageStackStart + "<PageStack>".length;
  let divDepth = 0;
  let foundClosingDiv = -1;

  while (pos < content.length) {
    // Look for <div or </div>
    const nextOpenDiv = content.indexOf("<div", pos);
    const nextCloseDiv = content.indexOf("</div>", pos);

    if (nextCloseDiv === -1) break;

    if (nextOpenDiv !== -1 && nextOpenDiv < nextCloseDiv) {
      // Found an opening div first
      divDepth++;
      pos = nextOpenDiv + 4;
    } else {
      // Found a closing div
      if (divDepth === 0) {
        foundClosingDiv = nextCloseDiv;
        break;
      }
      divDepth--;
      pos = nextCloseDiv + 6;
    }
  }

  if (foundClosingDiv !== -1) {
    // Replace </div> with </PageStack>
    const before = content.substring(0, foundClosingDiv);
    const after = content.substring(foundClosingDiv + 6);
    content = before + "</PageStack>" + after.replace(/^/, "");

    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  } else {
    console.log(`⚠️  Could not find closing div: ${filePath}`);
    return false;
  }
}

// Run fix
console.log(`Fixing ${filesToFix.length} files...\n`);

let fixed = 0;
for (const file of filesToFix) {
  if (fixClosingTags(file)) {
    fixed++;
  }
}

console.log(`\n✅ Fix complete: ${fixed}/${filesToFix.length} files fixed`);
