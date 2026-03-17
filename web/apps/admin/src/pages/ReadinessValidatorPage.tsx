import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { sdk } from "../context/AuthContext";
import { Model, ModelReadinessResult, ModelReadinessIssue } from "@traceability/sdk";
import { ApiErrorBanner } from "../components/ui/ApiErrorBanner";
import { formatApiError } from "../lib/errors";
import { PageLayout } from "@traceability/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, ChevronRight } from "lucide-react";

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
      subtitle={
        <div className="flex items-center gap-2">
          <span className="indicator-live" />
          <span>Check model configuration completeness before activation</span>
        </div>
      }
      icon="survey"
      iconColor="var(--icon-orange)"
    >
      <div className="page-container">
        <ApiErrorBanner message={validatorMutation.isError ? formatApiError(validatorMutation.error) : undefined} />

        <Card>
          <CardHeader>
            <CardTitle>Readiness Validator</CardTitle>
            <p className="text-sm text-muted-foreground m-0">Select a model to validate its configuration</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
              <div className="flex flex-col gap-2">
                <Label>Model</Label>
                <Select
                  disabled={isLoadingModels}
                  value={selectedModelId}
                  onValueChange={(v) => {
                    setSelectedModelId(v);
                    if (!v) setResult(null);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="-- Select Model --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">-- Select Model --</SelectItem>
                    {models.map((m: Model) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.code} - {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="button-hover-scale"
                disabled={!selectedModelId || validatorMutation.isPending}
                onClick={runValidation}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {validatorMutation.isPending ? "Validating..." : "Run Validator"}
              </Button>
            </div>

            {validatorMutation.isPending && (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Validating model...</span>
              </div>
            )}

            {result && !validatorMutation.isPending && (
              <div className="mt-4">
                <h4 className="text-base font-semibold mb-4">Validation Results</h4>
                <div
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium mb-4 ${result.status === "PASS" ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-destructive/15 text-destructive"}`}
                >
                  Status: {result.status} - {result.status === "PASS" ? "Model is ready" : "Issues found"}
                </div>

                {result.issues.length > 0 && (
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left font-semibold p-3">Code</th>
                          <th className="text-left font-semibold p-3">Scope</th>
                          <th className="text-left font-semibold p-3">Message / Path</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.issues.map((issue: ModelReadinessIssue, idx: number) => (
                          <tr key={`${issue.code}-${idx}`} className="border-t">
                            <td className="p-3">
                              <span className="font-medium text-destructive">{issue.code}</span>
                            </td>
                            <td className="p-3">
                              {issue.scope && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-destructive/15 text-destructive">
                                  {issue.scope}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col">
                                <Label className="whitespace-normal font-normal">{issue.message}</Label>
                                {issue.path && (
                                  <span className="mt-1 text-xs font-mono text-muted-foreground">{issue.path}</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {selectedModelId && (
                  <div className="mt-6">
                    <Link
                      to={`/admin/models/${selectedModelId}`}
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Open model configuration <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
