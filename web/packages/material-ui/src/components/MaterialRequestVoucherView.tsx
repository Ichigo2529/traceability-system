import { MaterialRequestDetail } from "@traceability/sdk";
import { useIssueAllocationWorkbench } from "@traceability/material";
import { StatusBadge } from "@traceability/ui";
import {
  Button,
  FlexBox,
  FlexBoxAlignItems,
  FlexBoxDirection,
  FlexBoxJustifyContent,
  Input,
  Label,
  MessageStrip,
  ObjectStatus,
  Option,
  Select,
  Table,
  TableCell,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
  Text,
  Title,
} from "@ui5/webcomponents-react";

import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/nav-back.js";
import "@ui5/webcomponents-icons/dist/print.js";

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
  style?: object;
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

export function MaterialRequestVoucherView({
  detail,
  onBack,
  workbench,
  showIssueOptions,
  hideTopBarActions,
  hideIssueTotalsBeforeIssued = false,
  formatDate = defaultFormatDate,
  formatDateTime = defaultFormatDateTime,
}: {
  detail: MaterialRequestDetail;
  onBack?: () => void;
  workbench?: ReturnType<typeof useIssueAllocationWorkbench>;
  showIssueOptions?: boolean;
  hideTopBarActions?: boolean;
  hideIssueTotalsBeforeIssued?: boolean;
  formatDate?: (value?: string | null) => string;
  formatDateTime?: (value?: string | null) => string;
}) {
  const isIssuedCompleted =
    detail.status === "ISSUED" ||
    Boolean(detail.issued_at) ||
    detail.items.some(
      (item) => (item.issue_allocations?.length ?? 0) > 0 || Number(item.issued_qty ?? 0) > 0
    );
  const shouldShowIssueTotals = !hideIssueTotalsBeforeIssued || isIssuedCompleted;

  return (
    <FlexBox
      direction={FlexBoxDirection.Column}
      style={{
        padding: "1.5rem",
        background: "var(--sapGroup_ContentBackground)",
        border: BORDER,
        borderRadius: "var(--sapElement_BorderCornerRadius)",
        width: "100%",
        boxSizing: "border-box",
        gap: "0",
      }}
    >
      <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} alignItems={FlexBoxAlignItems.Start} style={{ width: "100%", paddingBottom: "1.25rem" }}>
        <FlexBox style={{ gap: "1.25rem" }} alignItems={FlexBoxAlignItems.Start}>
          <img src="/logo.png" alt="MMI Logo" style={{ height: "4rem", width: "auto", objectFit: "contain" }} />
          <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.15rem" }}>
            <Title level="H4" style={{ fontStyle: "italic", color: "var(--sapTextColor)" }}>
              MMI Precision Assembly (Thailand) Co., Ltd.
            </Title>
            <Text style={{ fontSize: "0.8rem", color: "var(--sapContent_LabelColor)" }}>
              888 Moo 1, Mittraphap Road, Tambon Naklang, Amphur Sungnoen, Nakornratchasima 30380 Thailand
            </Text>
            <FlexBox style={{ gap: "1.5rem", marginTop: "0.1rem" }}>
              <Text style={{ fontSize: "0.8rem", color: "var(--sapContent_LabelColor)" }}>TEL : (6644) 000188</Text>
              <Text style={{ fontSize: "0.8rem", color: "var(--sapContent_LabelColor)" }}>FAX : (6644) 000199</Text>
            </FlexBox>
          </FlexBox>
        </FlexBox>

        {hideTopBarActions ? (
          <StatusBadge status={detail.status} />
        ) : (
          <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }} className="no-print">
            {onBack && (
              <Button icon="nav-back" design="Transparent" onClick={onBack}>
                Back
              </Button>
            )}
            <StatusBadge status={detail.status} />
            {detail.status === "ISSUED" && (
              <Button icon="print" design="Transparent" onClick={() => window.print()} tooltip="Print Voucher">
                Print
              </Button>
            )}
          </FlexBox>
        )}
      </FlexBox>

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
        <Title level="H4" style={{ letterSpacing: "0.12em", fontWeight: "700" }}>
          DIRECT MATERIAL ISSUE VOUCHER
        </Title>
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

      <FlexBox
        justifyContent={FlexBoxJustifyContent.SpaceBetween}
        alignItems={FlexBoxAlignItems.Center}
        style={{
          padding: "0.375rem 0.5rem",
          background: "var(--sapGroup_TitleBackground)",
          border: BORDER,
          borderBottom: "none",
          borderRadius: "4px 4px 0 0",
        }}
      >
        <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.25rem" }}>
          <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
            <Title level="H6">Material Items</Title>
            <Text style={{ color: "var(--sapNeutralElementColor)", fontSize: "0.8rem" }}>({detail.items.length})</Text>
          </FlexBox>
        </FlexBox>
      </FlexBox>

      <div style={{ border: BORDER, borderTop: "none", borderRadius: "0 0 4px 4px", overflow: "auto" }}>
        <Table
          style={{ width: "100%" }}
          headerRow={
            <TableHeaderRow>
              <TableHeaderCell width="56px"><Label style={{ fontWeight: "bold", fontSize: "0.75rem" }}>ITEM</Label></TableHeaderCell>
              <TableHeaderCell width="90px"><Label style={{ fontWeight: "bold", fontSize: "0.75rem" }}>TYPE</Label></TableHeaderCell>
              <TableHeaderCell width="150px"><Label style={{ fontWeight: "bold", fontSize: "0.75rem" }}>MODEL</Label></TableHeaderCell>
              <TableHeaderCell width="90px"><Label style={{ fontWeight: "bold", fontSize: "0.75rem" }}>PART NO.</Label></TableHeaderCell>
              <TableHeaderCell width="250px"><Label style={{ fontWeight: "bold", fontSize: "0.75rem" }}>DESCRIPTION</Label></TableHeaderCell>
              <TableHeaderCell width="160px"><Label style={{ fontWeight: "bold", fontSize: "0.75rem" }}>DO NO.</Label></TableHeaderCell>
              <TableHeaderCell width="80px"><Label style={{ fontWeight: "bold", fontSize: "0.75rem" }}>VENDOR</Label></TableHeaderCell>
              <TableHeaderCell width="120px"><Label style={{ fontWeight: "bold", fontSize: "0.75rem" }}>GR NO.</Label></TableHeaderCell>
              <TableHeaderCell width="52px"><Label style={{ fontWeight: "bold", fontSize: "0.75rem" }}>NET</Label></TableHeaderCell>
              <TableHeaderCell width="80px"><Label style={{ fontWeight: "bold", fontSize: "0.75rem" }}>QTY</Label></TableHeaderCell>
              <TableHeaderCell width="44px"><Label style={{ fontWeight: "bold", fontSize: "0.75rem" }}>UOM</Label></TableHeaderCell>
              <TableHeaderCell><Label style={{ fontWeight: "bold", fontSize: "0.75rem" }}>REMARKS</Label></TableHeaderCell>
              <TableHeaderCell width="72px" />
            </TableHeaderRow>
          }
        >
          {detail.items.length ? (
            detail.items.flatMap((item) => {
              const key = item.id || `${item.item_no}-${item.part_number}`;
              const allocations = item.issue_allocations ?? [];
              const requestedQty = Number(item.requested_qty ?? 0);
              const actualIssuedTotal =
                allocations.length > 0
                  ? allocations.reduce((sum, alloc) => sum + (Number(alloc.issued_qty) || 0), 0)
                  : Number(item.issued_qty ?? 0);

              const rows: any[] = [];
              rows.push(
                <TableRow key={`${key}-requested`}>
                  <TableCell><Label style={{ fontWeight: "600" }}>{item.item_no}</Label></TableCell>
                  <TableCell><ObjectStatus state="None">Requested</ObjectStatus></TableCell>
                  <TableCell><Label style={{ fontSize: "0.82rem" }}>{detail.model_code || "-"}</Label></TableCell>
                  <TableCell><Label style={{ fontSize: "0.82rem" }}>{item.part_number || "-"}</Label></TableCell>
                  <TableCell><Label style={{ fontSize: "0.82rem" }}>{item.description || "-"}</Label></TableCell>
                  <TableCell>
                    {showIssueOptions && workbench && item.id ? (
                      <Button icon="add" design="Transparent" onClick={() => workbench.addAllocationLine(item.id!)}>Add DO. No.</Button>
                    ) : (
                      <Label style={{ color: "var(--sapContent_LabelColor)" }}>—</Label>
                    )}
                  </TableCell>
                  <TableCell><Label style={{ color: "var(--sapContent_LabelColor)" }}>—</Label></TableCell>
                  <TableCell><Label style={{ color: "var(--sapContent_LabelColor)" }}>—</Label></TableCell>
                  <TableCell><Label style={{ color: "var(--sapContent_LabelColor)" }}>—</Label></TableCell>
                  <TableCell><Label style={{ fontWeight: "bold", display: "block", textAlign: "right" }}>{item.requested_qty ?? "—"}</Label></TableCell>
                  <TableCell><Label style={{ fontSize: "0.82rem" }}>{item.uom || "PCS"}</Label></TableCell>
                  <TableCell><Text style={{ fontStyle: "italic", fontSize: "0.75rem", color: "var(--sapContent_LabelColor)" }}>Requested Qty</Text></TableCell>
                  <TableCell />
                </TableRow>
              );

              allocations.forEach((alloc, idx) => {
                rows.push(
                  <TableRow key={`${key}-alloc-${alloc.id || idx}`}>
                    <TableCell><Label style={{ color: "var(--sapInformativeElementColor)", fontSize: "0.82rem", fontWeight: "600" }}>{`${item.item_no}.${idx + 1}`}</Label></TableCell>
                    <TableCell><ObjectStatus state="Information">DO Alloc</ObjectStatus></TableCell>
                    <TableCell><Label style={{ fontSize: "0.82rem" }}>{detail.model_code || "-"}</Label></TableCell>
                    <TableCell><Label style={{ fontSize: "0.82rem" }}>{item.part_number || "-"}</Label></TableCell>
                    <TableCell><Text style={{ fontSize: "0.82rem" }}>Pack {alloc.vendor_pack_size || alloc.supplier_pack_size} | {alloc.issued_packs} Packs</Text></TableCell>
                    <TableCell><Label style={{ fontWeight: "bold", fontSize: "0.88rem", color: "var(--sapInformativeElementColor)" }}>{alloc.do_number || "-"}</Label></TableCell>
                    <TableCell><Label style={{ fontSize: "0.82rem" }}>{alloc.vendor_name || alloc.supplier_name || "-"}</Label></TableCell>
                    <TableCell><Label style={{ fontSize: "0.82rem" }}>{(alloc as any).gr_number || "-"}</Label></TableCell>
                    <TableCell><Label style={{ fontSize: "0.82rem" }}>{(alloc as any).available_qty ?? "-"}</Label></TableCell>
                    <TableCell><Label style={{ fontWeight: "bold", display: "block", textAlign: "right" }}>{alloc.issued_qty ?? "—"}</Label></TableCell>
                    <TableCell><Label style={{ fontSize: "0.82rem" }}>{item.uom || "PCS"}</Label></TableCell>
                    <TableCell><Text style={{ fontSize: "0.75rem" }}>{alloc.remarks || "—"}</Text></TableCell>
                    <TableCell />
                  </TableRow>
                );
              });

              if (showIssueOptions && workbench && item.id) {
                const manualRows = workbench.manualAllocations.filter((a) => a.item_id === item.id);
                const issueItem = workbench.issueItems.find((i) => i.item_id === item.id);
                const availableDos = issueItem?.issue_options ?? [];

                manualRows.forEach((row, idx) => {
                  rows.push(
                    <TableRow key={`manual-${row.id}`}>
                      <TableCell><Label style={{ color: "var(--sapCriticalElementColor)", fontSize: "0.82rem", fontWeight: "600" }}>{`${item.item_no}.${allocations.length + idx + 1}`}</Label></TableCell>
                      <TableCell><ObjectStatus state="Critical">Store</ObjectStatus></TableCell>
                      <TableCell><Label style={{ fontSize: "0.82rem" }}>{detail.model_code || "-"}</Label></TableCell>
                      <TableCell><Label style={{ fontSize: "0.82rem" }}>{item.part_number || "-"}</Label></TableCell>
                      <TableCell>
                        <Input
                          value={row.description}
                          onInput={(e) => workbench.setManualAllocations((prev) => prev.map((x) => (x.id === row.id ? { ...x, description: e.target.value } : x)))}
                          placeholder="Required — e.g. P.1 J001/1, P2.J002/1 (Rack)"
                          style={{ width: "100%" }}
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          onChange={(e) => {
                            const val = e.detail.selectedOption.getAttribute("data-value");
                            if (!val || val === "NONE") {
                              workbench.setManualAllocations((prev) =>
                                prev.map((x) => (x.id === row.id ? { ...x, vendor_id: "", do_number: "", gr_number: "", available_qty: 0 } : x))
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
                          style={{ width: "100%" }}
                        >
                          <Option data-value="NONE">Select DO. No.</Option>
                          {availableDos.length > 0 && <Option data-value="">— Available —</Option>}
                          {availableDos.map((doOpt) => {
                            const doKey = doOpt.do_id ?? doOpt.do_number;
                            return (
                              <Option key={`do-${doKey}`} data-value={`DO:${doKey}`} selected={row.do_number === doOpt.do_number}>
                                {doOpt.do_number}
                              </Option>
                            );
                          })}
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Label style={{ fontSize: "0.82rem" }}>
                          {row.do_number
                            ? availableDos.find((d) => d.do_number === row.do_number)?.vendor_name ??
                              availableDos.find((d) => d.do_number === row.do_number)?.supplier_name ??
                              "-"
                            : "-"}
                        </Label>
                      </TableCell>
                      <TableCell><Label style={{ fontSize: "0.82rem" }}>{row.gr_number || "-"}</Label></TableCell>
                      <TableCell><Label style={{ fontSize: "0.82rem" }}>{row.available_qty ? `${row.available_qty}` : "-"}</Label></TableCell>
                      <TableCell>
                        <Input
                          type="Number"
                          value={row.issued_qty.toString()}
                          onInput={(e) => workbench.setManualAllocations((prev) => prev.map((x) => (x.id === row.id ? { ...x, issued_qty: Math.max(1, Number(e.target.value || 1)) } : x)))}
                          style={{ width: "100%" }}
                        />
                      </TableCell>
                      <TableCell><Label style={{ fontSize: "0.82rem" }}>{item.uom || "PCS"}</Label></TableCell>
                      <TableCell>
                        <Input
                          value={row.remarks}
                          onInput={(e) => workbench.setManualAllocations((prev) => prev.map((x) => (x.id === row.id ? { ...x, remarks: e.target.value } : x)))}
                          placeholder="Optional remarks"
                          style={{ width: "100%" }}
                        />
                      </TableCell>
                      <TableCell style={{ paddingLeft: "0.5rem", paddingRight: "1rem", minWidth: "72px", overflow: "visible" }}>
                        <Button icon="delete" design="Negative" tooltip="Remove this DO line" onClick={() => workbench.setManualAllocations((prev) => prev.filter((x) => x.id !== row.id))} />
                      </TableCell>
                    </TableRow>
                  );
                });
              }

              const manualIssuedTotal = workbench && showIssueOptions && item.id ? (workbench.allocationTotalsByItem[item.id] ?? 0) : 0;
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
                  <TableRow key={`${key}-actual`} style={{ background: "var(--sapList_AlternatingBackground)" }}>
                    <TableCell><Label style={{ fontWeight: "600", fontSize: "0.82rem" }}>{item.item_no}</Label></TableCell>
                    <TableCell><ObjectStatus state="Positive">Total</ObjectStatus></TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell><Label style={{ fontWeight: "bold", fontSize: "0.85rem" }}>Actual Issued Total</Label></TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    <TableCell><Label style={{ textAlign: "right", display: "block", fontWeight: "bold", fontSize: "0.95rem", color: absoluteTotal > 0 ? "var(--sapPositiveElementColor)" : undefined }}>{absoluteTotal || "—"}</Label></TableCell>
                    <TableCell><Label style={{ fontWeight: "bold" }}>{uom}</Label></TableCell>
                    <TableCell><Text style={{ fontStyle: "italic", fontSize: "0.75rem", color: "var(--sapContent_LabelColor)" }}>{item.remarks || "—"}</Text></TableCell>
                    <TableCell />
                  </TableRow>
                );

                rows.push(
                  <TableRow key={`${key}-summary`} style={{ background: "var(--sapGroup_TitleBackground)", borderBottom: "2px solid var(--sapGroup_ContentBorderColor)" }}>
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    <TableCell><Text style={{ fontSize: "0.7rem", fontWeight: "700", color: "var(--sapNeutralElementColor)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Summary</Text></TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    <TableCell><ObjectStatus state={absoluteDiff === 0 ? "Positive" : absoluteDiff > 0 ? "Information" : "Negative"} showDefaultIcon={false}>{absoluteDiff === 0 ? "OK" : absoluteDiff > 0 ? "Over" : "Short"}</ObjectStatus></TableCell>
                    <TableCell>
                      <Label
                        style={{
                          textAlign: "right",
                          display: "block",
                          fontWeight: "bold",
                          color:
                            absoluteDiff === 0 ? "var(--sapPositiveElementColor)" : absoluteDiff > 0 ? "var(--sapInformativeElementColor)" : "var(--sapNegativeElementColor)",
                        }}
                      >
                        {absoluteDiff > 0 ? `+${absoluteDiff}` : absoluteDiff}
                      </Label>
                    </TableCell>
                    <TableCell><Label style={{ fontWeight: "bold" }}>{uom}</Label></TableCell>
                    <TableCell><Text style={{ fontSize: "0.75rem", color: "var(--sapContent_LabelColor)", whiteSpace: "nowrap" }}>{summaryExplanation}</Text></TableCell>
                    <TableCell />
                  </TableRow>
                );
              }

              return rows;
            })
          ) : (
            <TableRow>
              <TableCell>
                <Text style={{ textAlign: "center", width: "100%", padding: "1rem", color: "var(--sapContent_LabelColor)" }}>No request items</Text>
              </TableCell>
              <TableCell />
              <TableCell />
              <TableCell />
              <TableCell />
              <TableCell />
              <TableCell />
              <TableCell />
              <TableCell />
              <TableCell />
              <TableCell />
              <TableCell />
              <TableCell />
            </TableRow>
          )}
        </Table>
      </div>

      {showIssueOptions && workbench?.issueValidationError && (
        <MessageStrip design="Negative" hideCloseButton style={{ marginTop: "0.75rem" }}>
          {workbench.issueValidationError}
        </MessageStrip>
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
          <div style={{ background: "var(--sapGroup_TitleBackground)", padding: "0.4rem 0.75rem", borderBottom: BORDER }}>
            <Text style={{ fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.07em" }}>ISSUED BY</Text>
          </div>
          <FlexBox direction={FlexBoxDirection.Column} style={{ padding: "0.75rem", gap: "0.75rem" }}>
            <FlexBox alignItems={FlexBoxAlignItems.End} style={{ gap: "0.5rem" }}>
              <Text style={{ color: "var(--sapContent_LabelColor)", minWidth: "3.5rem", fontSize: "0.8rem" }}>NAME :</Text>
              <Text style={{ fontWeight: "600" }}>{detail.issued_by_name || "—"}</Text>
            </FlexBox>
            <FlexBox alignItems={FlexBoxAlignItems.End} style={{ gap: "0.5rem" }}>
              <Text style={{ color: "var(--sapContent_LabelColor)", minWidth: "3.5rem", fontSize: "0.8rem" }}>DATE :</Text>
              <Text style={{ fontSize: "0.85rem" }}>{formatDateTime(detail.issued_at)}</Text>
            </FlexBox>
          </FlexBox>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ background: "var(--sapGroup_TitleBackground)", padding: "0.4rem 0.75rem", borderBottom: BORDER }}>
            <Text style={{ fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.07em" }}>RECEIVED BY</Text>
          </div>
          <FlexBox direction={FlexBoxDirection.Column} style={{ padding: "0.75rem", gap: "0.75rem" }}>
            <FlexBox alignItems={FlexBoxAlignItems.End} style={{ gap: "0.5rem" }}>
              <Text style={{ color: "var(--sapContent_LabelColor)", minWidth: "3.5rem", fontSize: "0.8rem" }}>NAME :</Text>
              <Text style={{ fontWeight: "600" }}>{detail.received_by_name || "—"}</Text>
            </FlexBox>
            <FlexBox alignItems={FlexBoxAlignItems.End} style={{ gap: "0.5rem" }}>
              <Text style={{ color: "var(--sapContent_LabelColor)", minWidth: "3.5rem", fontSize: "0.8rem" }}>DATE :</Text>
              <Text style={{ fontSize: "0.85rem" }}>{formatDateTime(detail.received_at)}</Text>
            </FlexBox>
          </FlexBox>
        </div>
      </div>

      <FlexBox justifyContent={FlexBoxJustifyContent.Center} style={{ marginTop: "0.75rem" }}>
        <Text style={{ fontSize: "0.7rem", color: "var(--sapContent_LabelColor)", letterSpacing: "0.05em" }}>
          White — STORE · Blue — MATERIALS · Pink — RECEIVER
        </Text>
      </FlexBox>
    </FlexBox>
  );
}
