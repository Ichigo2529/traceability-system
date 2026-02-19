import { useState, useCallback } from "react";
import {
  Label,
  Input,
  Button,
  MessageStrip,
  FlexBox,
  FlexBoxDirection,
  FlexBoxAlignItems,
  Card,
  CardHeader,
  Text,
} from "@ui5/webcomponents-react";
import { PageLayout } from "@traceability/ui";
import { useToast } from "../../hooks/useToast";
import { ReassignMaterialDialog } from "../../components/material/ReassignMaterialDialog";

import "@ui5/webcomponents-icons/dist/wrench.js";
import "@ui5/webcomponents-icons/dist/shipping-status.js";

// ─── Page ─────────────────────────────────────────────────

export function SetRecoveryPage() {
  // ─── Reassign Material ──────────────────────────────────
  const [reassignOpen, setReassignOpen] = useState(false);
  const [containerId, setContainerId] = useState("");
  const [fromSetRunId, setFromSetRunId] = useState("");
  const { showToast, ToastComponent } = useToast();

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
      subtitle="Administrative tools for correcting material assignments and set run state"
      icon="wrench"
      iconColor="orange"
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          maxWidth: "720px",
        }}
      >
        {/* ─── Audit warning ─────────────────────────────── */}
        <MessageStrip
          design="Critical"
          hideCloseButton
          style={{ borderRadius: "8px" }}
        >
          These operations are audited. Use only when necessary.
        </MessageStrip>



        {/* ─── Reassign Material Card ────────────────────── */}
        <Card
          header={
            <CardHeader
              titleText="Reassign Material Container"
              subtitleText="Move a container from one set_run to another"
              avatar={
                <span
                  data-ui5-icon="shipping-status"
                  style={{ fontSize: "1.5rem" }}
                />
              }
            />
          }
        >
          <div style={{ padding: "1rem 1rem 1.25rem" }}>
            <FlexBox
              direction={FlexBoxDirection.Column}
              style={{ gap: "0.75rem" }}
            >
              <div>
                <Label required>Container ID</Label>
                <Input
                  value={containerId}
                  onInput={(e: any) => setContainerId(e.target.value ?? "")}
                  placeholder="e.g. CTN-001"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <Label required>Source Set Run ID</Label>
                <Input
                  value={fromSetRunId}
                  onInput={(e: any) => setFromSetRunId(e.target.value ?? "")}
                  placeholder="e.g. SR-2026-0001"
                  style={{ width: "100%" }}
                />
              </div>

              <FlexBox
                alignItems={FlexBoxAlignItems.Center}
                style={{ gap: "0.5rem", marginTop: "0.25rem" }}
              >
                <Button
                  design="Emphasized"
                  icon="shipping-status"
                  onClick={handleOpenReassign}
                  disabled={
                    !containerId.trim() || !fromSetRunId.trim()
                  }
                >
                  Open Reassign Dialog
                </Button>

                <Text style={{ fontSize: "0.75rem", opacity: 0.6 }}>
                  You will select the target set and reason in the next step
                </Text>
              </FlexBox>
            </FlexBox>
          </div>
        </Card>
      </div>

      {/* ─── Reassign Dialog ─────────────────────────────── */}
      <ReassignMaterialDialog
        open={reassignOpen}
        containerId={containerId}
        fromSetRunId={fromSetRunId}
        onClose={() => setReassignOpen(false)}
        onSuccess={handleReassignSuccess}
      />
      <ToastComponent />
    </PageLayout>
  );
}

export default SetRecoveryPage;
