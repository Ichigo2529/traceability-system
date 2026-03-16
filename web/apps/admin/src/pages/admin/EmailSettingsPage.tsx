import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EmailSettings, ReminderPolicy } from "@traceability/sdk";
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

const EMPTY_REMINDER_POLICY: ReminderPolicy = {
  enabled: false,
  cadence_mode: "daily",
  interval_hours: 24,
  max_reminders: null,
};

export function EmailSettingsPage() {
  const queryClient = useQueryClient();
  const { showToast, ToastComponent } = useToast();
  const [model, setModel] = useState<EmailSettings>(EMPTY_SETTINGS);
  const [openTestDialog, setOpenTestDialog] = useState(false);
  const [testRecipient, setTestRecipient] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [reminderPolicy, setReminderPolicy] = useState<ReminderPolicy>(EMPTY_REMINDER_POLICY);

  const settingsQuery = useQuery({
    queryKey: ["email-settings"],
    queryFn: () => sdk.admin.getEmailSettings(),
  });
  const reminderPolicyQuery = useQuery({
    queryKey: ["email-reminder-policy"],
    queryFn: () => sdk.admin.getReminderPolicy(),
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
  useEffect(() => {
    if (reminderPolicyQuery.data?.policy) {
      setReminderPolicy({
        ...EMPTY_REMINDER_POLICY,
        ...reminderPolicyQuery.data.policy,
      });
    }
  }, [reminderPolicyQuery.data]);

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
  const saveReminderPolicyMutation = useMutation({
    mutationFn: (policy: ReminderPolicy) => sdk.admin.updateReminderPolicy(policy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-reminder-policy"] });
      showToast("Reminder policy saved");
    },
  });

  const apiError =
    settingsQuery.error ??
    reminderPolicyQuery.error ??
    saveMutation.error ??
    testMutation.error ??
    saveReminderPolicyMutation.error;
  const mergedError = localError || (apiError ? formatApiError(apiError) : null);

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

  const onSaveReminderPolicy = () => {
    setLocalError(null);
    const intervalHours = Number(reminderPolicy.interval_hours || 0);
    if (!Number.isFinite(intervalHours) || intervalHours <= 0) {
      setLocalError("Reminder interval must be a positive number");
      return;
    }
    const maxReminders =
      reminderPolicy.max_reminders == null || reminderPolicy.max_reminders === 0
        ? null
        : Math.max(1, Number(reminderPolicy.max_reminders));
    saveReminderPolicyMutation.mutate({
      ...reminderPolicy,
      interval_hours: intervalHours,
      max_reminders: maxReminders,
    });
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

      <Section
        title="Pending Approval Reminder"
        subtitle="Automatic reminder emails for requests still waiting for approval"
        variant="card"
      >
        <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem", justifyContent: "flex-end" }}>
          <Button design="Emphasized" onClick={onSaveReminderPolicy} disabled={saveReminderPolicyMutation.isPending}>
            {saveReminderPolicyMutation.isPending ? "Saving..." : "Save Reminder Policy"}
          </Button>
        </FlexBox>
        <Form layout="S1 M2 L2 XL2" labelSpan="S12 M12 L12 XL12">
          <FormItem labelContent={<Label>Enabled</Label>}>
            <CheckBox
              text="Enable reminder emails for pending approvals"
              checked={Boolean(reminderPolicy.enabled)}
              onChange={(e) => setReminderPolicy((prev) => ({ ...prev, enabled: e.target.checked }))}
            />
          </FormItem>
          <FormItem labelContent={<Label>Cadence Mode</Label>}>
            <CheckBox
              text="Use daily cadence (every 24 hours)"
              checked={reminderPolicy.cadence_mode === "daily"}
              onChange={(e) =>
                setReminderPolicy((prev) => ({
                  ...prev,
                  cadence_mode: e.target.checked ? "daily" : "interval_hours",
                  interval_hours: e.target.checked ? 24 : prev.interval_hours || 24,
                }))
              }
            />
          </FormItem>
          <FormItem labelContent={<Label>Interval (hours)</Label>}>
            <Input
              type="Number"
              value={String(reminderPolicy.interval_hours ?? 24)}
              disabled={reminderPolicy.cadence_mode === "daily"}
              onInput={(e) => setReminderPolicy((prev) => ({ ...prev, interval_hours: Number(e.target.value || 0) }))}
            />
          </FormItem>
          <FormItem labelContent={<Label>Max Reminders (optional)</Label>}>
            <Input
              type="Number"
              placeholder="Leave empty for unlimited"
              value={reminderPolicy.max_reminders == null ? "" : String(reminderPolicy.max_reminders)}
              onInput={(e) =>
                setReminderPolicy((prev) => ({
                  ...prev,
                  max_reminders: e.target.value ? Number(e.target.value) : null,
                }))
              }
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
