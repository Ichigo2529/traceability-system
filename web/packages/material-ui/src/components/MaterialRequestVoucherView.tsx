import { MaterialRequestDetail } from "@traceability/sdk";
import { useIssueAllocationWorkbench } from "@traceability/material";
import { StatusBadge } from "@traceability/ui";

const BORDER = "1px solid var(--sapGroup_ContentBorderColor)";

function defaultFormatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

function defaultFormatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function FieldBox({
  label,
  value,
  highlight = false,
  style,
}: {
  label: string;
  value?: string | null;
  highlight?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ padding: "0.35rem 0.75rem", ...style }}>
      <div
        style={{
          fontSize: "0.68rem",
          color: "var(--sapContent_LabelColor)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: "0.15rem",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontWeight: highlight ? "700" : "normal",
          color: highlight ? "var(--sapNegativeElementColor)" : "var(--sapTextColor)",
          fontSize: "0.875rem",
        }}
      >
        {value || "-"}
      </div>
    </div>
  );
}

const btnBase: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  border: "1px solid var(--sapField_BorderColor)",
  borderRadius: "4px",
  background: "transparent",
  cursor: "pointer",
  fontSize: "0.875rem",
};
const inputBase: React.CSSProperties = {
  width: "100%",
  padding: "0.35rem 0.5rem",
  borderRadius: "4px",
  border: "1px solid var(--sapField_BorderColor)",
  fontSize: "0.875rem",
};
const selectBase: React.CSSProperties = {
  width: "100%",
  padding: "0.35rem 0.5rem",
  borderRadius: "4px",
  border: "1px solid var(--sapField_BorderColor)",
  fontSize: "0.875rem",
};

