import type { MaterialRequestDetail } from "@traceability/sdk";
import {
  Document as PdfDocument,
  Image as PdfImage,
  Page as PdfPage,
  StyleSheet as PdfStyleSheet,
  Text as PdfText,
  View as PdfView,
  pdf as createPdf,
} from "@react-pdf/renderer";

const pdfStyles = PdfStyleSheet.create({
  page: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    fontSize: 9,
    color: "#1f2937",
  },
  headRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  logoBox: {
    width: 84,
    height: 44,
    borderWidth: 1,
    borderColor: "#9ca3af",
    paddingVertical: 4,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  logoImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  headTextWrap: {
    flex: 1,
    marginLeft: 10,
  },
  company: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 1,
  },
  subtitle: {
    fontSize: 8,
    color: "#4b5563",
  },
  title: {
    fontSize: 11,
    fontWeight: 700,
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#9ca3af",
    paddingVertical: 5,
    marginBottom: 8,
  },
  metaGrid: {
    borderWidth: 1,
    borderColor: "#9ca3af",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
  },
  metaCell: {
    flex: 1,
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: "#d1d5db",
  },
  metaCellLast: { borderRightWidth: 0 },
  metaLabel: {
    fontSize: 7,
    color: "#6b7280",
    marginBottom: 1,
  },
  metaValue: {
    fontSize: 8,
    fontWeight: 600,
  },
  table: {
    borderWidth: 1,
    borderColor: "#9ca3af",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerRow: {
    backgroundColor: "#f3f4f6",
  },
  th: {
    fontSize: 6.8,
    fontWeight: 700,
    paddingVertical: 3,
    paddingHorizontal: 2,
    borderRightWidth: 1,
    borderRightColor: "#d1d5db",
    textAlign: "center",
  },
  td: {
    fontSize: 7,
    paddingVertical: 3,
    paddingHorizontal: 2,
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
  },
  bold: { fontWeight: 700 },
  right: { textAlign: "right" },
  colItem: { width: "5%" },
  colType: { width: "6%" },
  colModel: { width: "12%" },
  colPart: { width: "10%" },
  colDesc: { width: "23%" },
  colDo: { width: "10%" },
  colVendor: { width: "8%" },
  colGr: { width: "7%" },
  colNet: { width: "5%" },
  colQty: { width: "6%" },
  colUom: { width: "4%" },
  colRemarks: { width: "10%" },
  colAction: { width: "4%", borderRightWidth: 0 },
  signatureWrap: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#9ca3af",
    marginTop: 4,
  },
  signatureCol: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: "#d1d5db",
  },
  signatureColLast: { borderRightWidth: 0 },
  signatureHead: {
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    padding: 4,
    fontSize: 7,
    fontWeight: 700,
  },
  signatureBody: { padding: 6, minHeight: 42, justifyContent: "space-between" },
  signLine: { fontSize: 8 },
});

function pdfDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

