import { AlertRecipient, AlertSendStatus, sendEmail } from "./mail";

type AlertTemplateContext = Record<string, unknown>;

type AlertTemplate = {
  subject: (context: AlertTemplateContext) => string;
  html: (context: AlertTemplateContext) => string;
};

const templateRegistry = new Map<string, AlertTemplate>();

export function registerAlertTemplate(id: string, template: AlertTemplate) {
  templateRegistry.set(id, template);
}

export async function sendAlertEmail(input: {
  templateId: string;
  recipients: AlertRecipient[];
  context: AlertTemplateContext;
}): Promise<AlertSendStatus> {
  const template = templateRegistry.get(input.templateId);
  if (!template) {
    console.error(`[alert] template not found: ${input.templateId}`);
    return "FAILED";
  }

  const subject = template.subject(input.context);
  const html = template.html(input.context);
  return sendEmail({ recipients: input.recipients, subject, html });
}
