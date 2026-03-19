import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EmailSettings, ReminderPolicy } from "@traceability/sdk";
import { sdk } from "../../context/AuthContext";
import { PageLayout, Section } from "@traceability/ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  const { showToast } = useToast();
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
    <PageLayout
      title="Email Settings"
      subtitle="Configure SMTP sender and test real email delivery"
      icon="email"
      iconColor="indigo"
    >
      <ApiErrorBanner message={mergedError || undefined} />

      <Section
        title="SMTP Configuration"
        subtitle="These settings are used by workflow alerts (material request and future modules)"
        variant="card"
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
        >
          <Alert>
            <AlertDescription>
              Email alerts are currently {model.enabled ? "enabled" : "disabled"}.
              {model.enabled
                ? ` Messages will send from ${model.smtp_from_email || "the configured sender"} via ${model.smtp_host || "the configured SMTP host"}.`
                : " Save and enable SMTP settings before workflow notifications can be delivered."}
            </AlertDescription>
          </Alert>

          <div className="mb-4 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpenTestDialog(true)}>
              Send Test Email
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save Settings"}
            </Button>
          </div>

          {!settingsQuery.data && (
            <Alert className="mb-4">
              <AlertDescription>
                No saved SMTP configuration yet. Fill in the sender settings, then save to enable email delivery.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="smtp-host">SMTP Host *</Label>
              <Input
                id="smtp-host"
                name="smtp-host"
                value={model.smtp_host ?? ""}
                onChange={(e) => setModel((m) => ({ ...m, smtp_host: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="smtp-port">SMTP Port *</Label>
              <Input
                id="smtp-port"
                name="smtp-port"
                type="number"
                value={String(model.smtp_port ?? 587)}
                onChange={(e) => setModel((m) => ({ ...m, smtp_port: Number(e.target.value || 0) }))}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="smtp-username">SMTP Username</Label>
              <Input
                id="smtp-username"
                name="smtp-username"
                value={model.smtp_user ?? ""}
                onChange={(e) => setModel((m) => ({ ...m, smtp_user: e.target.value }))}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="smtp-password">SMTP Password</Label>
              <Input
                id="smtp-password"
                name="smtp-password"
                type="password"
                autoComplete="new-password"
                placeholder={
                  settingsQuery.data?.smtp_password ? "Leave blank to keep existing password" : "Enter SMTP password"
                }
                value={model.smtp_password ?? ""}
                onChange={(e) => setModel((m) => ({ ...m, smtp_password: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="smtp-from-email">Sender Email *</Label>
              <Input
                id="smtp-from-email"
                name="smtp-from-email"
                type="email"
                value={model.smtp_from_email ?? ""}
                onChange={(e) => setModel((m) => ({ ...m, smtp_from_email: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="smtp-from-name">Sender Name</Label>
              <Input
                id="smtp-from-name"
                name="smtp-from-name"
                value={model.smtp_from_name ?? ""}
                onChange={(e) => setModel((m) => ({ ...m, smtp_from_name: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox
                id="smtp_secure"
                checked={Boolean(model.smtp_secure)}
                onCheckedChange={(v) => setModel((m) => ({ ...m, smtp_secure: !!v }))}
              />
              <Label htmlFor="smtp_secure" className="cursor-pointer font-normal">
                Use secure SMTP connection
              </Label>
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox
                id="smtp_enabled"
                checked={Boolean(model.enabled)}
                onCheckedChange={(v) => setModel((m) => ({ ...m, enabled: !!v }))}
              />
              <Label htmlFor="smtp_enabled" className="cursor-pointer font-normal">
                Enable email alerts
              </Label>
            </div>
          </div>
        </form>
      </Section>

      <Section
        title="Pending Approval Reminder"
        subtitle="Automatic reminder emails for requests still waiting for approval"
        variant="card"
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSaveReminderPolicy();
          }}
        >
          <Alert>
            <AlertDescription>
              Reminder policy is currently {reminderPolicy.enabled ? "enabled" : "disabled"}.
              {reminderPolicy.enabled
                ? reminderPolicy.cadence_mode === "daily"
                  ? " Pending approvals will receive one reminder every 24 hours."
                  : ` Pending approvals will receive reminders every ${reminderPolicy.interval_hours || 0} hour(s).`
                : " Pending approvals will not receive reminder emails until this policy is enabled."}
            </AlertDescription>
          </Alert>

          <div className="mb-4 flex items-center justify-end gap-2">
            <Button type="submit" disabled={saveReminderPolicyMutation.isPending}>
              {saveReminderPolicyMutation.isPending ? "Saving…" : "Save Reminder Policy"}
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox
                id="reminder_enabled"
                checked={Boolean(reminderPolicy.enabled)}
                onCheckedChange={(v) => setReminderPolicy((prev) => ({ ...prev, enabled: !!v }))}
              />
              <Label htmlFor="reminder_enabled" className="cursor-pointer font-normal">
                Enable reminder emails for pending approvals
              </Label>
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox
                id="cadence_daily"
                checked={reminderPolicy.cadence_mode === "daily"}
                onCheckedChange={(v) =>
                  setReminderPolicy((prev) => ({
                    ...prev,
                    cadence_mode: v ? "daily" : "interval_hours",
                    interval_hours: v ? 24 : prev.interval_hours || 24,
                  }))
                }
              />
              <Label htmlFor="cadence_daily" className="cursor-pointer font-normal">
                Use daily cadence (every 24 hours)
              </Label>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reminder-interval-hours">Interval (hours)</Label>
              <Input
                id="reminder-interval-hours"
                type="number"
                value={String(reminderPolicy.interval_hours ?? 24)}
                disabled={reminderPolicy.cadence_mode === "daily"}
                onChange={(e) =>
                  setReminderPolicy((prev) => ({ ...prev, interval_hours: Number(e.target.value || 0) }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reminder-max-reminders">Max Reminders (optional)</Label>
              <Input
                id="reminder-max-reminders"
                type="number"
                placeholder="Leave empty for unlimited"
                value={reminderPolicy.max_reminders == null ? "" : String(reminderPolicy.max_reminders)}
                onChange={(e) =>
                  setReminderPolicy((prev) => ({
                    ...prev,
                    max_reminders: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              />
            </div>
          </div>
        </form>
      </Section>

      <Dialog open={openTestDialog} onOpenChange={setOpenTestDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>Enter recipient email to send a test message.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSendTest();
            }}
          >
            <div className="grid gap-2 py-4">
              <Label htmlFor="test-recipient">Recipient</Label>
              <Input
                id="test-recipient"
                name="test-recipient"
                type="email"
                placeholder="name@example.com"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                className="w-full"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpenTestDialog(false)}
                disabled={testMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={testMutation.isPending}>
                {testMutation.isPending ? "Sending…" : "Send"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}

export default EmailSettingsPage;