function StoreVoucherPdf({ detail, logoSrc }: { detail: MaterialRequestDetail; logoSrc: string }) {
  const rows = detail.items.flatMap((item) => {
    const allocations = item.issue_allocations ?? [];
    if (!allocations.length) {
      return [
        {
          itemNo: String(item.item_no ?? "-"),
          type: "REQ",
          model: detail.model_code || "-",
          part: item.part_number || "-",
          desc: item.description || "-",
          doNo: item.do_number || "-",
          vendor: "-",
          gr: "-",
          net: "-",
          qty: String(item.issued_qty ?? item.requested_qty ?? "-"),
          uom: item.uom || "PCS",
          remarks: item.remarks || "",
        },
      ];
    }
    return allocations.map((alloc, idx) => ({
      itemNo: `${item.item_no}.${idx + 1}`,
      type: "DO",
      model: detail.model_code || "-",
      part: item.part_number || "-",
      desc: item.description || "-",
      doNo: alloc.do_number || "-",
      vendor: alloc.vendor_name || alloc.supplier_name || "-",
      gr: String((alloc as any).gr_number ?? "-"),
      net: String((alloc as any).available_qty ?? "-"),
      qty: String(alloc.issued_qty ?? "-"),
      uom: item.uom || "PCS",
      remarks: alloc.remarks || "",
    }));
  });

  return (
    <PdfDocument>
      <PdfPage size="A4" style={pdfStyles.page} wrap>
        <PdfView style={pdfStyles.headRow}>
          <PdfView style={pdfStyles.logoBox}>
            <PdfImage src={logoSrc} style={pdfStyles.logoImage} />
          </PdfView>
          <PdfView style={pdfStyles.headTextWrap}>
            <PdfText style={pdfStyles.company}>MMI Precision Assembly (Thailand) Co., Ltd.</PdfText>
            <PdfText style={pdfStyles.subtitle}>
              888 Moo 1, Mittraphap Road, Tambon Naklang, Amphur Sungnoen, Nakornratchasima 30380 Thailand
            </PdfText>
            <PdfText style={pdfStyles.subtitle}>TEL : (6644) 000188 FAX : (6644) 000199</PdfText>
          </PdfView>
        </PdfView>
        <PdfText style={pdfStyles.title}>MATERIAL REQUEST ISSUE RECORD</PdfText>

        <PdfView style={pdfStyles.metaGrid}>
          <PdfView style={pdfStyles.metaRow}>
            <PdfView style={pdfStyles.metaCell}>
              <PdfText style={pdfStyles.metaLabel}>NO.</PdfText>
              <PdfText style={pdfStyles.metaValue}>{detail.request_no || "-"}</PdfText>
            </PdfView>
            <PdfView style={pdfStyles.metaCell}>
              <PdfText style={pdfStyles.metaLabel}>DMI. NO.</PdfText>
              <PdfText style={pdfStyles.metaValue}>{detail.dmi_no || "-"}</PdfText>
            </PdfView>
            <PdfView style={[pdfStyles.metaCell, pdfStyles.metaCellLast]}>
              <PdfText style={pdfStyles.metaLabel}>DATE</PdfText>
              <PdfText style={pdfStyles.metaValue}>{pdfDate(detail.request_date)}</PdfText>
            </PdfView>
          </PdfView>
          <PdfView style={[pdfStyles.metaRow, { borderBottomWidth: 0 }]}>
            <PdfView style={pdfStyles.metaCell}>
              <PdfText style={pdfStyles.metaLabel}>REQUESTOR</PdfText>
              <PdfText style={pdfStyles.metaValue}>{detail.requested_by_name || "-"}</PdfText>
            </PdfView>
            <PdfView style={pdfStyles.metaCell}>
              <PdfText style={pdfStyles.metaLabel}>SECTION</PdfText>
              <PdfText style={pdfStyles.metaValue}>{detail.section || "-"}</PdfText>
            </PdfView>
            <PdfView style={[pdfStyles.metaCell, pdfStyles.metaCellLast]}>
              <PdfText style={pdfStyles.metaLabel}>COST CENTER</PdfText>
              <PdfText style={pdfStyles.metaValue}>{detail.cost_center || "-"}</PdfText>
            </PdfView>
          </PdfView>
        </PdfView>

        <PdfView style={pdfStyles.table}>
          <PdfView style={[pdfStyles.row, pdfStyles.headerRow]}>
            <PdfText style={[pdfStyles.th, pdfStyles.colItem]}>ITEM</PdfText>
            <PdfText style={[pdfStyles.th, pdfStyles.colType]}>TYPE</PdfText>
            <PdfText style={[pdfStyles.th, pdfStyles.colModel]}>MODEL</PdfText>
            <PdfText style={[pdfStyles.th, pdfStyles.colPart]}>PART NO.</PdfText>
            <PdfText style={[pdfStyles.th, pdfStyles.colDesc]}>DESCRIPTION</PdfText>
            <PdfText style={[pdfStyles.th, pdfStyles.colDo]}>DO NO.</PdfText>
            <PdfText style={[pdfStyles.th, pdfStyles.colVendor]}>VENDOR</PdfText>
            <PdfText style={[pdfStyles.th, pdfStyles.colGr]}>GR NO.</PdfText>
            <PdfText style={[pdfStyles.th, pdfStyles.colNet]}>NET</PdfText>
            <PdfText style={[pdfStyles.th, pdfStyles.colQty]}>QTY</PdfText>
            <PdfText style={[pdfStyles.th, pdfStyles.colUom]}>UOM</PdfText>
            <PdfText style={[pdfStyles.th, pdfStyles.colRemarks]}>REMARKS</PdfText>
            <PdfText style={[pdfStyles.th, pdfStyles.colAction]}></PdfText>
          </PdfView>

          {rows.map((row, index) => (
            <PdfView key={`pdf-row-${index}`} style={pdfStyles.row} wrap={false}>
              <PdfText style={[pdfStyles.td, pdfStyles.colItem]}>{row.itemNo}</PdfText>
              <PdfText style={[pdfStyles.td, pdfStyles.colType]}>{row.type}</PdfText>
              <PdfText style={[pdfStyles.td, pdfStyles.colModel]}>{row.model}</PdfText>
              <PdfText style={[pdfStyles.td, pdfStyles.colPart]}>{row.part}</PdfText>
              <PdfText style={[pdfStyles.td, pdfStyles.colDesc]}>{row.desc}</PdfText>
              <PdfText style={[pdfStyles.td, pdfStyles.colDo]}>{row.doNo}</PdfText>
              <PdfText style={[pdfStyles.td, pdfStyles.colVendor]}>{row.vendor}</PdfText>
              <PdfText style={[pdfStyles.td, pdfStyles.colGr]}>{row.gr}</PdfText>
              <PdfText style={[pdfStyles.td, pdfStyles.colNet]}>{row.net}</PdfText>
              <PdfText style={[pdfStyles.td, pdfStyles.colQty, pdfStyles.bold, pdfStyles.right]}>{row.qty}</PdfText>
              <PdfText style={[pdfStyles.td, pdfStyles.colUom]}>{row.uom}</PdfText>
              <PdfText style={[pdfStyles.td, pdfStyles.colRemarks]}>{row.remarks || "-"}</PdfText>
              <PdfText style={[pdfStyles.td, pdfStyles.colAction]}></PdfText>
            </PdfView>
          ))}
        </PdfView>

        <PdfView style={pdfStyles.signatureWrap} wrap={false}>
          <PdfView style={pdfStyles.signatureCol}>
            <PdfText style={pdfStyles.signatureHead}>ISSUED BY</PdfText>
            <PdfView style={pdfStyles.signatureBody}>
              <PdfText style={pdfStyles.signLine}>NAME : {detail.issued_by_name || "—"}</PdfText>
              <PdfText style={pdfStyles.signLine}>DATE : {pdfDate(detail.issued_at)}</PdfText>
            </PdfView>
          </PdfView>
          <PdfView style={[pdfStyles.signatureCol, pdfStyles.signatureColLast]}>
            <PdfText style={pdfStyles.signatureHead}>RECEIVED BY</PdfText>
            <PdfView style={pdfStyles.signatureBody}>
              <PdfText style={pdfStyles.signLine}>NAME : {detail.received_by_name || "—"}</PdfText>
              <PdfText style={pdfStyles.signLine}>DATE : {pdfDate(detail.received_at)}</PdfText>
            </PdfView>
          </PdfView>
        </PdfView>
      </PdfPage>
    </PdfDocument>
  );
}

export async function downloadStoreMaterialRequestIssuePdf(detail: MaterialRequestDetail, logoSrc: string) {
  const blob = await createPdf(<StoreVoucherPdf detail={detail} logoSrc={logoSrc} />).toBlob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${detail.request_no || "material-request"}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}
