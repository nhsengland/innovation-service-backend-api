/**
 * ExcelImportService — Pure Excel → JSON parser for Innovation Record templates.
 *
 * This service contains ZERO database logic, ZERO Node.js process dependencies.
 * It takes an ExcelJS Workbook + the IR Schema and returns structured section payloads
 * ready to be saved by any caller (CLI script, API controller, test harness).
 */

import { injectable } from 'inversify';
import type * as ExcelJS from 'exceljs';
import { InnovationErrorsEnum, BadRequestError } from '../../errors';
import type { Question, RadioGroup, CheckboxArray, FieldsGroup } from '../../models/schema-engine/question.types';
import type { SchemaModel } from '../../models/schema-engine/schema.model';
import { buildQuestionMap, resolveQuestionItems, getSmartMockPayload } from './excel-schema-helpers';

// ──────────────────────────────────────────────────────────────
// COLUMN LAYOUT
// ──────────────────────────────────────────────────────────────
const COL_ANSWER  = 3; // C — user-visible answer
const COL_SUB     = 4; // D — sub-answer for addQuestion
const COL_ID      = 6; // F — question / option ID anchor
const COL_HELPER  = 7; // G — backend-resolved value (VLOOKUP / IF formula result)
const COL_SUB_H   = 8; // H — sub-answer backend helper
const COL_H2      = 9; // I — second answer backend helper for fields-group

// ──────────────────────────────────────────────────────────────
// PUBLIC TYPES
// ──────────────────────────────────────────────────────────────

/** Result for a single parsed section. */
export interface ParsedSection {
    sectionKey: string;
    /** Raw extracted payload from Excel (question IDs → values). */
    rawPayload: Record<string, any>;
    /** Calculated fields derived by SchemaModel. */
    calculatedFields: Record<string, string>;
    /** Final merged payload (raw + calculated), ready for DB save. */
    finalPayload: Record<string, any>;
    /** Joi validation issues (non-blocking). Empty array if valid. */
    validationIssues: string[];
}

/** Full result returned by parseWorkbook(). */
export interface ExcelImportResult {
    /** Total unique question/option IDs found in the spreadsheet. */
    indexedIds: number;
    /** Parsed sections with data. */
    sections: ParsedSection[];
    /** Section keys that were found to be completely empty in the source. */
    emptySections: string[];
}

@injectable()
export class ExcelImportService {
    /**
     * Extracts the schema version from the uploaded Excel workbook, if present.
     */
    public extractSchemaVersion(workbook: ExcelJS.Workbook): number | undefined {
        const metaSheet = workbook.getWorksheet('_Metadata');
        if (!metaSheet) return undefined;
        
        const versionLabel = this.cellStr(metaSheet.getCell('A1'));
        if (versionLabel === 'SCHEMA_VERSION') {
            const versionVal = this.cellStr(metaSheet.getCell('A2'));
            const parsed = parseInt(versionVal, 10);
            return isNaN(parsed) ? undefined : parsed;
        }
        return undefined;
    }

    /**
     * Parse a filled-in Excel workbook and extract section payloads.
     *
     * This is the single entry point for all callers. It:
     *   1. Builds a row index from Column F (question IDs)
     *   2. Walks the schema section by section
     *   3. Extracts answers by dataType (text, radio, checkbox, fields-group)
     *   4. Validates each section against SchemaModel
     *   5. Merges calculated fields
     *   6. Returns structured results — NO side effects, NO database writes
     *
     * @param workbook   An already-loaded ExcelJS workbook
     * @param schema     The raw IR schema (IR_SCHEMA or from DB)
     * @param schemaModel  A SchemaModel instance for validation & calculated fields
     * @returns ExcelImportResult with all parsed sections
     */
    public parseWorkbook(
        workbook: ExcelJS.Workbook,
        schema: any,
        schemaModel: SchemaModel
    ): ExcelImportResult {
        // Ensure question map is populated
        buildQuestionMap(schema.sections);

        // Find the "Innovation Record" worksheet
        const sheet = workbook.getWorksheet('Innovation Record');
        if (!sheet) {
            throw new BadRequestError(InnovationErrorsEnum.INNOVATION_RECORD_INVALID_EXCEL_FILE);
        }

        // Build the row index from Column F
        const rowIndex = this.buildRowIndex(sheet);

        const sections: ParsedSection[] = [];
        const emptySections: string[] = [];

        for (const section of schema.sections) {
            for (const subSection of section.subSections) {
                const sectionKey = subSection.id as string;
                const rawPayload: Record<string, any> = {};

                // Flatten all questions across all steps in this subsection
                const allQuestions: Question[] = subSection.steps.flatMap((step: any) => step.questions);
                this.extractQuestions(sheet, rowIndex, allQuestions, rawPayload);

                if (Object.keys(rawPayload).length === 0) {
                    emptySections.push(sectionKey);
                    continue;
                }

                // Validate
                const validationIssues: string[] = [];
                try {
                    // Create a 'smart' mock payload that only includes questions from steps 
                    // whose conditions are met. This ensures we catch missing required fields
                    // without flagging hidden conditional fields.
                    const mockPayload = getSmartMockPayload(subSection, rawPayload);

                    const joiSchema = schemaModel.getSubSectionPayloadValidation(sectionKey, mockPayload);
                    
                    const { error } = joiSchema.validate(rawPayload, { abortEarly: false, allowUnknown: true });
                    if (error) {
                        error.details.forEach(d => validationIssues.push(d.message));
                    }
                } catch (err: any) {
                    validationIssues.push(`Schema validation error: ${err?.message}`);
                }

                // Calculated fields
                const calculatedFields = schemaModel.getCalculatedFields(sectionKey, rawPayload);
                const finalPayload = { ...rawPayload, ...calculatedFields };

                sections.push({ sectionKey, rawPayload, calculatedFields, finalPayload, validationIssues });
            }
        }

        return {
            indexedIds: rowIndex.size,
            sections,
            emptySections
        };
    }

