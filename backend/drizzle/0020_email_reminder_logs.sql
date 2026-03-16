CREATE TABLE IF NOT EXISTS "email_reminder_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "flow_code" varchar(120) NOT NULL,
  "material_request_id" uuid NOT NULL REFERENCES "material_requests"("id") ON DELETE cascade,
  "recipient_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "recipient_email" varchar(255),
  "template_id" varchar(120) NOT NULL,
  "status" varchar(30) NOT NULL,
  "error_message" text,
  "policy_snapshot" jsonb,
  "sent_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_email_reminder_logs_flow_code" ON "email_reminder_logs" ("flow_code");
CREATE INDEX IF NOT EXISTS "idx_email_reminder_logs_request_id" ON "email_reminder_logs" ("material_request_id");
CREATE INDEX IF NOT EXISTS "idx_email_reminder_logs_sent_at" ON "email_reminder_logs" ("sent_at");
