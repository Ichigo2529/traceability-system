import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { sdk } from "../context/AuthContext";
import { Model, ModelReadinessResult, ModelReadinessIssue } from "@traceability/sdk";
import { ApiErrorBanner } from "../components/ui/ApiErrorBanner";
import { formatApiError } from "../lib/errors";
import { PageLayout } from "@traceability/ui";
import { 
    Title, 
    Button, 
    Select, 
    Option, 
    ObjectStatus, 
    Table,
    TableRow,
    TableCell,
    TableHeaderRow,
    TableHeaderCell,
    Icon,
    FlexBox,
    FlexBoxDirection,
    Label,
    BusyIndicator,
    Card,
    CardHeader
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/refresh.js";
import "@ui5/webcomponents-icons/dist/status-positive.js";
import "@ui5/webcomponents-icons/dist/status-error.js";
import "@ui5/webcomponents-icons/dist/navigation-right-arrow.js";
import "@ui5/webcomponents-icons/dist/survey.js";

export default function ReadinessValidatorPage() {
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [result, setResult] = useState<ModelReadinessResult | null>(null);

  const { data: models = [], isLoading: isLoadingModels } = useQuery({
    queryKey: ["models"],
    queryFn: () => sdk.admin.getModels(),
  });

  const validatorMutation = useMutation({
    mutationFn: async () => {
      if (!selectedModelId) return null;
      return sdk.admin.validateModel(selectedModelId);
    },
    onSuccess: (data) => {
      if (data) setResult(data);
    },
  });

  const runValidation = () => {
    if (!selectedModelId) return;
    validatorMutation.mutate();
  };

  return (
    <PageLayout
      title="Readiness Validator"
      subtitle="Check model configuration completeness before activation"
      icon="survey"
      iconColor="var(--icon-orange)"
    >
      <div className="page-container">
        <ApiErrorBanner message={validatorMutation.isError ? formatApiError(validatorMutation.error) : undefined} />

        <Card header={<CardHeader titleText="Readiness Validator" subtitleText="Select a model to validate its configuration" />}>
            <div style={{ padding: "1rem" }}>
                <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "1rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", alignItems: "end" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <Label>Model</Label>
                            <Select 
                                disabled={isLoadingModels} 
                                value={selectedModelId} 
                                style={{ width: "100%" }}
                                onChange={(e) => {
                                    const selected = e.detail.selectedOption as unknown as { value: string };
                                    setSelectedModelId(selected.value);
                                    if (!selected.value) setResult(null);
                                }}
                            >
                                <Option value="">-- Select Model --</Option>
                                {models.map((m: Model) => (
                                    <Option key={m.id} value={m.id}>
                                        {m.code} - {m.name}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                        <Button 
                            design="Emphasized" 
                            className="button-hover-scale"
                            disabled={!selectedModelId || validatorMutation.isPending} 
                            onClick={runValidation}
                            icon="refresh"
                        >
                            {validatorMutation.isPending ? "Validating..." : "Run Validator"}
                        </Button>
                    </div>

                    {validatorMutation.isPending && (
                        <FlexBox justifyContent="Center" style={{ padding: "2rem" }}>
                            <BusyIndicator active text="Validating model..." />
                        </FlexBox>
                    )}

                    {result && !validatorMutation.isPending && (
                        <div style={{ marginTop: "1rem" }}>
                            <Title level="H4" style={{ marginBottom: "1rem" }}>Validation Results</Title>
                            <ObjectStatus 
                                state={result.status === "PASS" ? "Positive" : "Critical"}
                                style={{ marginBottom: "1rem", display: "block" }}
                            >
                                Status: {result.status} - {result.status === "PASS" ? "Model is ready" : "Issues found"}
                            </ObjectStatus>

                            {result.issues.length > 0 && (
                                <Table
                                    headerRow={
                                        <TableHeaderRow>
                                            <TableHeaderCell><Label style={{ fontWeight: "bold" }}>Code</Label></TableHeaderCell>
                                            <TableHeaderCell><Label style={{ fontWeight: "bold" }}>Scope</Label></TableHeaderCell>
                                            <TableHeaderCell><Label style={{ fontWeight: "bold" }}>Message / Path</Label></TableHeaderCell>
                                        </TableHeaderRow>
                                    }
                                >
                                    {result.issues.map((issue: ModelReadinessIssue, idx: number) => (
                                        <TableRow key={`${issue.code}-${idx}`}>
                                            <TableCell>
                                                <Title level="H5" style={{ color: "var(--sapNegativeColor)" }}>{issue.code}</Title>
                                            </TableCell>
                                            <TableCell>
                                                {issue.scope && <ObjectStatus state="Critical">{issue.scope}</ObjectStatus>}
                                            </TableCell>
                                            <TableCell>
                                                <FlexBox direction={FlexBoxDirection.Column}>
                                                    <Label style={{ whiteSpace: "normal" }}>{issue.message}</Label>
                                                    {issue.path && (
                                                        <span style={{ marginTop: "0.25rem", fontSize: "0.75rem", fontFamily: "monospace", color: "var(--sapContent_LabelColor)" }}>
                                                            {issue.path}
                                                        </span>
                                                    )}
                                                </FlexBox>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </Table>
                            )}

                            {selectedModelId && (
                                <div style={{ marginTop: "1.5rem" }}>
                                    <Link 
                                        to={`/admin/models/${selectedModelId}`} 
                                        style={{ color: "var(--sapLinkColor)", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.25rem" }}
                                    >
                                        Open model configuration <Icon name="navigation-right-arrow" style={{ fontSize: "0.75rem" }} />
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </FlexBox>
            </div>
        </Card>
      </div>
    </PageLayout>
  );
}
