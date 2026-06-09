import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./platform";

/**
 * Tool: Feedback & Surveys (a Typeform / SurveyMonkey style survey builder).
 * Public token-based forms collect responses. Gated by
 * `tool_active(tenant_id, 'surveys')`.
 */

export const SURVEYS_TOOL_KEY = "surveys" as const;

export const questionType = pgEnum("survey_question_type", [
  "rating", // 1–5
  "text", // free text
  "choice", // single choice from options
]);

/** surveys — a questionnaire with a public token link. */
export const surveys = pgTable(
  "surveys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    tokenUnique: uniqueIndex("surveys_token_unique").on(t.token),
    tenantIdx: index("surveys_tenant_idx").on(t.tenantId),
  }),
);

/** survey_questions — ordered questions of a survey. */
export const surveyQuestions = pgTable(
  "survey_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    surveyId: uuid("survey_id")
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    type: questionType("type").notNull().default("rating"),
    // For 'choice': array of option strings.
    options: jsonb("options"),
    position: integer("position").notNull().default(0),
    required: boolean("required").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    surveyIdx: index("survey_questions_survey_idx").on(t.surveyId),
  }),
);

/** survey_responses — one submission. `deletedAt` for DSGVO. */
export const surveyResponses = pgTable(
  "survey_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    surveyId: uuid("survey_id")
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    surveyIdx: index("survey_responses_survey_idx").on(t.surveyId),
  }),
);

/** survey_answers — answers belonging to a response. */
export const surveyAnswers = pgTable(
  "survey_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    responseId: uuid("response_id")
      .notNull()
      .references(() => surveyResponses.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => surveyQuestions.id, { onDelete: "cascade" }),
    answerText: text("answer_text"),
    answerNumber: integer("answer_number"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    responseIdx: index("survey_answers_response_idx").on(t.responseId),
    questionIdx: index("survey_answers_question_idx").on(t.questionId),
  }),
);
