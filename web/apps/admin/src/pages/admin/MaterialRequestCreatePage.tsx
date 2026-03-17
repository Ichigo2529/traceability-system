import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createMaterialQueryKeys, NextNumbersResponse } from "@traceability/material";
import { MaterialRequestForm, MaterialRequestLineForm } from "@traceability/material-ui";
import { MaterialRequest, MaterialRequestCatalogItem } from "@traceability/sdk";
import { useAuth } from "../../context/AuthContext";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { formatDate } from "../../lib/datetime";
import { PageLayout } from "@traceability/ui";
import { useToast } from "../../hooks/useToast";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { useMaterialRequestMeta } from "../../hooks/useMaterialRequestMeta";
import {
  createMaterialRequest,
  getMaterialRequestCatalog,
  getMaterialRequestNextNumbers,
} from "../../lib/material-api";

function blankLine(itemNo: number): MaterialRequestLineForm {
  return {
    item_no: itemNo,
    model_id: "",
    part_number: "",
    description: "",
    requested_qty: undefined,
    uom: "PCS",
    remarks: "",
  };
}

export function MaterialRequestCreatePage() {
  const { user } = useAuth();
  const keys = createMaterialQueryKeys("admin");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [selectedCostCenterId, setSelectedCostCenterId] = useState("");
  const [headerRemarks] = useState("");
  const [lines, setLines] = useState<MaterialRequestLineForm[]>([blankLine(1)]);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  const { meta, sectionNotSet } = useMaterialRequestMeta();
  const defaultSetRef = useRef(false);

  useEffect(() => {
    if (meta?.default_cost_center_id && !defaultSetRef.current) {
      setSelectedCostCenterId(meta.default_cost_center_id);
      defaultSetRef.current = true;
    }
  }, [meta?.default_cost_center_id]);

  const catalogQuery = useQuery<MaterialRequestCatalogItem[]>({
    queryKey: keys.catalog(),
    queryFn: getMaterialRequestCatalog,
  });

  const nextNumbersQuery = useQuery<NextNumbersResponse>({
    queryKey: keys.nextNumbers(),
    queryFn: getMaterialRequestNextNumbers,
    refetchOnWindowFocus: true,
  });

  const sectionDisplay = meta?.section
    ? `${meta.section.section_name} (${meta.section.section_code})`
    : `${user?.display_name ?? "-"}${user?.department ? ` / ${user.department}` : ""}`;

  const hasInvalidRequestedQty = lines
    .filter((line) => line.part_number.trim().length > 0)
    .some((line) => !Number.isFinite(Number(line.requested_qty)) || Number(line.requested_qty) <= 0);

  const createMutation = useMutation<MaterialRequest, Error>({
    mutationFn: () => {
      const requestedLines = lines.filter((line) => line.part_number.trim().length > 0);
      if (!requestedLines.length) {
        throw new Error("At least one component line is required");
      }
      const modelIds = Array.from(new Set(requestedLines.map((line) => line.model_id).filter(Boolean)));
      if (modelIds.length !== 1) {
        throw new Error("Each voucher must use one model only");
      }
      const invalidQtyLine = requestedLines.find(
        (line) => !Number.isFinite(Number(line.requested_qty)) || Number(line.requested_qty) <= 0
      );
      if (invalidQtyLine) {
        throw new Error(`Requested quantity must be greater than 0 for part ${invalidQtyLine.part_number}`);
      }
      return createMaterialRequest({
        request_no: nextNumbersQuery.data?.request_no,
        dmi_no: nextNumbersQuery.data?.dmi_no,
        request_date: nextNumbersQuery.data?.request_date,
        model_id: modelIds[0],
        cost_center_id: selectedCostCenterId || undefined,
        remarks: headerRemarks || undefined,
        items: requestedLines.map((line, idx) => ({
          item_no: idx + 1,
          part_number: line.part_number.trim().toUpperCase(),
          description: line.description || undefined,
          requested_qty: line.requested_qty,
          uom: line.uom || "PCS",
          remarks: line.remarks || undefined,
        })),
      });
    },
    onSuccess: async (created) => {
      showToast(`Request submitted: ${created.request_no}${created.dmi_no ? ` (${created.dmi_no})` : ""}`);
      await queryClient.invalidateQueries({ queryKey: keys.requests() });
      await queryClient.invalidateQueries({ queryKey: keys.nextNumbers() });
      navigate("/admin/material-requests");
    },
    onError: (err: Error & { error_code?: string }) => {
      const code = err?.error_code;
      if (code === "SECTION_NOT_SET") {
        showToast("Error: Your user has no section assigned. Contact an administrator.");
      } else if (code === "COST_CENTER_DEFAULT_NOT_SET") {
        showToast("Error: No default cost center set for your section. Contact an administrator.");
      } else if (code === "INVALID_COST_CENTER") {
        showToast("Error: Selected cost center is not allowed for your section.");
        setSelectedCostCenterId(meta?.default_cost_center_id ?? "");
      } else {
        showToast(err.message || "Failed to create request");
      }
    },
  });

  const anyError = catalogQuery.error ?? nextNumbersQuery.error ?? createMutation.error;

  return (
    <PageLayout
      title="New Material Request"
      subtitle={
        <div className="flex items-center gap-2">
          <span className="indicator-live" />
          <span>Create a new material request</span>
        </div>
      }
      icon="create-form"
      iconColor="blue"
      showBackButton
      onBackClick={() => navigate("/admin/material-requests")}
      headerActions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate("/admin/material-requests")}>
            Cancel
          </Button>
          <Button
            onClick={() => setConfirmSubmitOpen(true)}
            disabled={
              createMutation.isPending ||
              lines.every((line) => !line.part_number) ||
              hasInvalidRequestedQty ||
              sectionNotSet
            }
          >
            {createMutation.isPending ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      }
    >
      <div className="page-container motion-safe:animate-fade-in flex flex-col gap-4">
        <ApiErrorBanner message={anyError ? formatApiError(anyError) : undefined} />

        <div className="flex flex-col gap-4 flex-1">
          {sectionNotSet && (
            <Alert variant="destructive" className="mb-2">
              <AlertDescription>
                Your user account has no section assigned. You cannot create requests.
              </AlertDescription>
            </Alert>
          )}

          <MaterialRequestForm
            lines={lines}
            setLines={setLines}
            selectedCostCenterId={selectedCostCenterId}
            setSelectedCostCenterId={setSelectedCostCenterId}
            meta={meta}
            sectionNotSet={sectionNotSet}
            catalog={catalogQuery.data ?? []}
            requestNo={nextNumbersQuery.data?.request_no}
            dmiNo={nextNumbersQuery.data?.dmi_no}
            generatedAt={nextNumbersQuery.data?.generated_at}
            requestorName={user?.display_name}
            departmentName={meta?.department?.name ?? user?.department ?? "-"}
            sectionDisplay={sectionDisplay}
            formatDate={formatDate}
          />
        </div>
      </div>

      <ConfirmDialog
        open={confirmSubmitOpen}
        title="Confirm Submit Request"
        description="Are you sure you want to submit this material request now?"
        confirmText="Submit"
        submitting={createMutation.isPending}
        onCancel={() => setConfirmSubmitOpen(false)}
        onConfirm={() => createMutation.mutate()}
      />
    </PageLayout>
  );
}
