"use server";

import { z } from "zod";
import { and, asc, eq, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  surveyAnswers,
  surveyQuestions,
  surveyResponses,
  surveys,
  tenantTools,
} from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/rbac";
import { generateToken } from "@/lib/nanoid";
import { type ActionResult, ok, err, fromZodError } from "@/lib/result";

const TOOL_KEY = "surveys";

async function surveysActive(tenantId: string): Promise<boolean> {
  const rows = await db
    .select({ status: tenantTools.status })
    .from(tenantTools)
    .where(
      and(eq(tenantTools.tenantId, tenantId), eq(tenantTools.toolKey, TOOL_KEY)),
    )
    .limit(1);
  const s = rows[0]?.status;
  return s === "active" || s === "trial";
}

// =============================================================================
// Admin (surveys:manage)
// =============================================================================

const surveySchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
});

export async function createSurvey(
  input: z.input<typeof surveySchema>,
): Promise<ActionResult<{ id: string; token: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "surveys:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = surveySchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const token = generateToken();
  const [survey] = await db
    .insert(surveys)
    .values({
      tenantId: ctx.tenant.id,
      token,
      title: parsed.data.title,
      description: parsed.data.description || null,
    })
    .returning({ id: surveys.id, token: surveys.token });

  revalidatePath("/dashboard/surveys");
  return ok({ id: survey.id, token: survey.token });
}

const questionSchema = z.object({
  surveyId: z.string().uuid(),
  label: z.string().min(1).max(200),
  type: z.enum(["rating", "text", "choice"]),
  options: z.array(z.string().min(1).max(80)).max(10).optional(),
  required: z.boolean().default(true),
});

export async function addQuestion(
  input: z.input<typeof questionSchema>,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "surveys:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  // Validate ownership + choice options.
  const survey = await db
    .select({ id: surveys.id })
    .from(surveys)
    .where(
      and(eq(surveys.id, parsed.data.surveyId), eq(surveys.tenantId, ctx.tenant.id)),
    )
    .limit(1);
  if (!survey[0]) return err("Umfrage nicht gefunden.");
  if (parsed.data.type === "choice" && (!parsed.data.options || parsed.data.options.length < 2)) {
    return err("Eine Auswahlfrage braucht mindestens zwei Optionen.");
  }

  const existing = await db
    .select({ value: count() })
    .from(surveyQuestions)
    .where(eq(surveyQuestions.surveyId, parsed.data.surveyId));
  const position = existing[0]?.value ?? 0;

  const [question] = await db
    .insert(surveyQuestions)
    .values({
      tenantId: ctx.tenant.id,
      surveyId: parsed.data.surveyId,
      label: parsed.data.label,
      type: parsed.data.type,
      options: parsed.data.type === "choice" ? parsed.data.options : null,
      required: parsed.data.required,
      position,
    })
    .returning({ id: surveyQuestions.id });

  revalidatePath(`/dashboard/surveys/${parsed.data.surveyId}`);
  return ok({ id: question.id });
}

export async function deleteQuestion(
  questionId: string,
): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "surveys:manage");
  if (!guard.allowed) return err(guard.reason);

  await db
    .delete(surveyQuestions)
    .where(
      and(
        eq(surveyQuestions.id, questionId),
        eq(surveyQuestions.tenantId, ctx.tenant.id),
      ),
    );
  revalidatePath("/dashboard/surveys");
  return ok(undefined);
}

export async function setSurveyActive(
  surveyId: string,
  isActive: boolean,
): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "surveys:manage");
  if (!guard.allowed) return err(guard.reason);

  await db
    .update(surveys)
    .set({ isActive })
    .where(and(eq(surveys.id, surveyId), eq(surveys.tenantId, ctx.tenant.id)));
  revalidatePath("/dashboard/surveys");
  return ok(undefined);
}

// =============================================================================
// Public: load + submit
// =============================================================================

export type PublicSurvey = {
  title: string;
  description: string | null;
  questions: {
    id: string;
    label: string;
    type: "rating" | "text" | "choice";
    options: string[] | null;
    required: boolean;
  }[];
};

export async function getSurvey(
  token: string,
): Promise<ActionResult<PublicSurvey>> {
  const rows = await db
    .select()
    .from(surveys)
    .where(and(eq(surveys.token, token), eq(surveys.isActive, true)))
    .limit(1);
  const survey = rows[0];
  if (!survey || survey.deletedAt) return err("Umfrage nicht gefunden.");

  const questions = await db
    .select()
    .from(surveyQuestions)
    .where(eq(surveyQuestions.surveyId, survey.id))
    .orderBy(asc(surveyQuestions.position));

  return ok({
    title: survey.title,
    description: survey.description,
    questions: questions.map((q) => ({
      id: q.id,
      label: q.label,
      type: q.type,
      options: (q.options as string[] | null) ?? null,
      required: q.required,
    })),
  });
}

const submitSchema = z.object({
  token: z.string().min(1),
  answers: z
    .array(z.object({ questionId: z.string().uuid(), value: z.string() }))
    .max(50),
});

export async function submitSurvey(
  input: z.input<typeof submitSchema>,
): Promise<ActionResult<{ thanks: true }>> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const surveyRows = await db
    .select()
    .from(surveys)
    .where(and(eq(surveys.token, parsed.data.token), eq(surveys.isActive, true)))
    .limit(1);
  const survey = surveyRows[0];
  if (!survey || survey.deletedAt) return err("Umfrage nicht gefunden.");
  if (!(await surveysActive(survey.tenantId))) {
    return err("Diese Umfrage ist derzeit nicht verfügbar.");
  }

  const questions = await db
    .select()
    .from(surveyQuestions)
    .where(eq(surveyQuestions.surveyId, survey.id));
  const byId = new Map(questions.map((q) => [q.id, q]));
  const answerMap = new Map(parsed.data.answers.map((a) => [a.questionId, a.value]));

  // Required validation.
  for (const q of questions) {
    if (q.required) {
      const v = answerMap.get(q.id);
      if (!v || !v.trim()) {
        return err(`Bitte beantworte: ${q.label}`);
      }
    }
  }

  const [response] = await db
    .insert(surveyResponses)
    .values({ tenantId: survey.tenantId, surveyId: survey.id })
    .returning({ id: surveyResponses.id });

  const answerRows = parsed.data.answers
    .filter((a) => byId.has(a.questionId) && a.value.trim())
    .map((a) => {
      const q = byId.get(a.questionId)!;
      const num = q.type === "rating" ? Number(a.value) : null;
      return {
        tenantId: survey.tenantId,
        responseId: response.id,
        questionId: a.questionId,
        answerText: q.type === "rating" ? null : a.value.slice(0, 2000),
        answerNumber: Number.isFinite(num) ? num : null,
      };
    });
  if (answerRows.length) {
    await db.insert(surveyAnswers).values(answerRows);
  }

  return ok({ thanks: true });
}
