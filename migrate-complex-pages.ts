import fs from "fs";
import path from "path";

const filesToMigrate = [
  "web/apps/admin/src/pages/admin/MaterialRequestsPage.tsx",
  "web/apps/admin/src/pages/station/ProductionMaterialRequestPage.tsx",
  "web/apps/admin/src/pages/station/StoreMaterialApprovalPage.tsx",
];

function migrateFileCarefully(filePath: string) {
  const fullPath = path.join("d:\\Project\\Traceability-system", filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ Not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, "utf-8");
  const original = content;

  // Add import if not present
  if (!content.includes('from "@traceability/ui"')) {
    const lastImportIdx = content.lastIndexOf("import ");
    if (lastImportIdx !== -1) {
      const lastImportEnd = content.indexOf(";", lastImportIdx) + 1;
      const before = content.substring(0, lastImportEnd);
      const after = content.substring(lastImportEnd);
      content = before + '\nimport { PageStack } from "@traceability/ui";' + after;
    }
  }

  // Find the main export default or export function
  const exportIdx = content.search(/export\s+(default\s+)?function/);
  if (exportIdx === -1) {
    console.log(`⚠️  No export function found: ${filePath}`);
    return false;
  }

  // Find the FIRST <div className="admin-page-stack"> after export
  const firstPageStackIdx = content.indexOf('<div className="admin-page-stack">', exportIdx);
  if (firstPageStackIdx === -1) {
    console.log(`⚠️  No admin-page-stack found: ${filePath}`);
    return false;
  }

  // Replace it with <PageStack>
  const before = content.substring(0, firstPageStackIdx);
  const after = content.substring(firstPageStackIdx + '<div className="admin-page-stack">'.length);
  content = before + "<PageStack>" + after;

  // Now find the matching closing tag by counting nested divs
  let pos = firstPageStackIdx + "<PageStack>".length;
  let divDepth = 0;
  let foundClosingIdx = -1;

  while (pos < content.length) {
    const nextOpenDiv = content.indexOf("<div", pos);
    const nextCloseDiv = content.indexOf("</div>", pos);

    if (nextCloseDiv === -1) break;

    if (nextOpenDiv !== -1 && nextOpenDiv < nextCloseDiv) {
      divDepth++;
      pos = nextOpenDiv + 4;
    } else {
      if (divDepth === 0) {
        foundClosingIdx = nextCloseDiv;
        break;
      }
      divDepth--;
      pos = nextCloseDiv + 6;
    }
  }

  if (foundClosingIdx !== -1) {
    const before2 = content.substring(0, foundClosingIdx);
    const after2 = content.substring(foundClosingIdx + 6);
    content = before2 + "</PageStack>" + after2;

    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`✅ Migrated: ${filePath}`);
    return true;
  } else {
    console.log(`⚠️  Could not find matching close: ${filePath}`);
    return false;
  }
}

console.log(`Carefully migrating ${filesToMigrate.length} complex files...\n`);

let migrated = 0;
for (const file of filesToMigrate) {
  if (migrateFileCarefully(file)) {
    migrated++;
  }
}

console.log(`\n✅ Migration complete: ${migrated}/${filesToMigrate.length} files`);
