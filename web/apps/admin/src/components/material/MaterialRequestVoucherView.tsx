import { MaterialRequestDetail } from "@traceability/sdk";
import { formatDate, formatDateTime } from "../../lib/datetime";
import {
    FlexBox,
    FlexBoxDirection,
    FlexBoxAlignItems,
    FlexBoxJustifyContent,
    Title,
    Text,
    Label,
    Table,
    TableHeaderRow,
    TableHeaderCell,
    TableRow,
    TableCell,
    Grid,
    Button
} from "@ui5/webcomponents-react";
import { StatusBadge } from "../shared/StatusBadge";
import "@ui5/webcomponents-icons/dist/print.js";
import "@ui5/webcomponents-icons/dist/nav-back.js";

export function MaterialRequestVoucherView({ detail, onBack }: { detail: MaterialRequestDetail; onBack?: () => void }) {
  return (
    <FlexBox direction={FlexBoxDirection.Column} style={{ padding: "1.5rem", background: "var(--sapGroup_ContentBackground)", border: "1px solid var(--sapGroup_ContentBorderColor)", borderRadius: "var(--sapElement_BorderCornerRadius)", width: "100%", boxSizing: "border-box" }}>
      <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} alignItems={FlexBoxAlignItems.Start} style={{ width: "100%", paddingBottom: "1.5rem" }}>
        <FlexBox style={{ gap: "1.5rem" }} alignItems={FlexBoxAlignItems.Start}>
          <img src="/logo.png" alt="MMI Logo" style={{ height: "4.5rem", width: "auto", objectFit: "contain" }} />
          <FlexBox direction={FlexBoxDirection.Column}>
              <Title level="H3" style={{ fontStyle: "italic", marginBottom: "0.25rem", color: "var(--sapTextColor)" }}>MMI Precision Assembly (Thailand) Co., Ltd.</Title>
              <Text style={{ fontSize: "0.875rem" }}>888 Moo 1, Mittraphap Road, Tambon Naklang, Amphur Sungnoen, Nakornratchasima 30380 Thailand</Text>
              <FlexBox style={{ marginTop: "0.25rem", gap: "1rem" }}>
                  <Text style={{ fontSize: "0.875rem" }}>TEL : (6644) 000188</Text>
                  <Text style={{ fontSize: "0.875rem" }}>FAX : (6644) 000199</Text>
              </FlexBox>
          </FlexBox>
        </FlexBox>

        <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }} className="no-print">
            {onBack && <Button icon="nav-back" design="Transparent" onClick={onBack}>Back</Button>}
            <StatusBadge status={detail.status} />
            {detail.status === "ISSUED" && (
                <Button icon="print" design="Transparent" onClick={() => window.print()} tooltip="Print Voucher">Print</Button>
            )}
        </FlexBox>
      </FlexBox>

      <div style={{ width: "100%", borderBottom: "2px solid var(--sapGroup_ContentBorderColor)", marginBottom: "1.5rem" }}>
          <Title level="H3" style={{ marginBottom: "0.5rem" }}>DIRECT MATERIAL ISSUE VOUCHER</Title>
      </div>

      <Grid defaultSpan="XL4 L4 M4 S12" style={{ gap: "1rem", marginBottom: "1rem" }}>
        <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.25rem" }}>
            <Label>NO.</Label>
            <Text style={{ color: "var(--sapNegativeElementColor)", fontWeight: "bold" }}>{detail.request_no || "-"}</Text>
        </FlexBox>
        <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.25rem" }}>
            <Label>DMI. NO.</Label>
            <Text style={{ color: "var(--sapNegativeElementColor)", fontWeight: "bold" }}>{detail.dmi_no || "-"}</Text>
        </FlexBox>
        <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.25rem" }}>
            <Label>DATE</Label>
            <Text>{formatDate(detail.request_date)}</Text>
        </FlexBox>
      </Grid>

      <Grid defaultSpan="XL4 L4 M4 S12" style={{ gap: "1rem", marginBottom: "1.5rem" }}>
        <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.25rem" }}>
            <Label>SECTION</Label>
            <Text>{detail.section || "-"}</Text>
        </FlexBox>
        <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.25rem" }}>
            <Label>COST CENTER</Label>
            <Text>{detail.cost_center || "-"}</Text>
        </FlexBox>
      </Grid>

      <Table
        headerRow={
            <TableHeaderRow>
                <TableHeaderCell width="50px"><Label style={{ fontWeight: "bold" }}>ITEM</Label></TableHeaderCell>
                <TableHeaderCell width="100px"><Label style={{ fontWeight: "bold" }}>TYPE</Label></TableHeaderCell>
                <TableHeaderCell width="100px"><Label style={{ fontWeight: "bold" }}>MODEL</Label></TableHeaderCell>
                <TableHeaderCell width="180px"><Label style={{ fontWeight: "bold" }}>COMPONENT PART NO.</Label></TableHeaderCell>
                <TableHeaderCell><Label style={{ fontWeight: "bold" }}>DESCRIPTION</Label></TableHeaderCell>
                <TableHeaderCell width="80px"><Label style={{ fontWeight: "bold" }}>QTY</Label></TableHeaderCell>
                <TableHeaderCell width="60px"><Label style={{ fontWeight: "bold" }}>UOM</Label></TableHeaderCell>
                <TableHeaderCell><Label style={{ fontWeight: "bold" }}>REMARKS</Label></TableHeaderCell>
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
            const qtyDiff = actualIssuedTotal - requestedQty;
            
            const rows: any[] = [];
            
            // Requested Row
            rows.push(
                <TableRow key={`${key}-requested`}>
                    <TableCell><Label>{item.item_no}</Label></TableCell>
                    <TableCell><Text style={{ color: "var(--sapContent_LabelColor)", fontSize: "0.75rem" }}>Requested</Text></TableCell>
                    <TableCell><Label>{detail.model_code || "-"}</Label></TableCell>
                    <TableCell><Label>{item.part_number || "-"}</Label></TableCell>
                    <TableCell><Label>{item.description || "-"}</Label></TableCell>
                    <TableCell><Label style={{ textAlign: "right", display: "block" }}>{item.requested_qty ?? "-"}</Label></TableCell>
                    <TableCell><Label>{item.uom || "PCS"}</Label></TableCell>
                    <TableCell><Text style={{ fontStyle: "italic", fontSize: "0.75rem" }}>Requested Qty</Text></TableCell>
                </TableRow>
            );

            // Allocation Rows
            allocations.forEach((alloc, idx) => {
                rows.push(
                    <TableRow key={`${key}-alloc-${alloc.id || idx}`} style={{ background: "var(--sapList_AlternatingBackground)" }}>
                        <TableCell><Label>{`${item.item_no}.${idx + 1}`}</Label></TableCell>
                        <TableCell><Text style={{ color: "var(--sapInformativeElementColor)", fontSize: "0.75rem" }}>DO Allocation</Text></TableCell>
                        <TableCell />
                        <TableCell><Label style={{ fontWeight: "bold" }}>DO. NO. {alloc.do_number || "-"}</Label></TableCell>
                        <TableCell>
                            <Text style={{ fontSize: "0.875rem" }}>
                                Vendor {alloc.vendor_name || alloc.supplier_name || "-"} | Pack {alloc.vendor_pack_size || alloc.supplier_pack_size} | {alloc.issued_packs} Packs
                            </Text>
                        </TableCell>
                        <TableCell><Label style={{ textAlign: "right", display: "block" }}>{alloc.issued_qty ?? "-"}</Label></TableCell>
                        <TableCell><Label>{item.uom || "PCS"}</Label></TableCell>
                        <TableCell><Text style={{ fontSize: "0.75rem" }}>{alloc.remarks ? `Issued Qty | ${alloc.remarks}` : "Issued Qty"}</Text></TableCell>
                    </TableRow>
                );
            });

            // Actual Total Row
            rows.push(
                <TableRow key={`${key}-actual`}>
                    <TableCell><Label>{item.item_no}</Label></TableCell>
                    <TableCell><Text style={{ color: "var(--sapPositiveElementColor)", fontWeight: "bold", fontSize: "0.75rem" }}>Actual Total</Text></TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell><Label style={{ fontWeight: "bold" }}>Actual Issued Total</Label></TableCell>
                    <TableCell><Label style={{ textAlign: "right", display: "block", fontWeight: "bold" }}>{actualIssuedTotal || "-"}</Label></TableCell>
                    <TableCell><Label style={{ fontWeight: "bold" }}>{item.uom || "PCS"}</Label></TableCell>
                    <TableCell><Text style={{ fontStyle: "italic", fontSize: "0.75rem" }}>{item.remarks || "-"}</Text></TableCell>
                </TableRow>
            );

            // Summary Row
            rows.push(
                <TableRow key={`${key}-summary`}>
                    <TableCell>
                        <FlexBox style={{ gap: "1rem", padding: "0.25rem 0.5rem", whiteSpace: "nowrap" }} alignItems={FlexBoxAlignItems.Center}>
                            <FlexBox style={{ gap: "0.5rem" }}>
                                <Text style={{ fontSize: "0.75rem" }}>Requested: <b>{requestedQty}</b></Text>
                                <Text style={{ fontSize: "0.75rem" }}>Allocated: <b>{actualIssuedTotal}</b></Text>
                            </FlexBox>
                            <FlexBox style={{ gap: "0.5rem" }} alignItems={FlexBoxAlignItems.Center}>
                                <Text style={{ 
                                    fontSize: "0.75rem", 
                                    padding: "0.125rem 0.5rem", 
                                    borderRadius: "1rem",
                                    background: qtyDiff >= 0 ? "var(--sapSuccessBackground)" : "var(--sapErrorBackground)",
                                    color: qtyDiff >= 0 ? "var(--sapPositiveElementColor)" : "var(--sapNegativeElementColor)",
                                    fontWeight: "bold"
                                }}>
                                    Diff: {qtyDiff > 0 ? `+${qtyDiff}` : qtyDiff}
                                </Text>
                                <Text style={{ 
                                    fontSize: "0.75rem", 
                                    fontWeight: "bold",
                                    color: qtyDiff >= 0 ? "var(--sapPositiveElementColor)" : "var(--sapNegativeElementColor)"
                                }}>
                                    {qtyDiff >= 0 ? "OK" : "Need more allocation"}
                                </Text>
                            </FlexBox>
                        </FlexBox>
                    </TableCell>
                    <TableCell /><TableCell /><TableCell /><TableCell /><TableCell /><TableCell /><TableCell />
                </TableRow>
            );

            return rows;
          })
        ) : (
          <TableRow>
            <TableCell>
              <Text style={{ textAlign: "center", width: "100%", padding: "1rem" }}>No request items</Text>
            </TableCell>
            <TableCell /><TableCell /><TableCell /><TableCell /><TableCell /><TableCell /><TableCell />
          </TableRow>
        )}
      </Table>

      <Grid defaultSpan="XL6 L6 M6 S12" style={{ border: "1px solid var(--sapGroup_ContentBorderColor)", borderRadius: "var(--sapElement_BorderCornerRadius)", overflow: "hidden" }}>
        <div style={{ borderRight: "1px solid var(--sapGroup_ContentBorderColor)" }}>
            <div style={{ background: "var(--sapGroup_TitleBackground)", padding: "0.5rem 0.75rem" }}>
                <Text style={{ fontSize: "0.75rem", fontWeight: "bold" }}>ISSUED BY</Text>
            </div>
            <FlexBox direction={FlexBoxDirection.Column} style={{ padding: "0.75rem", gap: "1rem" }}>
                <FlexBox alignItems={FlexBoxAlignItems.End} style={{ gap: "0.5rem" }}>
                    <Text style={{ color: "var(--sapContent_LabelColor)", minWidth: "3.5rem" }}>NAME :</Text>
                    <Text style={{ fontWeight: "bold" }}>{detail.issued_by_name || "-"}</Text>
                </FlexBox>
                <FlexBox alignItems={FlexBoxAlignItems.End} style={{ gap: "0.5rem" }}>
                    <Text style={{ color: "var(--sapContent_LabelColor)", minWidth: "3.5rem" }}>DATE :</Text>
                    <Text>{formatDateTime(detail.issued_at)}</Text>
                </FlexBox>
            </FlexBox>
        </div>
        <div>
            <div style={{ background: "var(--sapGroup_TitleBackground)", padding: "0.5rem 0.75rem" }}>
                <Text style={{ fontSize: "0.75rem", fontWeight: "bold" }}>RECEIVED BY</Text>
            </div>
            <FlexBox direction={FlexBoxDirection.Column} style={{ padding: "0.75rem", gap: "1rem" }}>
                <FlexBox alignItems={FlexBoxAlignItems.End} style={{ gap: "0.5rem" }}>
                    <Text style={{ color: "var(--sapContent_LabelColor)", minWidth: "3.5rem" }}>NAME :</Text>
                    <Text style={{ fontWeight: "bold" }}>{detail.received_by_name || "-"}</Text>
                </FlexBox>
                <FlexBox alignItems={FlexBoxAlignItems.End} style={{ gap: "0.5rem" }}>
                    <Text style={{ color: "var(--sapContent_LabelColor)", minWidth: "3.5rem" }}>DATE :</Text>
                    <Text>{formatDateTime(detail.received_at)}</Text>
                </FlexBox>
            </FlexBox>
        </div>
      </Grid>

      <FlexBox justifyContent={FlexBoxJustifyContent.Center}>
        <Text style={{ fontSize: "0.75rem", color: "var(--sapContent_LabelColor)" }}>
            White - STORE &nbsp; Blue - MATERIALS &nbsp; Pink - RECEIVER
        </Text>
      </FlexBox>
    </FlexBox>
  );
}
