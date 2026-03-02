CREATE TABLE IF NOT EXISTS "email_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "smtp_host" varchar(255) NOT NULL,
  "smtp_port" integer NOT NULL DEFAULT 587,
  "smtp_user" varchar(255),
  "smtp_password" varchar(500),
  "smtp_from_email" varchar(255) NOT NULL,
  "smtp_from_name" varchar(255),
  "smtp_secure" boolean NOT NULL DEFAULT false,
  "enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
