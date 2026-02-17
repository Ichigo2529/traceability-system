import fs from "fs";
import path from "path";

// Files with nested PageStack that should be divs
const filesToFix = [
  "web/apps/admin/src/pages/admin/MaterialRequestsPage.tsx",
  "web/apps/admin/src/pages/AuditLogsPage.tsx",
  "web/apps/admin/src/pages/station/ProductionMaterialRequestPage.tsx",
  "web/apps/admin/src/pages/station/StoreMaterialApprovalPage.tsx",
];

function fixNestedPageStack(filePath: string) {
  const fullPath = path.join("d:\\Project\\Traceability-system", filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ Not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, "utf-8");
  const original = content;

  // Find all occurrences of <PageStack> but not the first one (main component)
  // For now, let's replace <PageStack> that appear after we're already in a PageStack with <div className="admin-page-stack">
  
  // Strategy: Find the main return with <PageStack>, then find any <PageStack> after that but before the closing
  // and replace them with div
  
  const returnIdx = content.indexOf("return (");
  if (returnIdx === -1) {
    console.log(`⚠️  No return found: ${filePath}`);
    return false;
  }

  // Find the first <PageStack> after return
  const firstPageStackIdx = content.indexOf("<PageStack>", returnIdx);
  if (firstPageStackIdx === -1) {
    console.log(`⚠️  No <PageStack> found: ${filePath}`);
    return false;
  }

  // Find the last </PageStack> 
  const lastPageStackEndIdx = content.lastIndexOf("</PageStack>");
  if (lastPageStackEndIdx === -1) {
    console.log(`⚠️  No closing </PageStack> found: ${filePath}`);
    return false;
  }

  // Now find all <PageStack> between the first and last, and convert them to divs
  let searchIdx = firstPageStackIdx + "<PageStack>".length;
  while (searchIdx < lastPageStackEndIdx) {
    const nextPageStack = content.indexOf("<PageStack>", searchIdx);
    if (nextPageStack === -1 || nextPageStack >= lastPageStackEndIdx) break;

    // Replace this <PageStack> with <div className="admin-page-stack">
    const before = content.substring(0, nextPageStack);
    const after = content.substring(nextPageStack + "<PageStack>".length);
    content = before + '<div className="admin-page-stack">' + after;

    // Now find the corresponding </PageStack> and replace with </div>
    // We need to be careful about nesting here too
    const nextPageStackEnd = content.indexOf("</PageStack>", nextPageStack + '<div className="admin-page-stack">'.length);
    if (nextPageStackEnd !== -1) {
      const before2 = content.substring(0, nextPageStackEnd);
      const after2 = content.substring(nextPageStackEnd + "</PageStack>".length);
      content = before2 + "</div>" + after2;
      searchIdx = nextPageStackEnd + "</div>".length;
    } else {
      break;
    }
  }

  if (content !== original) {
    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`✅ Fixed nested PageStack: ${filePath}`);
    return true;
  } else {
    console.log(`⚠️  No changes: ${filePath}`);
    return false;
  }
}

// Run fix
console.log(`Fixing nested PageStack in ${filesToFix.length} files...\n`);

let fixed = 0;
for (const file of filesToFix) {
  if (fixNestedPageStack(file)) {
    fixed++;
  }
}

console.log(`\n✅ Fix complete: ${fixed}/${filesToFix.length} files fixed`);
