import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMaterialQueryKeys,
  getMaterialIssueOptions,
  getMaterialRequestById,
  getMaterialRequests,
  getPendingMaterialRequests,
  issueMaterialRequestWithAllocation,
  rejectMaterialRequest,
} from "@traceability/material";
import { MaterialRequestDetail } from "@traceability/sdk";
import { MaterialRequestListTable } from "@traceability/material-ui";
import { PageLayout, ConfirmDialog } from "@traceability/ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Printer } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { MaterialRequestVoucherView } from "../../components/material/MaterialRequestVoucherView";
import { useIssueAllocationWorkbench } from "../../hooks/useIssueAllocationWorkbench";
import { useMaterialRequestsRealtime } from "../../hooks/useMaterialRequestsRealtime";
import { formatDateTime } from "../../lib/datetime";
import { toast } from "sonner";
import {
  Document as PdfDocument,
  Image as PdfImage,
  Page as PdfPage,
  StyleSheet as PdfStyleSheet,
  Text as PdfText,
  View as PdfView,
  pdf as createPdf,
} from "@react-pdf/renderer";

type TabKey = "PENDING" | "HISTORY";
const WORKFLOW_STEPS = [
  { key: "requested", label: "Requested", sub: "Production" },
  { key: "approved", label: "Approved", sub: "Store" },
  { key: "dispatched", label: "Dispatched", sub: "Store -> Forklift" },
  { key: "issued", label: "Issued", sub: "Forklift" },
  { key: "prod_ack", label: "Prod. ACK", sub: "Production" },
  { key: "fork_ack", label: "Forklift ACK", sub: "Forklift" },
];

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
        <PdfText style={pdfStyles.title}>DIRECT MATERIAL ISSUE VOUCHER</PdfText>

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

