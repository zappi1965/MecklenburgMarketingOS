import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./platform";
import { loyaltyMembers } from "./loyalty";

/**
 * Tool: Marketing Automation (Flows). A trigger → action engine over loyalty
 * members (e.g. "reached 100 points → send email" or "first scan → +20 bonus").
 * Evaluated in batches (idempotent per member+flow). Gated by
 * `tool_active(tenant_id, 'automation')`.
 */

export const AUTOMATION_TOOL_KEY = "automation" as const;

export const automationTrigger = pgEnum("automation_trigger", [
  "first_scan", // member has at least one scan
  "points_reached", // member's balance >= threshold
]);

export const automationAction = pgEnum("automation_action", [
  "add_points", // credit loyalty bonus points
  "send_email", // email the member (consent required)
]);

/** automation_flows — a configured trigger → action rule. */
export const automationFlows = pgTable(
  "automation_flows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    triggerType: automationTrigger("trigger_type").notNull(),
    // For points_reached.
    threshold: integer("threshold"),
    actionType: automationAction("action_type").notNull(),
    // For add_points.
    actionPoints: integer("action_points"),
    // For send_email.
    emailSubject: text("email_subject"),
    emailBody: text("email_body"),
    isActive: boolean("is_active").notNull().default(true),
    runCount: integer("run_count").notNull().default(0),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantIdx: index("automation_flows_tenant_idx").on(t.tenantId),
  }),
);

/** automation_runs — immutable log; ensures each member fires a flow once. */
export const automationRuns = pgTable(
  "automation_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    flowId: uuid("flow_id")
      .notNull()
      .references(() => automationFlows.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => loyaltyMembers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    runUnique: uniqueIndex("automation_runs_flow_member_unique").on(
      t.flowId,
      t.memberId,
    ),
  }),
);
