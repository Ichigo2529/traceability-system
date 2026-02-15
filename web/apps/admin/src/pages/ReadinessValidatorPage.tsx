import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { sdk } from "../context/AuthContext";
import { Model, ModelReadinessResult, ModelReadinessIssue } from "@traceability/sdk";
import { ApiErrorBanner } from "../components/ui/ApiErrorBanner";
import { formatApiError } from "../lib/errors";
import { CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Readiness Validator</h1>
          <p className="text-sm text-gray-500">Check model configuration completeness before activation.</p>
        </div>

        {result && (
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${result.status === "PASS" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {result.status === "PASS" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{result.status}</span>
          </div>
        )}
      </div>

      <ApiErrorBanner message={validatorMutation.isError ? formatApiError(validatorMutation.error) : undefined} />

      <div className="bg-white border rounded-lg shadow-sm p-4 flex flex-col md:flex-row md:items-end gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
          <select className="w-full px-3 py-2 border rounded-md" disabled={isLoadingModels} value={selectedModelId} onChange={(e) => setSelectedModelId(e.target.value)}>
            <option value="">-- Select Model --</option>
            {models.map((m: Model) => (
              <option key={m.id} value={m.id}>
                {m.code} - {m.name}
              </option>
            ))}
          </select>
        </div>

        <button type="button" disabled={!selectedModelId || validatorMutation.isPending} onClick={runValidation} className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#1134A6] text-white rounded-md hover:bg-[#0D2A84] disabled:opacity-50">
          <RefreshCw size={16} className={validatorMutation.isPending ? "animate-spin" : ""} />
          <span>{validatorMutation.isPending ? "Validating..." : "Run Validator"}</span>
        </button>
      </div>

      {result && (
        <div className="bg-white border rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Validation Result</h2>

          {result.issues.length === 0 ? (
            <p className="text-sm text-emerald-700">No issue found. Model configuration is ready.</p>
          ) : (
            <div className="space-y-2">
              {result.issues.map((issue: ModelReadinessIssue, idx: number) => (
                <div key={`${issue.code}-${idx}`} className="border border-red-100 bg-red-50 rounded-md p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-red-800">{issue.code}</span>
                    {issue.scope && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">{issue.scope}</span>}
                  </div>
                  <p className="text-red-700">{issue.message}</p>
                  {issue.path && <p className="mt-1 text-xs text-red-600">Path: <span className="font-mono">{issue.path}</span></p>}
                </div>
              ))}
            </div>
          )}

          {selectedModelId && (
            <div className="mt-4">
              <Link to={`/admin/models/${selectedModelId}`} className="text-sm text-[#1134A6] hover:text-[#0A1F66] underline">
                Open model configuration
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
