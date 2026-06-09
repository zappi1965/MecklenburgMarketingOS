CREATE TYPE "public"."social_post_status" AS ENUM('draft', 'scheduled', 'published');--> statement-breakpoint
CREATE TABLE "social_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"content" text NOT NULL,
	"channels" jsonb NOT NULL,
	"status" "social_post_status" DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "social_posts_tenant_idx" ON "social_posts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "social_posts_schedule_idx" ON "social_posts" USING btree ("tenant_id","scheduled_at");