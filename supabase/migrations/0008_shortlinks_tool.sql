CREATE TABLE "short_link_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"short_link_id" uuid NOT NULL,
	"ip_hash" text,
	"user_agent" text,
	"referer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "short_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" text NOT NULL,
	"destination_url" text NOT NULL,
	"title" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"click_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "short_link_clicks" ADD CONSTRAINT "short_link_clicks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "short_link_clicks" ADD CONSTRAINT "short_link_clicks_short_link_id_short_links_id_fk" FOREIGN KEY ("short_link_id") REFERENCES "public"."short_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "short_links" ADD CONSTRAINT "short_links_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "short_link_clicks_link_idx" ON "short_link_clicks" USING btree ("short_link_id");--> statement-breakpoint
CREATE UNIQUE INDEX "short_links_code_unique" ON "short_links" USING btree ("code");--> statement-breakpoint
CREATE INDEX "short_links_tenant_idx" ON "short_links" USING btree ("tenant_id");