import { registerAlertTemplate } from "../alert";

function safe(value: unknown, fallback = "-"): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function baseHtml(input: {
  title: string;
  subtitle: string;
  status: string;
  requestNo?: unknown;
  dmiNo?: unknown;
  actorName?: unknown;
  note?: unknown;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; line-height:1.5; color:#222;">
      <h2 style="margin:0 0 8px 0;">${input.title}</h2>
      <p style="margin:0 0 16px 0; color:#555;">${input.subtitle}</p>
      <table cellpadding="6" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr><td><strong>Request No.</strong></td><td>${safe(input.requestNo)}</td></tr>
        <tr><td><strong>DMI No.</strong></td><td>${safe(input.dmiNo)}</td></tr>
        <tr><td><strong>Status</strong></td><td>${safe(input.status)}</td></tr>
        <tr><td><strong>Updated By</strong></td><td>${safe(input.actorName)}</td></tr>
      </table>
      ${
        input.note
          ? `<p style="margin-top:12px;"><strong>Note:</strong> ${safe(input.note)}</p>`
          : ""
      }
      <p style="margin-top:16px; color:#666; font-size:12px;">Traceability System Notification</p>
    </div>
  `;
}

export function registerMaterialRequestAlertTemplates() {
  registerAlertTemplate("material_request_created", {
    subject: (ctx) => `[Material Request] New request ${safe(ctx.requestNo)}`,
    html: (ctx) =>
      baseHtml({
        title: "New Material Request Submitted",
        subtitle: "A new request is waiting for approval.",
        status: "REQUESTED",
        requestNo: ctx.requestNo,
        dmiNo: ctx.dmiNo,
        actorName: ctx.actorName,
      }),
  });

  registerAlertTemplate("material_request_approved", {
    subject: (ctx) => `[Material Request] Approved ${safe(ctx.requestNo)}`,
    html: (ctx) =>
      baseHtml({
        title: "Material Request Approved",
        subtitle: "Your request has been approved by Store.",
        status: "APPROVED",
        requestNo: ctx.requestNo,
        dmiNo: ctx.dmiNo,
        actorName: ctx.actorName,
      }),
  });

  registerAlertTemplate("material_request_rejected", {
    subject: (ctx) => `[Material Request] Rejected ${safe(ctx.requestNo)}`,
    html: (ctx) =>
      baseHtml({
        title: "Material Request Rejected",
        subtitle: "Your request has been rejected.",
        status: "REJECTED",
        requestNo: ctx.requestNo,
        dmiNo: ctx.dmiNo,
        actorName: ctx.actorName,
        note: ctx.reason,
      }),
  });

  registerAlertTemplate("material_request_dispatched", {
    subject: (ctx) => `[Material Request] Dispatch to Forklift ${safe(ctx.requestNo)}`,
    html: (ctx) =>
      baseHtml({
        title: "Request Dispatched to Forklift",
        subtitle: "Please proceed with material picking.",
        status: "APPROVED",
        requestNo: ctx.requestNo,
        dmiNo: ctx.dmiNo,
        actorName: ctx.actorName,
      }),
  });

  registerAlertTemplate("material_request_issued", {
    subject: (ctx) => `[Material Request] Issued ${safe(ctx.requestNo)}`,
    html: (ctx) =>
      baseHtml({
        title: "Material Issued",
        subtitle: "Material has been issued and is ready for production receipt confirmation.",
        status: "ISSUED",
        requestNo: ctx.requestNo,
        dmiNo: ctx.dmiNo,
        actorName: ctx.actorName,
      }),
  });

  registerAlertTemplate("material_request_receipt_confirmed", {
    subject: (ctx) => `[Material Request] Production ACK ${safe(ctx.requestNo)}`,
    html: (ctx) =>
      baseHtml({
        title: "Production Receipt Confirmed",
        subtitle: "Production has confirmed receipt for this issued request.",
        status: "ISSUED",
        requestNo: ctx.requestNo,
        dmiNo: ctx.dmiNo,
        actorName: ctx.actorName,
      }),
  });

  registerAlertTemplate("material_request_forklift_ack", {
    subject: (ctx) => `[Material Request] Forklift ACK ${safe(ctx.requestNo)}`,
    html: (ctx) =>
      baseHtml({
        title: "Forklift Acknowledgement Completed",
        subtitle: "Forklift team has acknowledged completion for this request.",
        status: "ISSUED",
        requestNo: ctx.requestNo,
        dmiNo: ctx.dmiNo,
        actorName: ctx.actorName,
      }),
  });

  registerAlertTemplate("material_request_pending_reminder", {
    subject: (ctx) => `[Material Request] Reminder pending approval ${safe(ctx.requestNo)}`,
    html: (ctx) =>
      baseHtml({
        title: "Pending Approval Reminder",
        subtitle: "This request is still waiting for approval action.",
        status: "REQUESTED",
        requestNo: ctx.requestNo,
        dmiNo: ctx.dmiNo,
        actorName: "Reminder Scheduler",
        note: `Reminder cadence: every ${safe(ctx.intervalHours, "24")} hour(s)`,
      }),
  });

  registerAlertTemplate("material_request_withdrawn", {
    subject: (ctx) => `[Material Request] Withdrawn ${safe(ctx.requestNo)}`,
    html: (ctx) =>
      baseHtml({
        title: "Material Request Withdrawn",
        subtitle: "This request was withdrawn and will no longer proceed in workflow.",
        status: "CANCELLED",
        requestNo: ctx.requestNo,
        dmiNo: ctx.dmiNo,
        actorName: ctx.actorName,
        note: ctx.reason,
      }),
  });
}
