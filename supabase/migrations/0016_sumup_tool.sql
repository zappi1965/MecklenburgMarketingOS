CREATE TYPE "public"."sumup_txn_source" AS ENUM('manual', 'sumup');--> statement-breakpoint
CREATE TYPE "public"."sumup_txn_status" AS ENUM('pending', 'paid', 'failed');--> statement-breakpoint
CREATE TABLE "sumup_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"description" text,
	"status" "sumup_txn_status" DEFAULT 'pending' NOT NULL,
	"source" "sumup_txn_source" DEFAULT 'manual' NOT NULL,
	"checkout_id" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sumup_transactions" ADD CONSTRAINT "sumup_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sumup_transactions_tenant_idx" ON "sumup_transactions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sumup_transactions_status_idx" ON "sumup_transactions" USING btree ("tenant_id","status");