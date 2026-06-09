CREATE TYPE "public"."gift_card_status" AS ENUM('active', 'redeemed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."gift_card_txn_type" AS ENUM('issue', 'redeem', 'topup', 'cancel');--> statement-breakpoint
CREATE TABLE "gift_card_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"gift_card_id" uuid NOT NULL,
	"type" "gift_card_txn_type" NOT NULL,
	"amount_cents" integer NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" text NOT NULL,
	"initial_amount_cents" integer NOT NULL,
	"balance_cents" integer NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"recipient_name" text,
	"recipient_email" text,
	"message" text,
	"status" "gift_card_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_gift_card_id_gift_cards_id_fk" FOREIGN KEY ("gift_card_id") REFERENCES "public"."gift_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gift_card_transactions_card_idx" ON "gift_card_transactions" USING btree ("gift_card_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gift_cards_code_unique" ON "gift_cards" USING btree ("code");--> statement-breakpoint
CREATE INDEX "gift_cards_tenant_idx" ON "gift_cards" USING btree ("tenant_id");