    /**
     * Convenience method: extract only the INNOVATION_DESCRIPTION section from a workbook.
     * Used for CREATE mode where we need the registration payload before creating the innovation.
     */
    public parseRegistrationPayload(
        workbook: ExcelJS.Workbook,
        schema: any,
        schemaModel: SchemaModel
    ): { payload: Record<string, any>; validationIssues: string[] } {
        buildQuestionMap(schema.sections);

        const sheet = workbook.getWorksheet('Innovation Record');
        if (!sheet) throw new BadRequestError(InnovationErrorsEnum.INNOVATION_RECORD_INVALID_EXCEL_FILE);

        const rowIndex = this.buildRowIndex(sheet);

        // Find INNOVATION_DESCRIPTION subsection
        const descSection = schema.sections
            .flatMap((s: any) => s.subSections)
            .find((ss: any) => ss.id === 'INNOVATION_DESCRIPTION');

        if (!descSection) throw new Error('INNOVATION_DESCRIPTION section not found in schema.');

        const rawPayload: Record<string, any> = {};
        const descQuestions: Question[] = descSection.steps.flatMap((step: any) => step.questions);
        this.extractQuestions(sheet, rowIndex, descQuestions, rawPayload);

        const calculatedFields = schemaModel.getCalculatedFields('INNOVATION_DESCRIPTION', rawPayload);
        const payload = { ...rawPayload, ...calculatedFields };

        const validationIssues: string[] = [];
        try {
            // Create a 'smart' mock payload that only includes questions from steps 
            // whose conditions are met. This ensures we catch missing required fields
            // without flagging hidden conditional fields.
            const mockPayload = getSmartMockPayload(descSection, rawPayload);

            const joiSchema = schemaModel.getSubSectionPayloadValidation('INNOVATION_DESCRIPTION', mockPayload);
            
            const { error } = joiSchema.validate(rawPayload, { abortEarly: false, allowUnknown: true });
            if (error) error.details.forEach(d => validationIssues.push(d.message));
        } catch (err: any) {
            validationIssues.push(`Validation error: ${err?.message}`);
        }

        return { payload, validationIssues };
    }

    /**
     * Scans the entire Excel sheet once to build a lookup index of Question IDs to Row Numbers.
     * 
     * Our strategy relies on **Machine-Readable Metadata**: we don't assume data is at a fixed row.
     * Instead, we look at **Column F (ID)** for every row. If we find a Question or Option ID, 
     * we record that row number. This allows the parser to find data even if the user inserted 
     * extra rows or if the layout shifted.
     * 
     * @example
     * // If row 10 has "IR_FIELD_NAME" in Column F, the map will contain: { "IR_FIELD_NAME": [10] }
     * 
     * @param sheet - The Excel worksheet to scan.
     * @returns A Map where keys are Question IDs and values are arrays of row numbers where they appear.
     */
    private buildRowIndex(sheet: ExcelJS.Worksheet): Map<string, number[]> {
        const index = new Map<string, number[]>();
        let count = 0;
        sheet.eachRow((row, rowNumber) => {
            const id = this.cellStr(row.getCell(COL_ID));
            if (id) {
                if (!index.has(id)) index.set(id, []);
                index.get(id)!.push(rowNumber);
                count++;
            }
        });
        console.log(`[ExcelImport] Indexed ${count} total question/option IDs from Column F.`);
        return index;
    }

