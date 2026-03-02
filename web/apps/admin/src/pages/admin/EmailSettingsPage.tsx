import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EmailSettings } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import { PageLayout, Section } from "@traceability/ui";
import {
  Button,
  CheckBox,
  Dialog,
  FlexBox,
  FlexBoxAlignItems,
  Form,
  FormItem,
  Input,
  Label,
  MessageStrip,
  Title,
} from "@ui5/webcomponents-react";
import { useToast } from "../../hooks/useToast";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";

const EMPTY_SETTINGS: EmailSettings = {
  smtp_host: "",
  smtp_port: 587,
  smtp_user: "",
  smtp_password: "",
  smtp_from_email: "",
  smtp_from_name: "",
  smtp_secure: false,
  enabled: true,
};

export function EmailSettingsPage() {
  const queryClient = useQueryClient();
  const { showToast, ToastComponent } = useToast();
  const [model, setModel] = useState<EmailSettings>(EMPTY_SETTINGS);
  const [openTestDialog, setOpenTestDialog] = useState(false);
  const [testRecipient, setTestRecipient] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["email-settings"],
    queryFn: () => sdk.admin.getEmailSettings(),
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setModel({
        ...EMPTY_SETTINGS,
        ...settingsQuery.data,
        // Keep masked placeholder empty to avoid resubmitting bullets.
        smtp_password: "",
      });
    }
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (payload: EmailSettings) => sdk.admin.updateEmailSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-settings"] });
      showToast("SMTP settings saved");
    },
  });

  const testMutation = useMutation({
    mutationFn: (to: string) => sdk.admin.sendTestEmail(to),
    onSuccess: (result) => {
      showToast(`Test email status: ${result.status}`);
      setOpenTestDialog(false);
    },
  });

  const mergedError = localError || formatApiError(settingsQuery.error || saveMutation.error || testMutation.error);

  const onSave = () => {
    setLocalError(null);
    if (!model.smtp_host?.trim()) {
      setLocalError("SMTP host is required");
      return;
    }
    if (!model.smtp_from_email?.trim()) {
      setLocalError("Sender email is required");
      return;
    }
    if (!Number.isFinite(Number(model.smtp_port)) || Number(model.smtp_port) <= 0) {
      setLocalError("SMTP port must be a positive number");
      return;
    }

    saveMutation.mutate({
      ...model,
      smtp_port: Number(model.smtp_port),
    });
  };

  const onSendTest = () => {
    setLocalError(null);
    if (!testRecipient.trim()) {
      setLocalError("Please provide test recipient email");
      return;
    }
    testMutation.mutate(testRecipient.trim());
  };

  return (
    <PageLayout title="Email Settings" subtitle="Configure SMTP sender and test real email delivery" icon="email" iconColor="indigo">
      <ApiErrorBanner message={mergedError || undefined} />

      <Section
        title="SMTP Configuration"
        subtitle="These settings are used by workflow alerts (material request and future modules)"
        variant="card"
      >
        <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem", justifyContent: "flex-end" }}>
          <Button design="Transparent" onClick={() => setOpenTestDialog(true)}>
            Send Test Email
          </Button>
          <Button design="Emphasized" onClick={onSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </FlexBox>

        {!settingsQuery.data && (
          <MessageStrip design="Information" hideCloseButton>
            No SMTP setting found yet. Fill in values and click Save Settings.
          </MessageStrip>
        )}

        <Form layout="S1 M2 L2 XL2" labelSpan="S12 M12 L12 XL12">
          <FormItem labelContent={<Label required>SMTP Host</Label>}>
            <Input value={model.smtp_host ?? ""} onInput={(e) => setModel((m) => ({ ...m, smtp_host: e.target.value }))} />
          </FormItem>
          <FormItem labelContent={<Label required>SMTP Port</Label>}>
            <Input
              type="Number"
              value={String(model.smtp_port ?? 587)}
              onInput={(e) => setModel((m) => ({ ...m, smtp_port: Number(e.target.value || 0) }))}
            />
          </FormItem>
          <FormItem labelContent={<Label>SMTP Username</Label>}>
            <Input value={model.smtp_user ?? ""} onInput={(e) => setModel((m) => ({ ...m, smtp_user: e.target.value }))} />
          </FormItem>
          <FormItem labelContent={<Label>SMTP Password</Label>}>
            <Input
              type="Password"
              placeholder={settingsQuery.data?.smtp_password ? "Leave blank to keep existing password" : "Enter SMTP password"}
              value={model.smtp_password ?? ""}
              onInput={(e) => setModel((m) => ({ ...m, smtp_password: e.target.value }))}
            />
          </FormItem>
          <FormItem labelContent={<Label required>Sender Email</Label>}>
            <Input
              value={model.smtp_from_email ?? ""}
              onInput={(e) => setModel((m) => ({ ...m, smtp_from_email: e.target.value }))}
            />
          </FormItem>
          <FormItem labelContent={<Label>Sender Name</Label>}>
            <Input value={model.smtp_from_name ?? ""} onInput={(e) => setModel((m) => ({ ...m, smtp_from_name: e.target.value }))} />
          </FormItem>
          <FormItem labelContent={<Label>TLS/SSL</Label>}>
            <CheckBox
              text="Use secure SMTP connection"
              checked={Boolean(model.smtp_secure)}
              onChange={(e) => setModel((m) => ({ ...m, smtp_secure: e.target.checked }))}
            />
          </FormItem>
          <FormItem labelContent={<Label>Enabled</Label>}>
            <CheckBox
              text="Enable email alerts"
              checked={Boolean(model.enabled)}
              onChange={(e) => setModel((m) => ({ ...m, enabled: e.target.checked }))}
            />
          </FormItem>
        </Form>
      </Section>

      <Dialog
        open={openTestDialog}
        headerText="Send Test Email"
        onClose={() => setOpenTestDialog(false)}
        footer={
          <FlexBox style={{ gap: "0.5rem", padding: "0.5rem" }}>
            <Button design="Emphasized" onClick={onSendTest} disabled={testMutation.isPending}>
              {testMutation.isPending ? "Sending..." : "Send"}
            </Button>
            <Button design="Transparent" onClick={() => setOpenTestDialog(false)} disabled={testMutation.isPending}>
              Cancel
            </Button>
          </FlexBox>
        }
      >
        <div style={{ padding: "1rem", minWidth: "24rem" }}>
          <Title level="H6">Recipient</Title>
          <Input
            type="Email"
            placeholder="name@example.com"
            value={testRecipient}
            onInput={(e) => setTestRecipient(e.target.value)}
            style={{ width: "100%", marginTop: "0.5rem" }}
          />
        </div>
      </Dialog>

      <ToastComponent />
    </PageLayout>
  );
}

export default EmailSettingsPage;
