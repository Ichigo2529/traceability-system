import { Fragment } from "react";
import { MaterialRequestIssueOptionsResponse } from "@traceability/sdk";
import {
  Table,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableCell,
  Button,
  Input,
  Select,
  Option,
  Label,
  Text,
  FlexBox,
  FlexBoxDirection,
  FlexBoxAlignItems,
  FlexBoxJustifyContent,
  Title,
  BusyIndicator,
  MessageStrip
} from "@ui5/webcomponents-react";
import { ManualAllocationLine } from "../../hooks/useIssueAllocationWorkbench";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/delete.js";

const FioriBadge = ({ children, colorScheme = "8" }: { children: React.ReactNode, colorScheme?: "1"|"8"|"9" }) => {
  const bg = colorScheme === "8" ? "var(--sapButton_Information_Background)" :
             colorScheme === "1" ? "var(--sapButton_Attention_Background)" :
                                   "var(--sapButton_Success_Background)";
  const color = colorScheme === "8" ? "var(--sapButton_Information_TextColor)" :
               colorScheme === "1" ? "var(--sapButton_Attention_TextColor)" :
                                     "var(--sapButton_Success_TextColor)";
  return (
    <span style={{ 
      display: "inline-block", padding: "0.125rem 0.375rem", fontSize: "0.75rem", 
      fontWeight: "bold", borderRadius: "0.25rem", background: bg, color: color 
    }}>
      {children}
    </span>
  );
};