export function StoreMaterialApprovalPage() {
  const { hasRole } = useAuth();
  const canUsePage = hasRole("STORE") || hasRole("SUPERVISOR");
  const queryClient = useQueryClient();
  const keys = createMaterialQueryKeys("store");
  const [tab, setTab] = useState<TabKey>("PENDING");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmIssueOpen, setConfirmIssueOpen] = useState(false);
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const pendingQuery = useQuery({
    queryKey: keys.pendingRequests(),
    queryFn: async () => {
      // Keep compatibility when /pending endpoint is inconsistent by falling back to status filter.
      const pending = await getPendingMaterialRequests();
      if (Array.isArray(pending) && pending.length > 0) return pending;
      const all = await getMaterialRequests();
      return (all ?? []).filter((row) => row.status === "REQUESTED" || row.status === "APPROVED");
    },
    enabled: canUsePage,
  });
  const historyQuery = useQuery({
    queryKey: keys.requests(),
    queryFn: () => getMaterialRequests(),
    enabled: canUsePage,
  });

  useMaterialRequestsRealtime({
    enabled: canUsePage,
    queryKeys: [keys.pendingRequests(), keys.requests(), keys.request(selectedId), keys.issueOptions(selectedId)],
  });

  const detailsQuery = useQuery({
    queryKey: keys.request(selectedId),
    queryFn: () => getMaterialRequestById(selectedId!),
    enabled: Boolean(selectedId),
  });
  const issueOptionsQuery = useQuery({
    queryKey: keys.issueOptions(selectedId),
    queryFn: () => getMaterialIssueOptions(selectedId!),
    enabled:
      Boolean(selectedId) && (detailsQuery.data?.status === "REQUESTED" || detailsQuery.data?.status === "APPROVED"),
  });
  const workbench = useIssueAllocationWorkbench(issueOptionsQuery.data);

  useEffect(() => {
    if (!selectedId && (workbench.manualAllocations.length > 0 || workbench.issueRemarks)) {
      workbench.reset();
    }
  }, [selectedId, workbench.manualAllocations.length, workbench.issueRemarks, workbench.reset]);

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectMaterialRequest(id, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.pendingRequests() });
      await queryClient.invalidateQueries({ queryKey: keys.requests() });
      await queryClient.invalidateQueries({ queryKey: keys.request(selectedId) });
    },
  });
  const issueMutation = useMutation<
    { id: string; status: string; alert_status?: string },
    any,
    { id: string; remarks?: string }
  >({
    mutationFn: ({ id, remarks }: { id: string; remarks?: string }) =>
      issueMaterialRequestWithAllocation(id, {
        remarks,
        allocations: workbench.buildAllocationsPayload(),
      }),
    onSuccess: async (result, vars) => {
      setConfirmIssueOpen(false);
      const reqNo = detailsQuery.data?.request_no ?? vars.id;
      const statusText = result.alert_status ? ` Email: ${result.alert_status}.` : "";
      const message = `Request ${reqNo} has been issued successfully.${statusText}`;
      setActionNotice(message);
      toast.success(`Request ${reqNo} issued successfully`);
      await queryClient.invalidateQueries({ queryKey: keys.pendingRequests() });
      await queryClient.invalidateQueries({ queryKey: keys.requests() });
      await queryClient.invalidateQueries({ queryKey: keys.request(selectedId) });
      await queryClient.invalidateQueries({ queryKey: keys.issueOptions(selectedId) });
    },
  });

  if (!canUsePage) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Role Access Denied. Requires STORE or SUPERVISOR role.</AlertDescription>
      </Alert>
    );
  }

  const showingDetail = Boolean(selectedId);
  const detail = detailsQuery.data;
  const isTerminalStatus =
    detail?.status === "ISSUED" || detail?.status === "REJECTED" || detail?.status === "CANCELLED";
  const workflowStepsDone = (() => {
    if (!detail) return [false, false, false, false, false, false];
    const approved = ["APPROVED", "ISSUED"].includes(detail.status ?? "") || Boolean((detail as any).dispatched_at);
    const dispatched = Boolean((detail as any).dispatched_at);
    const issued = detail.status === "ISSUED" || Boolean((detail as any).production_ack_at);
    const prodAck = Boolean((detail as any).production_ack_at);
    const forkliftAck = Boolean((detail as any).forklift_ack_at);
    return [true, approved, dispatched, issued, prodAck, forkliftAck];
  })();
  const firstIncompleteIdx =
    detail?.status === "REJECTED" || detail?.status === "CANCELLED" ? -1 : workflowStepsDone.findIndex((d) => !d);

  const handleGeneratePdf = async () => {
    if (!detail || detail.status !== "ISSUED") return;

    try {
      setIsGeneratingPdf(true);
      const logoSrc = `${window.location.origin}/logo.png`;
      const blob = await createPdf(<StoreVoucherPdf detail={detail} logoSrc={logoSrc} />).toBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${detail.request_no || "material-request"}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("PDF generated successfully");
    } catch (error) {
      console.error("Failed to generate PDF", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <PageLayout
      title={showingDetail ? (detailsQuery.data?.request_no ?? "Request Detail") : "Store Material Approval"}
      subtitle={
        <div className="flex items-center gap-2">
          <span className="indicator-live" />
          <span>Shared issue material flow</span>
        </div>
      }
      icon="request"
      iconColor="blue"
      showBackButton={showingDetail}
      onBackClick={() => setSelectedId(null)}
      headerActions={
        showingDetail ? (
          <div className="flex items-center gap-2">
            {detailsQuery.data?.status === "ISSUED" && (
              <Button
                variant="ghost"
                size="sm"
                className="no-print"
                onClick={handleGeneratePdf}
                disabled={isGeneratingPdf}
              >
                <Printer className="h-4 w-4 mr-2" />
                {isGeneratingPdf ? "Generating PDF..." : "Print Form (PDF)"}
              </Button>
            )}
            {detailsQuery.data?.status === "REQUESTED" && (
              <Button
                variant="destructive"
                onClick={() => setConfirmRejectOpen(true)}
                disabled={rejectMutation.isPending || issueMutation.isPending}
              >
                Reject
              </Button>
            )}
            {(detailsQuery.data?.status === "REQUESTED" || detailsQuery.data?.status === "APPROVED") && (
              <Button
                onClick={() => setConfirmIssueOpen(true)}
                disabled={Boolean(
                  workbench.issueValidationError || issueOptionsQuery.isLoading || issueMutation.isPending
                )}
              >
                {detailsQuery.data?.status === "REQUESTED" ? "Approve & Issue" : "Issue"}
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      <div
        className="page-container motion-safe:animate-fade-in"
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        {showingDetail ? (
          detailsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div
                className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
                aria-hidden
              />
              <span className="ml-2 text-sm text-muted-foreground">Loading details...</span>
            </div>
          ) : detail ? (
            <>
              {actionNotice && (
                <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
                  <AlertDescription>{actionNotice}</AlertDescription>
                </Alert>
              )}
              <MaterialRequestVoucherView
                detail={detail}
                workbench={workbench}
                showIssueOptions={detail.status === "REQUESTED" || detail.status === "APPROVED"}
                hideTopBarActions
              />

              <div className="no-print rounded-lg border bg-card p-4">
                <h6 className="mb-3 font-semibold">Request Workflow</h6>
                <div className="flex items-start overflow-x-auto pb-2">
                  {WORKFLOW_STEPS.map((step, idx) => {
                    const done = workflowStepsDone[idx];
                    const active = idx === firstIncompleteIdx;
                    const circleColor = done
                      ? "var(--sapPositiveColor)"
                      : active
                        ? "var(--sapHighlightColor)"
                        : "var(--sapNeutralBorderColor)";
                    return (
                      <div key={step.key} className="flex items-start flex-1 min-w-[80px] last:flex-none">
                        <div className="flex flex-col items-center min-w-[80px]">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                            style={{ background: circleColor }}
                          >
                            {done ? "✓" : idx + 1}
                          </div>
                          <span className="text-[0.72rem] text-center mt-1">{step.label}</span>
                          <span className="text-[0.65rem] text-muted-foreground text-center">{step.sub}</span>
                          {active && <span className="text-xs font-medium text-destructive mt-0.5">Pending</span>}
                        </div>
                        {idx < WORKFLOW_STEPS.length - 1 && (
                          <div
                            className="flex-1 h-0.5 mt-4 min-w-2"
                            style={{ background: done ? "var(--sapPositiveColor)" : "var(--sapNeutralBorderColor)" }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                {!isTerminalStatus && (
                  <Alert className="mt-2">
                    <AlertDescription>
                      Current status: {detail.status}. Next step is highlighted as Pending.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </>
          ) : (
            <Alert variant="destructive">
              <AlertDescription>Unable to load request details.</AlertDescription>
            </Alert>
          )
        ) : (
          <div>
            <div className="flex gap-1 border-b mb-4">
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === "PENDING"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTab("PENDING")}
                data-key="PENDING"
              >
                Waiting Approval
              </button>
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === "HISTORY"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTab("HISTORY")}
                data-key="HISTORY"
              >
                History
              </button>
            </div>
            {tab === "PENDING" && (
              <div className="pt-2">
                <MaterialRequestListTable
                  data={pendingQuery.data ?? []}
                  loading={pendingQuery.isLoading}
                  onView={(id) => setSelectedId(id)}
                  formatDateTime={(s) => formatDateTime(s ?? "")}
                  filterPlaceholder="Search waiting requests..."
                />
              </div>
            )}
            {tab === "HISTORY" && (
              <div className="pt-2">
                <MaterialRequestListTable
                  data={historyQuery.data ?? []}
                  loading={historyQuery.isLoading}
                  onView={(id) => setSelectedId(id)}
                  formatDateTime={(s) => formatDateTime(s ?? "")}
                  filterPlaceholder="Search history..."
                />
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmIssueOpen}
        title="Confirm Issue"
        description={`Are you sure you want to issue ${workbench.manualAllocations.length} allocation lines?`}
        confirmText="Issue"
        submitting={issueMutation.isPending}
        onCancel={() => setConfirmIssueOpen(false)}
        onConfirm={() => {
          if (!detailsQuery.data) return;
          issueMutation.mutate({ id: detailsQuery.data.id, remarks: workbench.issueRemarks || undefined });
        }}
      />

      <ConfirmDialog
        open={confirmRejectOpen}
        title="Confirm Reject"
        description="Reject this material request?"
        destructive
        confirmText="Reject Request"
        submitting={rejectMutation.isPending}
        onCancel={() => setConfirmRejectOpen(false)}
        onConfirm={() => {
          if (!detailsQuery.data) return;
          rejectMutation.mutate({ id: detailsQuery.data.id, reason: rejectReason.trim() || undefined });
          setConfirmRejectOpen(false);
          setRejectReason("");
        }}
      >
        <div className="flex flex-col gap-2 mt-3">
          <Label className="text-sm font-semibold">Reason for rejection</Label>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>
      </ConfirmDialog>
    </PageLayout>
  );
}