    /**
     * Safely extracts and cleans the string value from an Excel cell.
     * 
     * This method handles various Excel data types:
     * 1. **Empty Cells:** Returns an empty string if the cell is null or undefined.
     * 2. **Formulas:** If the cell contains a formula (e.g., `=VLOOKUP(...)`), it attempts to read the 
     *    cached `.result`. If the result is missing (unevaluated), it logs a warning and returns an empty string.
     * 3. **Static Values:** Converts numbers, dates, or shared strings directly to a trimmed string.
     * 4. **Complex Objects:** Logs a warning if an unexpected object (like RichText) is encountered.
     * 
     * @example
     * // Direct text "  England  " -> "England"
     * // Formula { formula: "A1", result: "Yes" } -> "Yes"
     * // Formula { formula: "A1", result: undefined } -> "" (with console warning)
     * 
     * @param cell - The ExcelJS cell object to read from.
     * @returns The cleaned string content of the cell.
     */
    private cellStr(cell: ExcelJS.Cell): string {
        if (!cell || cell.value === null || cell.value === undefined) return '';
        
        // Handle Formula objects
        if (typeof cell.value === 'object') {
            const valObj = cell.value as any;
            if ('formula' in valObj) {
                const result = valObj.result;
                if (result === null || result === undefined) {
                    console.warn(`[ExcelImport] Unevaluated formula at ${cell.address}. Raw Object: ${JSON.stringify(valObj)}`);
                    return '';
                }
                return String(result).trim();
            }
            // If it's some other type of object (like a RichText object), log it
            console.warn(`[ExcelImport] Unexpected object value at ${cell.address}: ${JSON.stringify(valObj)}`);
        }
        
        // Handle Shared Strings / Direct values
        return String(cell.value).trim();
    }

    /**
     * Recursively walks through a list of questions and extracts their values from the Excel sheet.
     * 
     * This is the "brain" of the extraction process. It identifies the data type of each question
     * and delegates to the appropriate reader method (e.g., `readTextQuestion`, `readRadioQuestion`). 
     * It also handles **Conditional Logic**: if a `radio-group` answer triggers a sub-question, 
     * this method calls itself recursively to extract those nested answers.
     * 
     * Supported Data Types:
     * - `text` / `textarea`: Standard text input.
     * - `radio-group`: Single choice dropdown (with conditional recursion).
     * - `autocomplete-array`: Multi-select or single-choice depending on validations.
     * - `checkbox-array`: Multi-select with optional sub-answers (`addQuestion`).
     * - `fields-group`: Repeating blocks of data.
     * 
     * @example
     * // If "Has Website" is "YES", it will recursively extract the "Website URL" field.
     * 
     * @param sheet - The Excel worksheet being parsed.
     * @param rowIndex - A map of Question IDs to their physical row numbers in the Excel file.
     * @param questions - The list of question definitions from the schema to extract.
     * @param payload - The accumulator object where extracted key-value pairs are stored.
     */
    private extractQuestions(
        sheet: ExcelJS.Worksheet,
        rowIndex: Map<string, number[]>,
        questions: Question[],
        payload: Record<string, any>
    ): void {
        for (const question of questions) {
            const dt = question.dataType;
            const anyQ = question as any;

            if (dt === 'text' || dt === 'textarea') {
                const val = this.readTextQuestion(sheet, rowIndex, question);
                console.log(`[ExcelImport] Extracting Text: ID=${question.id}, Value=${val}`);
                if (val !== undefined) payload[question.id] = val;

            } else if (dt === 'radio-group') {
                const val = this.readRadioQuestion(sheet, rowIndex, question);
                if (val !== undefined) {
                    payload[question.id] = val;
                    const rg = question as RadioGroup;
                    const resolvedItems = resolveQuestionItems(rg as any);
                    for (const item of resolvedItems) {
                        if (item.conditional && val === (item.id || item.label)) {
                            this.extractQuestions(sheet, rowIndex, [item.conditional], payload);
                        }
                    }
                }

            } else if (dt === 'autocomplete-array') {
                const isSingle = anyQ.validations?.max?.length === 1;
                if (isSingle) {
                    const val = this.readRadioQuestion(sheet, rowIndex, question);
                    if (val !== undefined) payload[question.id] = val;
                } else {
                    const cb = { ...question, dataType: 'checkbox-array' } as unknown as CheckboxArray;
                    const { answers } = this.readCheckboxQuestion(sheet, rowIndex, cb);
                    if (answers.length > 0) payload[question.id] = answers;
                }

            } else if (dt === 'checkbox-array') {
                const { answers, subAnswers } = this.readCheckboxQuestion(sheet, rowIndex, question as CheckboxArray);
                if (answers.length > 0) {
                    payload[question.id] = answers;
                    const cbQ = question as CheckboxArray;
                    if (cbQ.addQuestion && Object.keys(subAnswers).length > 0) {
                        payload[cbQ.addQuestion.id] = subAnswers;
                    }
                }

            } else if (dt === 'fields-group') {
                const entries = this.readFieldsGroupQuestion(sheet, rowIndex, question as FieldsGroup);
                if (entries.length > 0) payload[question.id] = entries;
            }
        }
    }

