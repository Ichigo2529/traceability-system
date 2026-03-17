import { useState, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageLayout } from "@traceability/ui";
import { useToast } from "../../hooks/useToast";
import { ReassignMaterialDialog } from "../../components/material/ReassignMaterialDialog";
import { Package } from "lucide-react";

export function SetRecoveryPage() {
  const [reassignOpen, setReassignOpen] = useState(false);
  const [containerId, setContainerId] = useState("");
  const [fromSetRunId, setFromSetRunId] = useState("");
  const { showToast } = useToast();

  const handleOpenReassign = useCallback(() => {
    if (!containerId.trim() || !fromSetRunId.trim()) return;
    setReassignOpen(true);
  }, [containerId, fromSetRunId]);

  const handleReassignSuccess = useCallback(
    ({ reason }: { reason: string }) => {
      showToast(`Container ${containerId} moved successfully. Reason: ${reason}`);
      setContainerId("");
      setFromSetRunId("");
    },
    [containerId, showToast]
  );

  return (
    <PageLayout
      title="Set Recovery Tools"
      subtitle={
        <div className="flex items-center gap-2">
          <span>Administrative tools for correcting material assignments and set run state</span>
        </div>
      }
      icon="wrench"
      iconColor="orange"
    >
      <div className="flex flex-col gap-6 max-w-[720px]">
        <Alert variant="destructive" className="rounded-lg">
          <AlertDescription>These operations are audited. Use only when necessary.</AlertDescription>
        </Alert>

        <Card>
          <CardHeader className="flex flex-row items-start gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Reassign Material Container</CardTitle>
              <p className="text-sm text-muted-foreground m-0">Move a container from one set_run to another</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Container ID *</Label>
              <Input
                value={containerId}
                onChange={(e) => setContainerId(e.target.value ?? "")}
                placeholder="e.g. CTN-001"
                className="w-full"
              />
            </div>
            <div className="grid gap-2">
              <Label>Source Set Run ID *</Label>
              <Input
                value={fromSetRunId}
                onChange={(e) => setFromSetRunId(e.target.value ?? "")}
                placeholder="e.g. SR-2026-0001"
                className="w-full"
              />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Button onClick={handleOpenReassign} disabled={!containerId.trim() || !fromSetRunId.trim()}>
                <Package className="h-4 w-4 mr-2" />
                Open Reassign Dialog
              </Button>
              <span className="text-xs text-muted-foreground">
                You will select the target set and reason in the next step
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <ReassignMaterialDialog
        open={reassignOpen}
        containerId={containerId}
        fromSetRunId={fromSetRunId}
        onClose={() => setReassignOpen(false)}
        onSuccess={handleReassignSuccess}
      />
    </PageLayout>
  );
}

export default SetRecoveryPage;
