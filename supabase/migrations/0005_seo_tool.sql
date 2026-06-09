CREATE TABLE "seo_keywords" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"keyword" text NOT NULL,
	"location" text,
	"target_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"business_name" text NOT NULL,
	"description" text,
	"street" text,
	"postal_code" text,
	"city" text,
	"country" text DEFAULT 'DE' NOT NULL,
	"phone" text,
	"website" text,
	"category" text,
	"opening_hours" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_rank_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"keyword_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seo_keywords" ADD CONSTRAINT "seo_keywords_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_profiles" ADD CONSTRAINT "seo_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_rank_snapshots" ADD CONSTRAINT "seo_rank_snapshots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_rank_snapshots" ADD CONSTRAINT "seo_rank_snapshots_keyword_id_seo_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."seo_keywords"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "seo_keywords_tenant_idx" ON "seo_keywords" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seo_profiles_tenant_unique" ON "seo_profiles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "seo_rank_snapshots_keyword_idx" ON "seo_rank_snapshots" USING btree ("keyword_id");