    /**
     * Extracts the string value for a text-based question (text or textarea).
     * 
     * This method is highly resilient and uses a three-tier fallback strategy:
     * 1. **Column G (Helper):** Tries to read the hidden formula result.
     * 2. **Column C (Your Answer):** If the formula isn't evaluated, it looks directly at the primary input cell.
     * 3. **Column D (Sub-Answer):** If still empty, it checks the sub-answer column (used for some nested text questions).
     * 
     * @example
     * // If "My Innovation" is typed in row 4, Column C, this returns "My Innovation".
     * 
     * @param sheet - The Excel worksheet.
     * @param rowIndex - The row lookup index.
     * @param question - The text question definition.
     * @returns The extracted string, or undefined if the row is completely empty.
     */
    private readTextQuestion(sheet: ExcelJS.Worksheet, rowIndex: Map<string, number[]>, question: Question): string | undefined {
        const rows = rowIndex.get(question.id);
        if (!rows || rows.length === 0) {
            console.warn(`[ExcelImport] Text Question ID=${question.id} NOT FOUND in index.`);
            return undefined;
        }
        const rowNum = rows[0] as number;
        const row = sheet.getRow(rowNum);

        // 1. Try helper first (Column G)
        const helperVal = this.cellStr(row.getCell(COL_HELPER));
        if (helperVal) return helperVal;

        // 2. Try raw answer (Column C)
        const answerVal = this.cellStr(row.getCell(COL_ANSWER));
        if (answerVal) {
            console.log(`[ExcelImport] Text Fallback Success: Found "${answerVal}" in Column C for ${question.id} at row ${rowNum}`);
            return answerVal;
        }

        // 3. Try sub-answer (Column D) - some nested questions put data here
        const subAnswerVal = this.cellStr(row.getCell(COL_SUB));
        if (subAnswerVal) {
            console.log(`[ExcelImport] Text Fallback Success: Found "${subAnswerVal}" in Column D for ${question.id} at row ${rowNum}`);
            return subAnswerVal;
        }

        console.warn(`[ExcelImport] Text Question ${question.id} (row ${rowNum}) is empty in G, C, and D.`);
        return undefined;
    }

    /**
     * Extracts and maps the value for a single-choice question (radio-group).
     * 
     * This method ensures the human-readable label in Excel is mapped back to the 
     * machine-readable ID/UUID required by the backend:
     * 1. **Column G (Helper):** Tries to read the UUID resolved by Excel's `VLOOKUP` formula.
     * 2. **Manual Match Fallback:** If the formula isn't evaluated, it takes the raw text from 
     *    Column C and searches the schema definitions for a matching label to find the correct ID.
     * 
     * @example
     * // User selects "England" in Column C. 
     * // This method returns "England" (the ID) even if the VLOOKUP formula failed.
     * 
     * @param sheet - The Excel worksheet.
     * @param rowIndex - The row lookup index.
     * @param question - The radio group question definition.
     * @returns The resolved ID string, or undefined if nothing was selected.
     */
    private readRadioQuestion(sheet: ExcelJS.Worksheet, rowIndex: Map<string, number[]>, question: Question): string | undefined {
        const rows = rowIndex.get(question.id);
        if (!rows || rows.length === 0) return undefined;
        const row = sheet.getRow(rows[0] as number);
        
        // 1. Try helper first (Column G) - This has the UUID from VLOOKUP
        const val = this.cellStr(row.getCell(COL_HELPER));
        if (val) return val;

        // 2. Fallback: If VLOOKUP failed (unevaluated), try to match the label in Column C
        const label = this.cellStr(row.getCell(COL_ANSWER));
        if (label) {
            const resolvedItems = resolveQuestionItems(question as any);
            const found = resolvedItems.find((i: any) => (i.label || i.id) === label);
            if (found) {
                console.log(`[ExcelImport] Radio Fallback Success: Matched label "${label}" to ID "${found.id || found.label}" for question ${question.id}`);
                return found.id || found.label;
            }
            // If no match in schema, return the raw label
            return label;
        }
        return undefined;
    }