export function IssueAllocationWorkbench({
  issueOptions,
  isLoading,
  issueRemarks,
  onIssueRemarksChange,
  manualAllocations,
  setManualAllocations,
  allocationTotalsByItem,
  addAllocationLine,
  issueValidationError,
}: {
  issueOptions?: MaterialRequestIssueOptionsResponse;
  isLoading: boolean;
  issueRemarks: string;
  onIssueRemarksChange: (value: string) => void;
  manualAllocations: ManualAllocationLine[];
  setManualAllocations: React.Dispatch<React.SetStateAction<ManualAllocationLine[]>>;
  allocationTotalsByItem: Record<string, number>;
  addAllocationLine: (itemId: string) => void;
  issueValidationError?: string | null;
}) {
  const issueItems = issueOptions?.items ?? [];

  return (
    <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "1rem", background: "var(--sapGroup_ContentBackground)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--sapGroup_TitleBorderColor)", marginTop: "1.5rem" }}>
      <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} alignItems={FlexBoxAlignItems.Center}>
        <Title level="H4">DO Allocation Workbench</Title>
        <FioriBadge colorScheme="8">Store Action</FioriBadge>
      </FlexBox>

      <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.25rem", width: "100%", maxWidth: "400px" }}>
        <Label>Issue Remarks</Label>
        <Input
          value={issueRemarks}
          onInput={(e) => onIssueRemarksChange(e.target.value)}
          placeholder="Optional remarks for whole issue"
          style={{ width: "100%" }}
        />
      </FlexBox>

      {isLoading ? (
        <BusyIndicator active style={{ marginTop: "2rem" }} />
      ) : (
        <Table
          headerRow={
            <TableHeaderRow>
              <TableHeaderCell style={{ width: "50px" }}><Label style={{ fontWeight: "bold" }}>ITEM</Label></TableHeaderCell>
              <TableHeaderCell style={{ width: "120px" }}><Label style={{ fontWeight: "bold" }}>PART NUMBER</Label></TableHeaderCell>
              <TableHeaderCell style={{ width: "100px" }}><Label style={{ fontWeight: "bold" }}>TYPE</Label></TableHeaderCell>
              <TableHeaderCell><Label style={{ fontWeight: "bold" }}>SOURCE DO / VENDOR</Label></TableHeaderCell>
              <TableHeaderCell style={{ width: "140px" }}><Label style={{ fontWeight: "bold" }}>DO NO.</Label></TableHeaderCell>
              <TableHeaderCell style={{ width: "140px" }}><Label style={{ fontWeight: "bold" }}>GR NO.</Label></TableHeaderCell>
              <TableHeaderCell style={{ width: "100px" }}><Label style={{ fontWeight: "bold", textAlign: "right" }}>NET</Label></TableHeaderCell>
              <TableHeaderCell style={{ width: "120px" }}><Label style={{ fontWeight: "bold", textAlign: "right" }}>ISSUE QTY</Label></TableHeaderCell>
              <TableHeaderCell style={{ width: "180px" }}><Label style={{ fontWeight: "bold" }}>REMARKS</Label></TableHeaderCell>
              <TableHeaderCell style={{ width: "100px" }}><Label style={{ fontWeight: "bold", textAlign: "right" }}>ACTION</Label></TableHeaderCell>
            </TableHeaderRow>
          }
        >
          {issueItems.map((item) => {
            const rows = manualAllocations.filter((line) => line.item_id === item.item_id);
            const total = allocationTotalsByItem[item.item_id] ?? 0;
            const diff = total - item.requested_qty;
            const availableDos = item.issue_options ?? [];

            return (
              <Fragment key={`item-${item.item_id}`}>
                <TableRow style={{ background: "var(--sapList_AlternatingBackground)" }}>
                  <TableCell><Text style={{ fontWeight: "bold" }}>{item.item_no}</Text></TableCell>
                  <TableCell><Text>{item.part_number}</Text></TableCell>
                  <TableCell><FioriBadge colorScheme="1">Requested</FioriBadge></TableCell>
                  <TableCell>
                    <Text style={{ color: "var(--sapContent_LabelColor)" }}>Production Request</Text>
                  </TableCell>
                  <TableCell>
                    <Text style={{ color: "var(--sapContent_LabelColor)" }}>-</Text>
                  </TableCell>
                  <TableCell>
                    <Text style={{ color: "var(--sapContent_LabelColor)" }}>-</Text>
                  </TableCell>
                  <TableCell>
                    <Text style={{ color: "var(--sapContent_LabelColor)", textAlign: "right", width: "100%" }}>-</Text>
                  </TableCell>
                  <TableCell>
                    <Text style={{ fontWeight: "bold", color: "var(--sapNegativeColor)", textAlign: "right", width: "100%" }}>{item.requested_qty}</Text>
                  </TableCell>
                  <TableCell><Text style={{ color: "var(--sapContent_LabelColor)" }}>-</Text></TableCell>
                  <TableCell>
                    <Button icon="add" design="Transparent" onClick={() => addAllocationLine(item.item_id)}>Add DO</Button>
                  </TableCell>
                </TableRow>
                {rows.map((row, idx) => (
                  <TableRow key={row.id}>
                    <TableCell><Text style={{ color: "var(--sapContent_LabelColor)" }}>{`${item.item_no}.${idx + 1}`}</Text></TableCell>
                    <TableCell><Text style={{ color: "var(--sapContent_LabelColor)" }}>{row.part_number}</Text></TableCell>
                    <TableCell><FioriBadge colorScheme="9">DO</FioriBadge></TableCell>
                    <TableCell>
                      <Select
                        style={{ width: "100%" }}
                        onChange={(e) => {
                          const val = e.detail.selectedOption.getAttribute("data-value");
                          if (!val || val === "NONE") {
                              setManualAllocations(prev => prev.map(x => x.id === row.id ? { ...x, vendor_id: "", do_number: "" } : x));
                              return;
                          }
                          if (val.startsWith("DO:")) {
                              const doId = val.split("DO:")[1];
                              const selectedDo = item.issue_options?.find(d => (d.do_id ?? d.do_number) === doId);
                              if (selectedDo) {
                                  setManualAllocations(prev => prev.map(x => x.id === row.id ? {
                                      ...x,
                                      vendor_id: selectedDo.vendor_id ?? selectedDo.supplier_id ?? "",
                                      do_number: selectedDo.do_number,
                                      gr_number: selectedDo.gr_number ?? "",
                                      available_qty: selectedDo.available_qty ?? 0,
                                      issued_qty: selectedDo.pack_size > 0 ? selectedDo.pack_size : 1
                                  } : x));
                              }
                          }
                        }}
                      >
                          <Option data-value="NONE">Select Source</Option>
                          {availableDos.length > 0 && <Option data-value="">--- Available In Store ---</Option>}
                          {availableDos.map(doOpt => {
                              const doKey = doOpt.do_id ?? doOpt.do_number;
                              const isSelected = row.do_number === doOpt.do_number;
                              return (
                                  <Option key={`do-${doKey}`} data-value={`DO:${doKey}`} selected={isSelected}>
                                      {doOpt.do_number} | {doOpt.vendor_name ?? doOpt.supplier_name ?? "Unknown"} ({doOpt.available_qty} PCS available)
                                  </Option>
                              );
                          })}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.do_number}
                        disabled
                        placeholder="Select DO"
                        style={{ width: "100%" }}
                      />
                    </TableCell>
                    <TableCell>
                      <Text style={{ color: "var(--sapContent_LabelColor)" }}>{row.gr_number || "-"}</Text>
                    </TableCell>
                    <TableCell>
                      <Text style={{ textAlign: "right", width: "100%" }}>{row.available_qty || "-"}</Text>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="Number"
                        value={row.issued_qty.toString()}
                        onInput={(e) =>
                          setManualAllocations((prev) =>
                            prev.map((x) =>
                              x.id === row.id ? { ...x, issued_qty: Math.max(1, Number(e.target.value || 1)) } : x
                            )
                          )
                        }
                        style={{ width: "100%", textAlign: "right" }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.remarks}
                        onInput={(e) =>
                          setManualAllocations((prev) =>
                            prev.map((x) => (x.id === row.id ? { ...x, remarks: e.target.value } : x))
                          )
                        }
                        placeholder="Optional"
                        style={{ width: "100%" }}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        icon="delete"
                        design="Transparent"
                        onClick={() => setManualAllocations((prev) => prev.filter((x) => x.id !== row.id))}
                        style={{ float: "right" }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                
                <TableRow>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell>
                    <FioriBadge colorScheme="8">Total</FioriBadge>
                  </TableCell>
                  <TableCell>
                    <Text style={{ color: "var(--sapContent_LabelColor)" }}>Allocated {total} / Requested {item.requested_qty}</Text>
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell>
                    <Text style={{ fontWeight: "bold", textAlign: "right", width: "100%", color: diff >= 0 ? "var(--sapPositiveColor)" : "var(--sapNegativeColor)" }}>{total}</Text>
                  </TableCell>
                  <TableCell>
                    <Text style={{ fontWeight: "bold", color: diff >= 0 ? "var(--sapPositiveColor)" : "var(--sapNegativeColor)" }}>
                      {diff >= 0 ? "OK" : `Need +${Math.abs(diff)}`}
                    </Text>
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </Fragment>
            );
          })}
        </Table>
      )}

      {issueValidationError && (
        <MessageStrip design="Negative" hideCloseButton>{issueValidationError}</MessageStrip>
      )}
    </FlexBox>
  );
}
