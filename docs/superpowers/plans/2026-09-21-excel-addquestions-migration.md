# Excel `addQuestions` Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Excel template generation, export, and import work with the normalized `addQuestions[]` schema while excluding dynamic child questions from static Excel files.

**Architecture:** Reuse the schema normalization already implemented by `feat/certifications-number-new-question`: legacy `addQuestion` is converted to `addQuestions[]` at the schema boundary. Excel code then reads only `addQuestions[]` and uses one shared structural predicate to omit unsupported dynamic/repeating structures. For checkbox arrays, retain the parent answer shape but omit child answers so backend validation still receives an object array.

**Tech Stack:** TypeScript, Joi, ExcelJS, Jest.

---

### Task 1: Bring the normalized schema contract onto the Excel branch

**Files:**
- Modify: `libs/shared/models/schema-engine/question.types.ts`
- Modify: `libs/shared/models/schema-engine/schema.model.ts`
- Modify: `libs/shared/models/schema-engine/schema.validations.ts`
- Modify: `libs/shared/models/schema-engine/question.validator.ts`
- Test: `libs/shared/models/schema-engine/schema.model.spec.ts`

- [ ] Port the certification branch behavior: define `addQuestions?: Question[]` for `checkbox-array` and `fields-group`, normalize legacy `addQuestion` to a one-element array, then remove the legacy property from the normalized schema.
- [ ] Port validator handling for multiple child questions, including `input-array` certification children and optional child answers.
- [ ] Run the schema-model and validator tests and confirm both native `addQuestions[]` and legacy input normalize correctly.

### Task 2: Centralize Excel unsupported-question detection

**Files:**
- Modify: `libs/shared/services/storage/excel-schema-helpers.ts`
- Test: `libs/shared/services/storage/excel-schema-helpers.spec.ts`

- [ ] Add structural helpers that detect `addQuestions`, `condition`, `conditional`, `itemsFromAnswer`, `itemConditionOptions`, and repeatable/dynamic question structures without checking question IDs or labels.
- [ ] Ensure helpers operate on normalized questions; do not read `addQuestion` in Excel code.
- [ ] Add tests for a checkbox question with two `addQuestions`, a fields-group with child questions, and a plain static question.

### Task 3: Update Excel import

**Files:**
- Modify: `libs/shared/services/storage/excel-import.service.ts`
- Test: `libs/shared/services/storage/excel-import.service.spec.ts` (create if absent)

- [ ] Omit dynamic child rows from imported payloads.
- [ ] For a checkbox-array with `addQuestions`, import selected parent options in the normalized object-array shape using `checkboxAnswerId ?? question.id`, without importing child answers.
- [ ] Continue importing ordinary static questions and preserve current validation/error behavior.
- [ ] Add tests proving dynamic child columns are ignored and static answers remain importable.

### Task 4: Update Excel export and template generation

**Files:**
- Modify: `libs/shared/services/storage/excel-export.service.ts`
- Modify: `apps/innovations/_services/excel-innovation.service.ts` only where orchestration passes raw, non-normalized schema
- Test: `apps/innovations/_services/excel-innovation.service.spec.ts`

- [ ] Exclude `addQuestions` children and other unsupported dynamic structures from templates and exported workbooks.
- [ ] Keep parent checkbox selections visible where they are statically representable; do not create rows for generated child questions.
- [ ] Verify export handles records containing legacy and normalized payload shapes through the schema model boundary.

### Task 5: Regression verification

**Files:**
- Modify: relevant Excel/schema tests only when assertions need the normalized contract.

- [ ] Run backend schema-engine tests.
- [ ] Run Excel helper, import, export, and innovation-service tests.
- [ ] Run TypeScript lint/type-check and the backend test command used by CI.
- [ ] Confirm no Excel implementation file references `addQuestion`; the only legacy reference should be schema-boundary normalization and compatibility tests.

### Task 6: Frontend contract check

**Files:**
- Review only: `src/modules/stores/innovation/innovation-record/202405/ir-v3-types.ts`
- Review only: `src/modules/shared/forms/engine/models/wizard-engine-irv3-schema.model.ts`

- [ ] Confirm the FE certification branch changes are already present or identify the exact commits/files to port; do not duplicate the runtime migration in the Excel-only change.
- [ ] Run the FE form-engine tests if the FE branch must be updated to consume the same schema version.
