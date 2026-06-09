CREATE TYPE "public"."retention_campaign_status" AS ENUM('draft', 'sent');--> statement-breakpoint
CREATE TABLE "retention_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"inactive_days" integer DEFAULT 60 NOT NULL,
	"bonus_points" integer DEFAULT 50 NOT NULL,
	"send_email" boolean DEFAULT true NOT NULL,
	"message" text,
	"status" "retention_campaign_status" DEFAULT 'draft' NOT NULL,
	"targeted_count" integer DEFAULT 0 NOT NULL,
	"last_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retention_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"emailed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "retention_campaigns" ADD CONSTRAINT "retention_campaigns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_targets" ADD CONSTRAINT "retention_targets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_targets" ADD CONSTRAINT "retention_targets_campaign_id_retention_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."retention_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_targets" ADD CONSTRAINT "retention_targets_member_id_loyalty_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."loyalty_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "retention_campaigns_tenant_idx" ON "retention_campaigns" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "retention_targets_campaign_member_unique" ON "retention_targets" USING btree ("campaign_id","member_id");