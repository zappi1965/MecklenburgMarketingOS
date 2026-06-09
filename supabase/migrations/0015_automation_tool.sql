CREATE TYPE "public"."automation_action" AS ENUM('add_points', 'send_email');--> statement-breakpoint
CREATE TYPE "public"."automation_trigger" AS ENUM('first_scan', 'points_reached');--> statement-breakpoint
CREATE TABLE "automation_flows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"trigger_type" "automation_trigger" NOT NULL,
	"threshold" integer,
	"action_type" "automation_action" NOT NULL,
	"action_points" integer,
	"email_subject" text,
	"email_body" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"run_count" integer DEFAULT 0 NOT NULL,
	"last_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"flow_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "automation_flows" ADD CONSTRAINT "automation_flows_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_flow_id_automation_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."automation_flows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_member_id_loyalty_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."loyalty_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "automation_flows_tenant_idx" ON "automation_flows" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_runs_flow_member_unique" ON "automation_runs" USING btree ("flow_id","member_id");