    /**
     * Extracts values for multi-select questions (checkbox-array or autocomplete-array).
     * 
     * Since multi-select questions span multiple rows in Excel (one row per option), 
     * this method:
     * 1. Iterates through all possible options defined in the schema.
     * 2. Checks Column C for the string "Selected".
     * 3. Collects the IDs of all selected options into an array.
     * 4. **Nested Sub-Answers:** If the question has an `addQuestion` (e.g., "Yes, explain why"), 
     *    it also extracts the text from Column D (or Helper Column H) and maps it to the option ID.
     * 
     * @example
     * // User marks "Medical Device" and "AI" as "Selected".
     * // Returns: { answers: ["MEDICAL_DEVICE", "AI"], subAnswers: {} }
     * 
     * @param sheet - The Excel worksheet.
     * @param rowIndex - The row lookup index.
     * @param question - The checkbox array question definition.
     * @returns An object containing the list of selected IDs and any associated sub-answers.
     */
    private readCheckboxQuestion(
        sheet: ExcelJS.Worksheet,
        rowIndex: Map<string, number[]>,
        question: CheckboxArray
    ): { answers: string[]; subAnswers: Record<string, string> } {
        const answers: string[] = [];
        const subAnswers: Record<string, string> = {};

        const resolvedItems = resolveQuestionItems(question as any).filter(
            (i: any) => i.id && !i.type // skip separators
        );

        for (const item of resolvedItems) {
            const rows = rowIndex.get(item.id);
            if (!rows || rows.length === 0) continue;
            const row = sheet.getRow(rows[0] as number);

            if (this.cellStr(row.getCell(COL_ANSWER)) === 'Selected') {
                const optionId = this.cellStr(row.getCell(COL_ID));
                if (optionId) answers.push(optionId);

                if (question.addQuestion) {
                    const subVal = this.cellStr(row.getCell(COL_SUB_H)) || this.cellStr(row.getCell(COL_SUB));
                    if (subVal) subAnswers[optionId] = subVal;
                }
            }
        }

        return { answers, subAnswers };
    }

    /**
     * Extracts values for repeating blocks of questions (fields-group).
     * 
     * In Excel, a `fields-group` is rendered as a series of 5 pre-allocated blocks. 
     * Depending on the schema, each block uses 1 or 2 rows. This method:
     * 1. Identifies all rows associated with the `fields-group` ID.
     * 2. Iterates through the rows in steps (step size 1 or 2).
     * 3. Extracts values for both the main field (`field`) and the optional sub-field (`addQuestion`).
     * 4. Collects only non-empty entries into an array of objects.
     * 
     * @example
     * // For a "User Tests" group, it might return:
     * // [ { "kind": "Alpha", "feedback": "Good" }, { "kind": "Beta", "feedback": "Stable" } ]
     * 
     * @param sheet - The Excel worksheet.
     * @param rowIndex - The row lookup index.
     * @param question - The fields group question definition.
     * @returns An array of objects representing the extracted repeating data entries.
     */
    private readFieldsGroupQuestion(
        sheet: ExcelJS.Worksheet,
        rowIndex: Map<string, number[]>,
        question: FieldsGroup
    ): Record<string, string>[] {
        const allRows = rowIndex.get(question.id);
        if (!allRows || allRows.length < 2) return [];

        const entryRows = allRows.slice(1); // Exclude the header row
        const results: Record<string, string>[] = [];
        const hasF2 = !!question.addQuestion;

        const step = hasF2 ? 2 : 1;

        for (let i = 0; i < entryRows.length; i += step) {
            const row1 = sheet.getRow(entryRows[i] as number);
            const val1 = this.cellStr(row1.getCell(COL_SUB_H)) || this.cellStr(row1.getCell(COL_ANSWER));
            
            let val2 = '';
            if (hasF2 && (i + 1) < entryRows.length) {
                const row2 = sheet.getRow(entryRows[i + 1] as number);
                val2 = this.cellStr(row2.getCell(COL_H2)) || this.cellStr(row2.getCell(COL_ANSWER));
            }

            if (val1 || val2) {
                const entry: Record<string, string> = { [question.field.id]: val1 };
                if (hasF2 && val2) entry[question.addQuestion!.id] = val2;
                results.push(entry);
            }
        }

        return results;
    }
}
