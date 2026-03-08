CREATE TABLE "audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gemeente_id" varchar(64) NOT NULL,
	"naam" varchar(255) NOT NULL,
	"doel_urls" jsonb NOT NULL,
	"viewports" jsonb DEFAULT '[{"name":"desktop","w":1280,"h":1024},{"name":"mobiel","w":375,"h":667}]' NOT NULL,
	"status" varchar(32) DEFAULT 'nieuw' NOT NULL,
	"aangemaakt_op" timestamp DEFAULT now(),
	"voltooid_op" timestamp,
	"aangemaakt_door" uuid
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"audit_id" uuid NOT NULL,
	"type" varchar(16) NOT NULL,
	"wcag_criterium" varchar(16),
	"wcag_niveau" varchar(4),
	"bron_engine" varchar(32),
	"selector" text,
	"context" text,
	"boodschap" text NOT NULL,
	"pagina_url" varchar(2048),
	"viewport" varchar(32),
	"ernst" varchar(16) DEFAULT 'gemiddeld'
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(128) NOT NULL,
	"verloopt_op" timestamp NOT NULL,
	"ingetrokken" boolean DEFAULT false NOT NULL,
	"aangemaakt_op" timestamp DEFAULT now(),
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_id" uuid NOT NULL,
	"url" varchar(2048) NOT NULL,
	"pagina_naam" varchar(255),
	"viewport" varchar(32),
	"scanner_laag" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'wachtend' NOT NULL,
	"resultaat" jsonb,
	"foutmelding" text,
	"gestart_op" timestamp,
	"voltooid_op" timestamp
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(128) NOT NULL,
	"verloopt_op" timestamp NOT NULL,
	"ip_adres" varchar(45),
	"user_agent" varchar(512),
	"aangemaakt_op" timestamp DEFAULT now(),
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gemeente_id" varchar(64) NOT NULL,
	"email" varchar(255) NOT NULL,
	"naam" varchar(255),
	"rol" varchar(32) DEFAULT 'auditor' NOT NULL,
	"password_hash" varchar(255),
	"oidc_subject" varchar(255),
	"oidc_issuer" varchar(512),
	"mislukte_pogingen" varchar(8) DEFAULT '0' NOT NULL,
	"geblokkerd_tot" timestamp,
	"laatst_ingelogd_op" timestamp,
	"aangemaakt_op" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_oidc_subject_unique" UNIQUE("oidc_subject")
);
--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_aangemaakt_door_users_id_fk" FOREIGN KEY ("aangemaakt_door") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;