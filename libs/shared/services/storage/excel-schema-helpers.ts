import type { Question } from '../../models/schema-engine/question.types';

// ─────────────────────────────────────────────────────────────────────────────
// SHARED SCHEMA HELPERS
// Used by Excel generator and parsing services.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A flat lookup map of every question in the schema, indexed by its ID.
 * Populated once by buildQuestionMap() and then reused throughout the script.
 */
export const questionMap: Map<string, Question> = new Map();

/**
 * Walk every section/subSection/step/question in the schema tree and register
 * each question (and all its nested sub-questions) into the shared questionMap.
 *
 * Call this once at startup, before any question lookups are needed.
 */
export function buildQuestionMap(sections: any[]): void {
  questionMap.clear();
  sections.forEach(s =>
    s.subSections.forEach((ss: any) =>
      ss.steps.forEach((step: any) => step.questions.forEach((q: any) => indexQuestion(q)))
    )
  );
}

/**
 * Register a single question (and all its children) into the questionMap.
 * Recursively handles: items[].conditional, addQuestions, and field.
 */
export function indexQuestion(q: any): void {
  questionMap.set(q.id, q);
  if (q.items)
    q.items.forEach((i: any) => {
      if (i.conditional) indexQuestion(i.conditional);
    });
  if (Array.isArray(q.addQuestions)) q.addQuestions.forEach((child: any) => indexQuestion(child));
  if (q.field) indexQuestion(q.field);
}

/**
 * Returns true when a question cannot be represented statically in Excel.
 * Dynamic child questions are handled by their parent renderer and are not
 * rendered as independent Excel rows.
 */
export function isQuestionUnsupportedForExcel(q: any): boolean {
  if (!q) return true;
  if (Array.isArray(q.addQuestions) && q.addQuestions.length > 0) return true;
  if (q.dataType === 'input-array') return true;
  if (q.dataType === 'fields-group') return true;

  if (Array.isArray(q.items)) {
    if (q.items.some((item: any) => item?.itemConditionOptions)) return true;
  }

  return false;
}

/**
 * Resolve the option items for a question.
 *
 * Handles the special 'itemsFromAnswer' pattern where a question's options
 * are dynamically derived from the answers of a previously-asked question.
 * In that case, we look up the source question in questionMap and return its items.
 */
export function resolveQuestionItems(q: Question): any[] {
  const anyQ = q as any;
  if (anyQ.items && Array.isArray(anyQ.items)) {
    if (
      anyQ.items.length > 0 &&
      anyQ.items[0] &&
      typeof anyQ.items[0] === 'object' &&
      'itemsFromAnswer' in anyQ.items[0]
    ) {
      const refQ = questionMap.get(anyQ.items[0].itemsFromAnswer);
      if (refQ && (refQ as any).items) return (refQ as any).items as any[];
    }
    return anyQ.items;
  }
  return [];
}

/**
 * Creates a "Smart Mock Payload" for a subsection based on the current data.
 * It iterates through steps and only adds question IDs to the mock if the step's
 * condition is met (or if it has no condition).
 *
 * This mock is then used to generate a Joi schema that correctly identifies
 * missing required fields for "active" questions while ignoring "hidden" ones.
 *
 * @param subSection The subsection containing steps and conditions
 * @param currentData The current data extracted from Excel or JSON
 * @returns A record of question IDs mapped to null, representing the "expected" keys
 */
export function getSmartMockPayload(subSection: any, currentData: Record<string, any>): Record<string, null> {
  const mockPayload: Record<string, null> = {};

  if (!subSection || !subSection.steps) return mockPayload;

  subSection.steps.forEach((step: any) => {
    let isStepActive = true;
    if (step.condition) {
      const parentValue = currentData[step.condition.id];
      isStepActive = Array.isArray(step.condition.options) && step.condition.options.includes(parentValue);
    }

    if (isStepActive && step.questions) {
      step.questions.forEach((q: any) => {
        if (isQuestionUnsupportedForExcel(q)) return;
        mockPayload[q.id] = null;
      });
    }
  });

  return mockPayload;
}