export function MaterialRequestVoucherView({
  detail,
  onBack,
  workbench,
  showIssueOptions,
  hideTopBarActions,
  hideIssueTotalsBeforeIssued = false,
  formatDate = defaultFormatDate,
  formatDateTime = defaultFormatDateTime,
  handoverBatchNo,
}: {
  detail: MaterialRequestDetail;
  onBack?: () => void;
  workbench?: ReturnType<typeof useIssueAllocationWorkbench>;
  showIssueOptions?: boolean;
  hideTopBarActions?: boolean;
  hideIssueTotalsBeforeIssued?: boolean;
  formatDate?: (value?: string | null) => string;
  formatDateTime?: (value?: string | null) => string;
  handoverBatchNo?: string | null;
}) {
  const isIssuedCompleted =
    detail.status === "ISSUED" ||
    Boolean(detail.issued_at) ||
    detail.items.some((item) => (item.issue_allocations?.length ?? 0) > 0 || Number(item.issued_qty ?? 0) > 0);
  const shouldShowIssueTotals = !hideIssueTotalsBeforeIssued || isIssuedCompleted;

  return (
    <div
      className="material-voucher"
      style={{
        padding: "1.5rem",
        background: "var(--sapGroup_ContentBackground)",
        border: BORDER,
        borderRadius: "var(--sapElement_BorderCornerRadius)",
        width: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "0",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          width: "100%",
          paddingBottom: "1.25rem",
        }}
      >
        <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
          <img src="/logo.png" alt="MMI Logo" style={{ height: "4rem", width: "auto", objectFit: "contain" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
            <h4 style={{ fontStyle: "italic", margin: 0, color: "var(--sapTextColor)", fontSize: "1rem" }}>
              MMI Precision Assembly (Thailand) Co., Ltd.
            </h4>
            <span style={{ fontSize: "0.8rem", color: "var(--sapContent_LabelColor)" }}>
              888 Moo 1, Mittraphap Road, Tambon Naklang, Amphur Sungnoen, Nakornratchasima 30380 Thailand
            </span>
            <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.1rem" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--sapContent_LabelColor)" }}>TEL : (6644) 000188</span>
              <span style={{ fontSize: "0.8rem", color: "var(--sapContent_LabelColor)" }}>FAX : (6644) 000199</span>
            </div>
          </div>
        </div>

        {hideTopBarActions ? (
          <StatusBadge status={detail.status} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} className="no-print">
            {onBack && (
              <button type="button" onClick={onBack} style={btnBase}>
                Back
              </button>
            )}
            <StatusBadge status={detail.status} />
            {detail.status === "ISSUED" && (
              <button type="button" onClick={() => window.print()} style={btnBase} title="Print Voucher">
                Print
              </button>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          textAlign: "center",
          background: "var(--sapGroup_TitleBackground)",
          border: BORDER,
          borderRadius: "4px",
          padding: "0.6rem 1rem",
          marginBottom: "1rem",
        }}
      >
        <h4 style={{ margin: 0, letterSpacing: "0.12em", fontWeight: "700", fontSize: "1rem" }}>
          DIRECT MATERIAL ISSUE VOUCHER
        </h4>
      </div>

      <div style={{ border: BORDER, borderRadius: "4px", overflow: "hidden", marginBottom: "1.25rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderBottom: BORDER }}>
          <FieldBox label="NO." value={detail.request_no} highlight />
          <FieldBox label="DMI. NO." value={detail.dmi_no} highlight />
          <FieldBox label="DATE" value={formatDate(detail.request_date)} />
          <div />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          <FieldBox label="REQUESTOR" value={detail.requested_by_name} />
          <FieldBox label="DEPARTMENT" value={detail.request_department_name} />
          <FieldBox label="SECTION" value={detail.section} />
          <FieldBox label="COST CENTER" value={detail.cost_center} />
        </div>
      </div>

      {(handoverBatchNo || detail.handover_batch_no) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            border: BORDER,
            borderRadius: "4px",
            padding: "0.75rem 1rem",
            marginBottom: "1.25rem",
            background: "var(--sapInformationBackground, #e8f0fe)",
          }}
        >
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(handoverBatchNo || detail.handover_batch_no || "")}&format=svg`}
            alt={`QR: ${handoverBatchNo || detail.handover_batch_no}`}
            style={{ width: 100, height: 100, flexShrink: 0 }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: "var(--sapContent_LabelColor)",
              }}
            >
              HANDOVER BATCH NO.
            </span>
            <span style={{ fontWeight: "700", color: "var(--sapInformativeElementColor)", fontSize: "0.95rem" }}>
              {handoverBatchNo || detail.handover_batch_no}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--sapContent_LabelColor)" }}>
              Scan this QR code at the Kiosk to confirm pickup
            </span>
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.375rem 0.5rem",
          background: "var(--sapGroup_TitleBackground)",
          border: BORDER,
          borderBottom: "none",
          borderRadius: "4px 4px 0 0",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h6 style={{ margin: 0, fontSize: "0.875rem" }}>Material Items</h6>
            <span style={{ color: "var(--sapNeutralElementColor)", fontSize: "0.8rem" }}>({detail.items.length})</span>
          </div>
        </div>
      </div>

      <div
        className="voucher-items-wrapper"
        style={{ border: BORDER, borderTop: "none", borderRadius: "0 0 4px 4px", overflow: "auto" }}
      >
        <table className="voucher-items-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: BORDER }}>
              <th
                style={{ width: "56px", padding: "0.5rem", fontWeight: "bold", fontSize: "0.75rem", textAlign: "left" }}
              >
                ITEM
              </th>
              <th
                style={{ width: "90px", padding: "0.5rem", fontWeight: "bold", fontSize: "0.75rem", textAlign: "left" }}
              >
                TYPE
              </th>
              <th
                style={{
                  width: "150px",
                  padding: "0.5rem",
                  fontWeight: "bold",
                  fontSize: "0.75rem",
                  textAlign: "left",
                }}
              >
                MODEL
              </th>
              <th
                style={{ width: "90px", padding: "0.5rem", fontWeight: "bold", fontSize: "0.75rem", textAlign: "left" }}
              >
                PART NO.
              </th>
              <th
                style={{
                  width: "250px",
                  padding: "0.5rem",
                  fontWeight: "bold",
                  fontSize: "0.75rem",
                  textAlign: "left",
                }}
              >
                DESCRIPTION
              </th>
              <th
                style={{
                  width: "160px",
                  padding: "0.5rem",
                  fontWeight: "bold",
                  fontSize: "0.75rem",
                  textAlign: "left",
                }}
              >
                DO NO.
              </th>
              <th
                style={{ width: "80px", padding: "0.5rem", fontWeight: "bold", fontSize: "0.75rem", textAlign: "left" }}
              >
                VENDOR
              </th>
              <th
                style={{
                  width: "120px",
                  padding: "0.5rem",
                  fontWeight: "bold",
                  fontSize: "0.75rem",
                  textAlign: "left",
                }}
              >
                GR NO.
              </th>
              <th
                style={{ width: "52px", padding: "0.5rem", fontWeight: "bold", fontSize: "0.75rem", textAlign: "left" }}
              >
                NET
              </th>
              <th
                style={{ width: "80px", padding: "0.5rem", fontWeight: "bold", fontSize: "0.75rem", textAlign: "left" }}
              >
                QTY
              </th>
              <th
                style={{ width: "44px", padding: "0.5rem", fontWeight: "bold", fontSize: "0.75rem", textAlign: "left" }}
              >
                UOM
              </th>
              <th style={{ padding: "0.5rem", fontWeight: "bold", fontSize: "0.75rem", textAlign: "left" }}>REMARKS</th>
              <th style={{ width: "72px", padding: "0.5rem" }} />
            </tr>
          </thead>
          <tbody>
            {detail.items.length ? (
              detail.items.flatMap((item) => {
                const key = item.id || `${item.item_no}-${item.part_number}`;
                const allocations = item.issue_allocations ?? [];
                const requestedQty = Number(item.requested_qty ?? 0);
                const actualIssuedTotal =
                  allocations.length > 0
                    ? allocations.reduce((sum, alloc) => sum + (Number(alloc.issued_qty) || 0), 0)
                    : Number(item.issued_qty ?? 0);

                const rows: React.ReactNode[] = [];
                rows.push(
                  <tr className="voucher-item-row" key={`${key}-requested`}>
                    <td style={{ padding: "0.5rem", fontWeight: 600 }}>{item.item_no}</td>
                    <td style={{ padding: "0.5rem" }}>
                      <span style={{ fontSize: "0.75rem" }}>Requested</span>
                    </td>
                    <td style={{ padding: "0.5rem", fontSize: "0.82rem" }}>{detail.model_code || "-"}</td>
                    <td style={{ padding: "0.5rem", fontSize: "0.82rem" }}>{item.part_number || "-"}</td>
                    <td style={{ padding: "0.5rem", fontSize: "0.82rem" }}>{item.description || "-"}</td>
                    <td style={{ padding: "0.5rem" }}>
                      {showIssueOptions && workbench && item.id ? (
                        <button type="button" onClick={() => workbench.addAllocationLine(item.id!)} style={btnBase}>
                          Add DO. No.
                        </button>
                      ) : (
                        <span style={{ color: "var(--sapContent_LabelColor)" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "0.5rem", color: "var(--sapContent_LabelColor)" }}>—</td>
                    <td style={{ padding: "0.5rem", color: "var(--sapContent_LabelColor)" }}>—</td>
                    <td style={{ padding: "0.5rem", color: "var(--sapContent_LabelColor)" }}>—</td>
                    <td style={{ padding: "0.5rem", fontWeight: "bold", textAlign: "right" }}>
                      {item.requested_qty ?? "—"}
                    </td>
                    <td style={{ padding: "0.5rem", fontSize: "0.82rem" }}>{item.uom || "PCS"}</td>
                    <td
                      style={{
                        padding: "0.5rem",
                        fontStyle: "italic",
                        fontSize: "0.75rem",
                        color: "var(--sapContent_LabelColor)",
                      }}
                    >
                      Requested Qty
                    </td>
                    <td style={{ padding: "0.5rem" }} />
                  </tr>
                );

                allocations.forEach((alloc, idx) => {
                  rows.push(
                    <tr className="voucher-item-row" key={`${key}-alloc-${alloc.id || idx}`}>
                      <td
                        style={{
                          padding: "0.5rem",
                          color: "var(--sapInformativeElementColor)",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                        }}
                      >{`${item.item_no}.${idx + 1}`}</td>
                      <td style={{ padding: "0.5rem" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--sapInformativeElementColor)" }}>
                          DO Alloc
                        </span>
                      </td>
                      <td style={{ padding: "0.5rem", fontSize: "0.82rem" }}>{detail.model_code || "-"}</td>
                      <td style={{ padding: "0.5rem", fontSize: "0.82rem" }}>{item.part_number || "-"}</td>
                      <td style={{ padding: "0.5rem", fontSize: "0.82rem" }}>
                        Pack {alloc.vendor_pack_size || alloc.supplier_pack_size} | {alloc.issued_packs} Packs
                      </td>
                      <td
                        style={{
                          padding: "0.5rem",
                          fontWeight: "bold",
                          fontSize: "0.88rem",
                          color: "var(--sapInformativeElementColor)",
                        }}
                      >
                        {alloc.do_number || "-"}
                      </td>
                      <td style={{ padding: "0.5rem", fontSize: "0.82rem" }}>
                        {alloc.vendor_name || alloc.supplier_name || "-"}
                      </td>
                      <td style={{ padding: "0.5rem", fontSize: "0.82rem" }}>
                        {(alloc as { gr_number?: string }).gr_number || "-"}
                      </td>
                      <td style={{ padding: "0.5rem", fontSize: "0.82rem" }}>
                        {(alloc as { available_qty?: number }).available_qty ?? "-"}
                      </td>
                      <td style={{ padding: "0.5rem", fontWeight: "bold", textAlign: "right" }}>
                        {alloc.issued_qty ?? "—"}
                      </td>
                      <td style={{ padding: "0.5rem", fontSize: "0.82rem" }}>{item.uom || "PCS"}</td>
                      <td style={{ padding: "0.5rem", fontSize: "0.75rem" }}>{alloc.remarks || "—"}</td>
                      <td style={{ padding: "0.5rem" }} />
                    </tr>
                  );
                });

                if (showIssueOptions && workbench && item.id) {
                  const manualRows = workbench.manualAllocations.filter((a) => a.item_id === item.id);
                  const issueItem = workbench.issueItems.find((i) => i.item_id === item.id);
                  const availableDos = issueItem?.issue_options ?? [];

                  manualRows.forEach((row, mIdx) => {
                    rows.push(
                      <tr className="voucher-item-row" key={`manual-${row.id}`}>
                        <td
                          style={{
                            padding: "0.5rem",
                            color: "var(--sapCriticalElementColor)",
                            fontSize: "0.82rem",
                            fontWeight: 600,
                          }}
                        >{`${item.item_no}.${allocations.length + mIdx + 1}`}</td>
                        <td style={{ padding: "0.5rem" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--sapCriticalElementColor)" }}>Store</span>
                        </td>
                        <td style={{ padding: "0.5rem", fontSize: "0.82rem" }}>{detail.model_code || "-"}</td>
                        <td style={{ padding: "0.5rem", fontSize: "0.82rem" }}>{item.part_number || "-"}</td>
                        <td style={{ padding: "0.5rem" }}>
                          <input
                            value={row.description}
                            onChange={(e) =>
                              workbench.setManualAllocations((prev) =>
                                prev.map((x) => (x.id === row.id ? { ...x, description: e.target.value } : x))
                              )
                            }
                            placeholder="Required — e.g. P.1 J001/1, P2.J002/1 (Rack)"
                            style={inputBase}
                            required
                          />
                        </td>
                        <td style={{ padding: "0.5rem" }}>
                          <select
                            value={row.do_number ? `DO:${row.do_number}` : "NONE"}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (!val || val === "NONE") {
                                workbench.setManualAllocations((prev) =>
                                  prev.map((x) =>
                                    x.id === row.id
                                      ? { ...x, vendor_id: "", do_number: "", gr_number: "", available_qty: 0 }
                                      : x
                                  )
                                );
                                return;
                              }
                              if (val.startsWith("DO:")) {
                                const doId = val.split("DO:")[1];
                                const selectedDo = availableDos.find((d) => (d.do_id ?? d.do_number) === doId);
                                if (selectedDo) {
                                  workbench.setManualAllocations((prev) =>
                                    prev.map((x) =>
                                      x.id === row.id
                                        ? {
                                            ...x,
                                            vendor_id: selectedDo.vendor_id ?? selectedDo.supplier_id ?? "",
                                            do_number: selectedDo.do_number,
                                            gr_number: selectedDo.gr_number ?? "",
                                            available_qty: selectedDo.available_qty ?? 0,
                                            issued_qty: selectedDo.pack_size > 0 ? selectedDo.pack_size : 1,
                                          }
                                        : x
                                    )
                                  );
                                }
                              }
                            }}
                            style={selectBase}
                          >
                            <option value="NONE">Select DO. No.</option>
                            {availableDos.map((doOpt) => {
                              const doKey = doOpt.do_id ?? doOpt.do_number;
                              return (
                                <option key={`do-${doKey}`} value={`DO:${doKey}`}>
                                  {doOpt.do_number}
                                </option>
                              );
                            })}
                          </select>
                        </td>
                        <td style={{ padding: "0.5rem", fontSize: "0.82rem" }}>
                          {row.do_number
                            ? (availableDos.find((d) => d.do_number === row.do_number)?.vendor_name ??
                              availableDos.find((d) => d.do_number === row.do_number)?.supplier_name ??
                              "-")
                            : "-"}
                        </td>
                        <td style={{ padding: "0.5rem", fontSize: "0.82rem" }}>{row.gr_number || "-"}</td>
                        <td style={{ padding: "0.5rem", fontSize: "0.82rem" }}>
                          {row.available_qty ? `${row.available_qty}` : "-"}
                        </td>
                        <td style={{ padding: "0.5rem" }}>
                          <input
                            type="number"
                            value={row.issued_qty}
                            onChange={(e) =>
                              workbench.setManualAllocations((prev) =>
                                prev.map((x) =>
                                  x.id === row.id ? { ...x, issued_qty: Math.max(1, Number(e.target.value || 1)) } : x
                                )
                              )
                            }
                            style={inputBase}
                          />
                        </td>
                        <td style={{ padding: "0.5rem", fontSize: "0.82rem" }}>{item.uom || "PCS"}</td>
                        <td style={{ padding: "0.5rem" }}>
                          <input
                            value={row.remarks}
                            onChange={(e) =>
                              workbench.setManualAllocations((prev) =>
                                prev.map((x) => (x.id === row.id ? { ...x, remarks: e.target.value } : x))
                              )
                            }
                            placeholder="Optional remarks"
                            style={inputBase}
                          />
                        </td>
                        <td style={{ paddingLeft: "0.5rem", paddingRight: "1rem", minWidth: "72px" }}>
                          <button
                            type="button"
                            title="Remove this DO line"
                            onClick={() =>
                              workbench.setManualAllocations((prev) => prev.filter((x) => x.id !== row.id))
                            }
                            style={{
                              ...btnBase,
                              color: "var(--sapNegativeElementColor)",
                              borderColor: "var(--sapNegativeElementColor)",
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  });
                }

                const manualIssuedTotal =
                  workbench && showIssueOptions && item.id ? (workbench.allocationTotalsByItem[item.id] ?? 0) : 0;
                const absoluteTotal = actualIssuedTotal + manualIssuedTotal;
                const absoluteDiff = absoluteTotal - requestedQty;
                const uom = item.uom || "PCS";
                const summaryExplanation =
                  absoluteDiff === 0
                    ? `Requested ${requestedQty} ${uom}, Issued ${absoluteTotal} ${uom} — Match`
                    : absoluteDiff > 0
                      ? `Requested ${requestedQty} ${uom}, Issued ${absoluteTotal} ${uom} — Over by ${absoluteDiff}`
                      : `Requested ${requestedQty} ${uom}, Issued ${absoluteTotal} ${uom} — Short by ${Math.abs(absoluteDiff)}`;

                if (shouldShowIssueTotals) {
                  rows.push(
                    <tr
                      className="voucher-item-row"
                      key={`${key}-actual`}
                      style={{ background: "var(--sapList_AlternatingBackground)" }}
                    >
                      <td style={{ padding: "0.5rem", fontWeight: 600, fontSize: "0.82rem" }}>{item.item_no}</td>
                      <td style={{ padding: "0.5rem" }}>
                        <span style={{ color: "var(--sapPositiveElementColor)", fontSize: "0.75rem" }}>Total</span>
                      </td>
                      <td style={{ padding: "0.5rem" }} />
                      <td style={{ padding: "0.5rem" }} />
                      <td style={{ padding: "0.5rem", fontWeight: "bold", fontSize: "0.85rem" }}>
                        Actual Issued Total
                      </td>
                      <td style={{ padding: "0.5rem" }} />
                      <td style={{ padding: "0.5rem" }} />
                      <td style={{ padding: "0.5rem" }} />
                      <td style={{ padding: "0.5rem" }} />
                      <td
                        style={{
                          padding: "0.5rem",
                          textAlign: "right",
                          fontWeight: "bold",
                          fontSize: "0.95rem",
                          color: absoluteTotal > 0 ? "var(--sapPositiveElementColor)" : undefined,
                        }}
                      >
                        {absoluteTotal || "—"}
                      </td>
                      <td style={{ padding: "0.5rem", fontWeight: "bold" }}>{uom}</td>
                      <td
                        style={{
                          padding: "0.5rem",
                          fontStyle: "italic",
                          fontSize: "0.75rem",
                          color: "var(--sapContent_LabelColor)",
                        }}
                      >
                        {item.remarks || "—"}
                      </td>
                      <td style={{ padding: "0.5rem" }} />
                    </tr>
                  );

                  rows.push(
                    <tr
                      className="voucher-item-row"
                      key={`${key}-summary`}
                      style={{
                        background: "var(--sapGroup_TitleBackground)",
                        borderBottom: "2px solid var(--sapGroup_ContentBorderColor)",
                      }}
                    >
                      <td style={{ padding: "0.5rem" }} />
                      <td style={{ padding: "0.5rem" }} />
                      <td style={{ padding: "0.5rem" }} />
                      <td style={{ padding: "0.5rem" }} />
                      <td
                        style={{
                          padding: "0.5rem",
                          fontSize: "0.7rem",
                          fontWeight: "700",
                          color: "var(--sapNeutralElementColor)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Summary
                      </td>
                      <td style={{ padding: "0.5rem" }} />
                      <td style={{ padding: "0.5rem" }} />
                      <td style={{ padding: "0.5rem" }} />
                      <td style={{ padding: "0.5rem" }}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color:
                              absoluteDiff === 0
                                ? "var(--sapPositiveElementColor)"
                                : absoluteDiff > 0
                                  ? "var(--sapInformativeElementColor)"
                                  : "var(--sapNegativeElementColor)",
                          }}
                        >
                          {absoluteDiff === 0 ? "OK" : absoluteDiff > 0 ? "Over" : "Short"}
                        </span>
                      </td>
                      <td style={{ padding: "0.5rem" }}>
                        <span
                          style={{
                            textAlign: "right",
                            display: "block",
                            fontWeight: "bold",
                            color:
                              absoluteDiff === 0
                                ? "var(--sapPositiveElementColor)"
                                : absoluteDiff > 0
                                  ? "var(--sapInformativeElementColor)"
                                  : "var(--sapNegativeElementColor)",
                          }}
                        >
                          {absoluteDiff > 0 ? `+${absoluteDiff}` : absoluteDiff}
                        </span>
                      </td>
                      <td style={{ padding: "0.5rem", fontWeight: "bold" }}>{uom}</td>
                      <td
                        style={{
                          padding: "0.5rem",
                          fontSize: "0.75rem",
                          color: "var(--sapContent_LabelColor)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {summaryExplanation}
                      </td>
                      <td style={{ padding: "0.5rem" }} />
                    </tr>
                  );
                }

                return rows;
              })
            ) : (
              <tr>
                <td
                  colSpan={14}
                  style={{ textAlign: "center", padding: "1rem", color: "var(--sapContent_LabelColor)" }}
                >
                  No request items
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showIssueOptions && workbench?.issueValidationError && (
        <div
          style={{
            marginTop: "0.75rem",
            padding: "0.75rem 1rem",
            background: "var(--sapNegativeBackground)",
            border: "1px solid var(--sapNegativeBorderColor)",
            borderRadius: "4px",
          }}
        >
          {workbench.issueValidationErrors?.length ? (
            <div>
              {workbench.issueValidationErrors.map((error, idx) => (
                <div key={`issue-validation-${idx}`}>- {error}</div>
              ))}
            </div>
          ) : (
            workbench.issueValidationError
          )}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          border: BORDER,
          borderRadius: "var(--sapElement_BorderCornerRadius)",
          overflow: "hidden",
          marginTop: "1.25rem",
        }}
      >
        <div style={{ borderRight: BORDER, minWidth: 0 }}>
          <div
            style={{ background: "var(--sapGroup_TitleBackground)", padding: "0.4rem 0.75rem", borderBottom: BORDER }}
          >
            <span
              style={{ fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.07em" }}
            >
              ISSUED BY
            </span>
          </div>
          <div style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
              <span style={{ color: "var(--sapContent_LabelColor)", minWidth: "3.5rem", fontSize: "0.8rem" }}>
                NAME :
              </span>
              <span style={{ fontWeight: "600" }}>{detail.issued_by_name || "—"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
              <span style={{ color: "var(--sapContent_LabelColor)", minWidth: "3.5rem", fontSize: "0.8rem" }}>
                DATE :
              </span>
              <span style={{ fontSize: "0.85rem" }}>{formatDateTime(detail.issued_at)}</span>
            </div>
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{ background: "var(--sapGroup_TitleBackground)", padding: "0.4rem 0.75rem", borderBottom: BORDER }}
          >
            <span
              style={{ fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.07em" }}
            >
              RECEIVED BY
            </span>
          </div>
          <div style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
              <span style={{ color: "var(--sapContent_LabelColor)", minWidth: "3.5rem", fontSize: "0.8rem" }}>
                NAME :
              </span>
              <span style={{ fontWeight: "600" }}>{detail.received_by_name || "—"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
              <span style={{ color: "var(--sapContent_LabelColor)", minWidth: "3.5rem", fontSize: "0.8rem" }}>
                DATE :
              </span>
              <span style={{ fontSize: "0.85rem" }}>{formatDateTime(detail.received_at)}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "0.75rem", textAlign: "center" }}>
        <span style={{ fontSize: "0.7rem", color: "var(--sapContent_LabelColor)", letterSpacing: "0.05em" }}>
          White — STORE · Blue — MATERIALS · Pink — RECEIVER
        </span>
      </div>
    </div>
  );
}
