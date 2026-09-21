/**
 * ExcelExportService — Pure JSON Schema → Excel writer.
 *
 * This service contains ZERO database logic and ZERO Node.js process dependencies.
 * It takes the Innovation Record (IR) schema and an optional payload to generate
 * a fully styled ExcelJS Workbook.
 *
 * STRATEGY (Hidden metadata):
 * - Column F (ID): Stores the question or option ID for the parser.
 * - Column G-I (Helpers): Store formula results (VLOOKUPs, booleans) for the parser to read.
 * - ReferenceData Sheet: Contains dropdown options and UUID mapping.
 */

import { injectable } from 'inversify';
import * as ExcelJS from 'exceljs';
import type { Question, RadioGroup, CheckboxArray } from '../../models/schema-engine/question.types';
import {
  buildQuestionMap,
  resolveQuestionItems,
  questionMap,
  isQuestionUnsupportedForExcel
} from './excel-schema-helpers';

// --- CONSTANTS ---
const NHS_BLUE = 'FF005EB8';
const SUBSECTION_GRAY = 'FFE0E0E0';
const WHITE = 'FFFFFFFF';
const BLACK = 'FF000000';
const RED = 'FFFFCCCC';

const TEXTAREA_LENGTH_LIMIT: Record<string, number> = {
  xs: 200,
  s: 500,
  m: 1000,
  l: 1500,
  xl: 2000,
  xxl: 4000
};

@injectable()
export class ExcelExportService {
  // State encapsulated per instance
  /**
   * Initial priority for conditional formatting rules.
   * Incremented for every 'Required' field to ensure rules evaluate in order.
   */
  private redPriority = 5000;

  /**
   * A map of Question IDs to their Absolute Excel addresses (e.g., "$C$10").
   * Used to build dynamic formulas that depend on other cells.
   */
  private cellRegistry: Record<string, string> = {};

  /**
   * Current column index in the 'ReferenceData' sheet.
   * Incremented as dropdown lists are generated.
   */
  private refDataColIdx = 1;

  /**
   * The address of the most recently rendered 'Required' field.
   * Used for 'Cascading Validation': a field only turns Red if the one before it is filled.
   */
  private previousRequiredCellAddr: string | null = null;
  /**
   * Generates a complete ExcelJS Workbook strictly from the provided schema.
   * If a payload is provided, it pre-fills the answers.
   */
  public generateTemplateWorkbook(
    schema: any,
    payload?: Record<string, any>,
    schemaVersion?: number
  ): ExcelJS.Workbook {
    // Reset state for safety if instance is reused
    this.redPriority = 5000;
    this.cellRegistry = {};
    this.refDataColIdx = 1;
    this.previousRequiredCellAddr = null;

    buildQuestionMap(schema.sections);

    const workbook = new ExcelJS.Workbook();
    const formSheet = workbook.addWorksheet('Innovation Record');
    const refSheet = workbook.addWorksheet('ReferenceData');
    refSheet.state = 'hidden';

    const metaSheet = workbook.addWorksheet('_Metadata');
    metaSheet.state = 'hidden';

    if (schemaVersion) {
      metaSheet.getCell('A1').value = 'SCHEMA_VERSION';
      metaSheet.getCell('A2').value = schemaVersion;
    }

    this.setupColumns(formSheet);

    for (const [sIdx, section] of schema.sections.entries()) {
      this.renderSectionHeader(formSheet, `${sIdx + 1}. ${section.title}`);
      for (const [ssIdx, subSection] of section.subSections.entries()) {
        const subSectionId = subSection.id;
        const subSectionPayload = payload ? payload[subSectionId] : null;

        this.renderSubSectionHeader(formSheet, `${sIdx + 1}.${ssIdx + 1}. ${subSection.title}`);
        for (const step of subSection.steps) {
          let isStepConditionMet = true;
          const hasSupportedQuestion = step.questions.some((question: any) => !isQuestionUnsupportedForExcel(question));
          if (step.condition && step.condition.id) {
            const parentValue = subSectionPayload ? subSectionPayload[step.condition.id] : null;
            isStepConditionMet = Array.isArray(step.condition.options) && step.condition.options.includes(parentValue);

            const parentQ = questionMap.get(step.condition.id);
            if (parentQ && hasSupportedQuestion) {
              const parentLabel = (parentQ as any).label || parentQ.id;
              const resolvedItems = resolveQuestionItems(parentQ);
              const displayLabels = step.condition.options.map((optId: string) => {
                const foundItem = resolvedItems.find((i: any) => i.id === optId);
                return foundItem ? foundItem.label || foundItem.id : optId;
              });
              const requiredVals = displayLabels.join("' or '");
              const alertMsg = `   ⚠️ CONDITIONAL SECTION: Only answer the question below if you answered '${requiredVals}' for '${parentLabel}'`;
              const alertRow = formSheet.addRow(['', alertMsg, '', '', '', '', '']);
              alertRow.getCell(2).font = { bold: true, color: { argb: 'FFD9534F' }, italic: true };
            }
          }

          for (const question of step.questions) {
            this.renderQuestionDispatcher(
              formSheet,
              refSheet,
              question,
              false,
              isStepConditionMet ? subSectionPayload : null
            );
          }
        }
      }
    }

    formSheet.getColumn(6).hidden = true;
    formSheet.getColumn(7).hidden = true;
    formSheet.getColumn(8).hidden = true;
    formSheet.getColumn(9).hidden = true;

    return workbook;
  }

  /**
   * Initializes the worksheet layout, column widths, and visual header styles.
   *
   * This defines the "Architecture" of the spreadsheet:
   * - **Columns A-E:** Human-readable (Questions, Answers, Guidance).
   * - **Columns F-I:** Machine-readable (Hidden IDs and helper formulas).
   * - **NHS Branding:** Applies the NHS Blue theme to the header row.
   *
   * @param sheet - The Excel worksheet to configure.
   */
  private setupColumns(sheet: ExcelJS.Worksheet) {
    sheet.columns = [
      { header: '', key: 'margin', width: 5 },
      { header: 'Field (Question)', key: 'label', width: 45 },
      { header: 'Your Answer', key: 'answer', width: 45 },
      { header: 'Sub-Answer (If applicable)', key: 'subAnswer', width: 45 },
      { header: 'Guidance', key: 'guidance', width: 45 },
      { header: 'ID (Hidden)', key: 'id', width: 0 },
      { header: 'Helper (Hidden)', key: 'helper', width: 0 },
      { header: 'Sub Helper 1 (Hidden)', key: 'helper1', width: 0 },
      { header: 'Sub Helper 2 (Hidden)', key: 'helper2', width: 0 }
    ];

    for (let i = 2; i <= 5; i++) {
      sheet.getColumn(i).alignment = { vertical: 'top', wrapText: true };
    }

    sheet.getRow(1).eachCell((cell, colNumber) => {
      if (colNumber > 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NHS_BLUE } };
        cell.font = { bold: true, color: { argb: WHITE }, size: 12 };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      }
    });
  }

  /**
   * Renders a top-level section header (e.g., "1. About your innovation").
   *
   * Styling:
   * - Spans all five primary columns (A-E).
   * - Black background with Large White Bold text.
   * - Increased row height for high visual impact and clear separation.
   *
   * @param sheet - The Excel worksheet.
   * @param title - The human-readable title of the section.
   */
  private renderSectionHeader(sheet: ExcelJS.Worksheet, title: string) {
    const row = sheet.addRow([title, '', '', '', '', '', '']);
    sheet.mergeCells(`A${row.number}:E${row.number}`);
    row.height = 48;
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLACK } };
    row.getCell(1).font = { bold: true, color: { argb: WHITE }, size: 14 };
    row.getCell(1).alignment = { vertical: 'middle' };
  }

  /**
   * Renders a secondary sub-section header (e.g., "1.1. Description").
   *
   * Styling:
   * - Spans all five primary columns (A-E).
   * - Light Gray background with Black Bold text.
   * - Provides visual hierarchy within a major section.
   *
   * @param sheet - The Excel worksheet.
   * @param title - The human-readable title of the sub-section.
   */
  private renderSubSectionHeader(sheet: ExcelJS.Worksheet, title: string) {
    const row = sheet.addRow([title, '', '', '', '', '', '']);
    sheet.mergeCells(`A${row.number}:E${row.number}`);
    row.height = 32;
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUBSECTION_GRAY } };
    row.getCell(1).font = { bold: true, color: { argb: BLACK }, size: 11 };
    row.getCell(1).alignment = { vertical: 'middle' };
  }

  /**
   * Converts a relative Excel address to an absolute one.
   *
   * Used for building formulas that must always point to a specific cell,
   * even if the formula is copied or moved.
   *
   * @example
   * // "C10" -> "$C$10"
   *
   * @param addr - The relative cell address (e.g., "C10").
   * @returns The absolute cell address (e.g., "$C$10").
   */
  private toAbsolute(addr: string): string {
    return '$' + addr.replace(/(\d+)/, '$$$1');
  }

  /**
   * Orchestrates the rendering of a single question based on its dataType.
   *
   * This is the central routing method for the Export engine. It:
   * 1. Appends conditional warnings to the label if the question is part of a dependency.
   * 2. Delegates to specific rendering methods (`renderTextQuestion`, `renderRadioGroupQuestion`, etc.).
   * 3. Registers the resulting cell address in the `cellRegistry` for formula lookups.
   *
   * @param sheet - The primary "Innovation Record" sheet.
   * @param refSheet - The hidden "ReferenceData" sheet for dropdowns.
   * @param qObj - The question definition from the schema.
   * @param isIndented - Whether to apply visual indentation (tree-branch symbol).
   * @param ssPayload - Optional pre-fill data for the current sub-section.
   * @param condition - Optional dependency metadata (parent value that triggers this question).
   * @returns The Excel cell address of the primary answer, or null if not applicable.
   */
  private renderQuestionDispatcher(
    sheet: ExcelJS.Worksheet,
    refSheet: ExcelJS.Worksheet,
    qObj: Question,
    isIndented: boolean,
    ssPayload?: any,
    condition?: { requiredValue: string }
  ): string | null {
    let mainCellAddr: string | null = null;
    const question = { ...qObj } as any;

    if (isQuestionUnsupportedForExcel(question)) return null;

    if (condition) {
      question.label =
        (question.label || question.id) + `\n(⚠️ Only answer if you selected '${condition.requiredValue}' above)`;
    }

    switch (question.dataType) {
      case 'text':
      case 'textarea':
        mainCellAddr = this.renderTextQuestion(sheet, question, isIndented, ssPayload);
        break;
      case 'radio-group':
        mainCellAddr = this.renderRadioGroupQuestion(sheet, refSheet, question as RadioGroup, isIndented, ssPayload);
        break;
      case 'autocomplete-array':
        if (question.validations?.max?.length === 1) {
          mainCellAddr = this.renderRadioGroupQuestion(sheet, refSheet, question as any, isIndented, ssPayload);
        } else {
          mainCellAddr = this.renderCheckboxArrayQuestion(sheet, question as any, isIndented, ssPayload);
        }
        break;
      case 'checkbox-array':
        mainCellAddr = this.renderCheckboxArrayQuestion(sheet, question as CheckboxArray, isIndented, ssPayload);
        break;
      default:
        mainCellAddr = this.renderTextQuestion(sheet, question, isIndented, ssPayload);
        sheet.getCell(mainCellAddr!).note =
          `Warning: Unknown data type '${(question as any).dataType}' - Rendered as text.`;
        break;
    }

    if (mainCellAddr) this.cellRegistry[question.id] = this.toAbsolute(mainCellAddr);
    return mainCellAddr;
  }

  /**
   * Renders a single-row text input question (text or textarea).
   *
   * Actions:
   * 1. Creates a row with Label, Input Cell, and Guidance.
   * 2. Pre-fills the cell if a value exists in the payload.
   * 3. Applies NHS Blue borders to the input cell.
   * 4. **Cascading Validation:** Highlights the cell Red if it's required and the user is up to this step.
   * 5. **Native Validation:** Applies an Excel "Text Length" rule based on the schema's limits.
   *
   * @param sheet - The Excel worksheet.
   * @param question - The text question definition.
   * @param isIndented - Whether to indent the label.
   * @param ssPayload - Optional pre-fill data.
   * @returns The Excel address of the input cell.
   */
  private renderTextQuestion(
    sheet: ExcelJS.Worksheet,
    question: Question,
    isIndented: boolean,
    ssPayload?: any
  ): string {
    const isRequired = !!question.validations?.isRequired;
    const maxLength = this.getMaxLength(question);
    const row = sheet.addRow([
      '',
      this.getLabel(question, isIndented),
      '',
      '',
      this.getGuidance(question, isRequired, maxLength),
      question.id
    ]);
    const cell = row.getCell(3);

    const value = ssPayload ? ssPayload[question.id] : null;
    if (value !== undefined && value !== null) {
      cell.value = value.toString();
    }

    this.applyInputStyle(cell);
    this.applyCascadingRed(sheet, cell.address, isRequired);
    if (maxLength)
      cell.dataValidation = {
        type: 'textLength',
        operator: 'lessThanOrEqual',
        formulae: [maxLength.toString()],
        showErrorMessage: true,
        errorTitle: 'Too Long',
        error: `Limit: ${maxLength} chars.`
      };
    return cell.address;
  }

  /**
   * Renders a single-choice dropdown question (radio-group).
   *
   * Actions:
   * 1. Creates a row with Label, Dropdown Cell (Column C), and Guidance.
   * 2. **Robust Dropdown:** Adds the options to the hidden 'ReferenceData' sheet and
   *    configures an Excel Data Validation list in Column C.
   * 3. **Machine Mapping:** Injects a hidden `VLOOKUP` formula in Column G to map
   *    the human-selected label back to its machine-readable ID/UUID.
   * 4. **Recursion:** If an option has a `conditional` sub-question, it calls the
   *    dispatcher to render it immediately below.
   *
   * @param sheet - The primary worksheet.
   * @param refSheet - The hidden data sheet.
   * @param question - The radio group definition.
   * @param isIndented - Whether to indent the label.
   * @param ssPayload - Optional pre-fill data.
   * @returns The Excel address of the hidden helper cell (Column G).
   */
  private renderRadioGroupQuestion(
    sheet: ExcelJS.Worksheet,
    refSheet: ExcelJS.Worksheet,
    question: RadioGroup,
    isIndented: boolean,
    ssPayload?: any
  ): string {
    const isRequired = !!question.validations?.isRequired;
    const row = sheet.addRow([
      '',
      this.getLabel(question, isIndented),
      '',
      '',
      this.getGuidance(question, isRequired),
      question.id
    ]);
    const cell = row.getCell(3);
    const helperCell = row.getCell(7);

    this.applyInputStyle(cell);
    this.applyCascadingRed(sheet, cell.address, isRequired);

    const resolvedItems = resolveQuestionItems(question as any);
    const validItems = resolvedItems.filter((i: any) => 'label' in i && i.label);
    const options = validItems ? validItems.map((i: any) => ({ label: i.label, id: i.id || i.label })) : [];

    // Pre-fill value
    const valId = ssPayload ? ssPayload[question.id] : null;
    if (valId && options.length > 0) {
      const found = options.find(o => o.id === valId);
      if (found) cell.value = found.label;
    }

    if (resolvedItems.length > 0) {
      if (options.length > 0) this.applyRobustDropdown(cell, refSheet, options, helperCell);

      resolvedItems.forEach((item: any) => {
        const itemLabel = item.label || item.id;
        if (item.conditional) {
          const isItemConditionMet = valId === item.id;
          this.renderQuestionDispatcher(
            sheet,
            refSheet,
            item.conditional,
            true,
            isItemConditionMet ? ssPayload : null,
            { requiredValue: itemLabel }
          );
        }
      });
    } else {
      helperCell.value = { formula: `IF(ISBLANK(${cell.address}), "", ${cell.address})` };
    }
    return helperCell.address;
  }

  /**
   * Renders a multi-select question (checkbox-array) as a vertical list of options.
   *
   * Strategy:
   * 1. Creates a header row for the group.
   * 2. Renders one row per option with a "Selected/Not Selected" dropdown in Column C.
   * 3. **Machine Aggregation:** Injects a hidden `TEXTJOIN` formula in Column F of the header row.
   *    This formula automatically aggregates all "Selected" option IDs into a semicolon-separated
   *    string for the parser to read.
   * 4. **Exclusive Options:** If an option is marked as `exclusive: true` (e.g., "None"), it
   *    applies conditional formatting to turn the range Red if both "None" and another option
   *    are selected.
   * 5. Questions with dynamic `addQuestions` content are skipped by the Excel
   *    support policy.
   *
   * @param sheet - The Excel worksheet.
   * @param question - The checkbox array definition.
   * @param isIndented - Whether to indent labels.
   * @param ssPayload - Optional pre-fill data.
   * @returns The Excel address of the aggregated results cell (Column F).
   */
  private renderCheckboxArrayQuestion(
    sheet: ExcelJS.Worksheet,
    question: CheckboxArray,
    isIndented: boolean,
    ssPayload?: any
  ): string | null {
    sheet.addRow(['']);
    const groupLabelRow = sheet.addRow([
      '',
      this.getLabel(question, isIndented),
      '',
      '',
      this.getGuidance(question),
      question.id
    ]);
    groupLabelRow.font = { italic: true };
    const startRow = sheet.lastRow!.number + 1;
    let optionCount = 0;
    let exclusiveRowAddr: string | null = null;
    const resolvedItems = resolveQuestionItems(question as any);

    const parentAnswerId = question.checkboxAnswerId ?? question.id;
    const selectedIds: string[] =
      ssPayload && Array.isArray(ssPayload[question.id])
        ? ssPayload[question.id]
            .map((answer: any) => (typeof answer === 'string' ? answer : answer?.[parentAnswerId]))
            .filter(Boolean)
        : [];

    resolvedItems.forEach((item: any) => {
      const itemId = item.id || item.label;
      if (item.label || item.id) {
        const row = sheet.addRow(['', `     ◽ ${item.label || item.id}`, '', '', '', itemId, '']);
        const answerCell = row.getCell(3);
        answerCell.dataValidation = { type: 'list', allowBlank: false, formulae: ['"Selected,Not Selected"'] };
        answerCell.alignment = { horizontal: 'center' };

        // Pre-fill Selected state
        if (selectedIds.includes(itemId)) {
          answerCell.value = 'Selected';
        }

        const absAnswerAddr = this.toAbsolute(answerCell.address);
        if (item.exclusive) exclusiveRowAddr = absAnswerAddr;

        row.getCell(7).value = { formula: `IF(${answerCell.address}="Selected", F${row.number}, "")` };
        optionCount++;
      }
    });

    if (exclusiveRowAddr && optionCount > 1) {
      const range = `C${startRow}:C${sheet.lastRow!.number}`;
      sheet.addConditionalFormatting({
        ref: range,
        rules: [
          {
            priority: this.redPriority++,
            type: 'expression',
            formulae: [`AND(${exclusiveRowAddr}="Selected", COUNTIF(${range}, "Selected")>1)`],
            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: RED } } }
          }
        ]
      });
    }

    if (optionCount > 0) {
      const resultCell = sheet.getCell(`F${groupLabelRow.number}`);
      resultCell.value = { formula: `TEXTJOIN("; ", TRUE, G${startRow}:G${startRow + optionCount - 1})` };
      sheet.addRow(['']);
      return resultCell.address;
    }
    sheet.addRow(['']);
    return null;
  }

  /**
   *
   * Architecture:
   * 1. Pre-allocates a fixed block of 5 entries to allow for offline data entry.
   * 2. Depending on the schema, each entry uses either 1 row or 2 rows (stacked).
   * 3. **Live Interpolation:** For questions like "Entry {{item}} details", it injects an
   *    Excel formula into the label cell that updates in real-time as the user types
   *    in the main field.
   * 4. Pre-fills existing data from the payload if provided.
   *
   * @param sheet - The Excel worksheet.
   * @param refSheet - The data sheet.
   * @param question - The fields group definition.
   * @param isIndented - Whether to indent labels.
   * @param ssPayload - Optional pre-fill data.
   * @returns Always returns null (data is extracted via ID-based row scanning).
   */
  /**
   * Applies the standard NHS visual style to an input cell.
   *
   * Styling includes:
   * - Thin borders on all sides using the NHS Blue color.
   * - Black font color for user visibility.
   * - This style signals to the user that the cell is interactive and expects an answer.
   *
   * @param cell - The Excel cell to style.
   */
  private applyInputStyle(cell: ExcelJS.Cell) {
    cell.font = { color: { argb: BLACK } };
    cell.border = {
      top: { style: 'thin', color: { argb: NHS_BLUE } },
      left: { style: 'thin', color: { argb: NHS_BLUE } },
      bottom: { style: 'thin', color: { argb: NHS_BLUE } },
      right: { style: 'thin', color: { argb: NHS_BLUE } }
    };
  }

  /**
   * Creates a high-reliability dropdown list in Excel.
   *
   * Mechanism:
   * 1. **Data Separation:** Instead of hardcoding options in the validation rule (which has a
   *    character limit), it writes the options to the hidden 'ReferenceData' sheet.
   * 2. **Native List:** Creates an Excel Data Validation rule that points to that hidden range.
   * 3. **ID Mapping:** If a `helperCell` is provided, it injects an Excel `VLOOKUP` formula.
   *    This formula maps the user's friendly selection (e.g., "Yes") to the backend ID
   *    (e.g., "YES") in real-time.
   *
   * @param cell - The user-visible input cell where the dropdown appears.
   * @param refSheet - The hidden sheet used to store the dropdown data.
   * @param options - An array of label/id pairs to populate the dropdown.
   * @param helperCell - Optional hidden cell to store the machine-readable ID.
   */
  private applyRobustDropdown(
    cell: ExcelJS.Cell,
    refSheet: ExcelJS.Worksheet,
    options: { label: string; id: string }[],
    helperCell?: ExcelJS.Cell
  ) {
    const colIdx = this.refDataColIdx;
    options.forEach((opt, idx) => {
      refSheet.getRow(idx + 1).getCell(colIdx).value = opt.label;
      refSheet.getRow(idx + 1).getCell(colIdx + 1).value = opt.id;
    });
    const colName = this.getExcelColumnName(colIdx);
    const idColName = this.getExcelColumnName(colIdx + 1);

    cell.dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`'ReferenceData'!$${colName}$1:$${colName}$${options.length}`],
      showErrorMessage: true,
      errorTitle: 'Invalid Selection',
      error: 'Select from list.'
    };

    if (helperCell) {
      const vlookupFormula = `IFERROR(VLOOKUP(${cell.address}, 'ReferenceData'!$${colName}$1:$${idColName}$${options.length}, 2, 0), "")`;
      helperCell.value = { formula: vlookupFormula };
    }

    this.refDataColIdx += 2;
  }

  /**
   * Converts a 1-based column index to its Excel alphabetical name.
   *
   * Essential for building dynamic formulas (like `VLOOKUP` or `IF`) that
   * reference specific columns in the spreadsheet.
   *
   * @example
   * // 1 -> "A"
   * // 3 -> "C"
   * // 27 -> "AA"
   *
   * @param col - The 1-based column index.
   * @returns The alphabetical name of the column.
   */
  private getExcelColumnName(col: number): string {
    let name = '';
    while (col > 0) {
      let mod = (col - 1) % 26;
      name = String.fromCharCode(65 + mod) + name;
      col = Math.floor((col - mod) / 26);
    }
    return name;
  }

  /**
   * Converts raw HTML strings into clean, readable plain text for Excel.
   *
   * Since schema descriptions often contain HTML tags (like `<p>`, `<br>`, or `<a>`),
   * this method:
   * 1. Replaces line-break tags with actual newlines.
   * 2. Strips all other HTML tags.
   * 3. Decodes common HTML entities (e.g., `&amp;` -> `&`).
   * 4. Trims leading/trailing whitespace.
   *
   * @example
   * // "<p>Hello<br/>World</p>" -> "Hello\n\nWorld"
   *
   * @param html - The raw HTML string from the schema.
   * @returns A clean plain-text string.
   */
  private cleanHtmlText(html: string): string {
    if (!html) return '';
    let text = html.replace(/<\/p>|<br\s*\/?>/gi, '\n\n');
    text = text.replace(/<a href="\{\{urls\.[^}]+\}\}"[^>]*>(.*?)<\/a>/gi, '$1');
    text = text.replace(/<[^>]*>?/gm, '');
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'");
    return text.trim();
  }

  /**
   * Formats the human-readable label for a question.
   *
   * Actions:
   * 1. **Indentation:** If `isIndented` is true, prepends a tree-branch symbol (" └─ ")
   *    to visually signal a nested dependency.
   * 2. **Fallback:** Uses the `label` property from the schema, falling back to
   *    the technical `id` if the label is missing.
   *
   * @param q - The question definition.
   * @param isIndented - Whether to apply nesting symbols.
   * @returns The formatted label string.
   */
  private getLabel(q: Question, isIndented: boolean): string {
    return (isIndented ? '   └─ ' : '') + ((q as any).label || q.id);
  }

  private getGuidance(q: Question, isRequired = false, maxLength?: number): string {
    let g = this.cleanHtmlText(q.description || '');
    if (isRequired) g += (g ? '\n\n' : '') + '(Required)';
    if (maxLength) g += (g ? ' ' : '') + `(Max ${maxLength} chars)`;
    return g.trim();
  }

  private getMaxLength(q: Question): number | undefined {
    if (q.validations?.maxLength) return q.validations.maxLength;
    if ((q as any).lengthLimit) return TEXTAREA_LENGTH_LIMIT[(q as any).lengthLimit as string];
    return undefined;
  }

  /**
   * Applies conditional formatting to highlight required cells in Red.
   * Uses a cascading logic: only highlights the NEXT required field if the
   * previous one was filled, to guide the user naturally through the form.
   */
  private applyCascadingRed(sheet: ExcelJS.Worksheet, currentAddr: string, isRequired: boolean) {
    if (!isRequired) return;
    const formulae = this.previousRequiredCellAddr
      ? [`AND(ISBLANK(${currentAddr}), NOT(ISBLANK(${this.previousRequiredCellAddr})))`]
      : [`ISBLANK(${currentAddr})`];
    sheet.addConditionalFormatting({
      ref: currentAddr,
      rules: [
        {
          priority: this.redPriority++,
          type: 'expression',
          formulae,
          style: {
            font: { color: { argb: BLACK } },
            fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: RED } }
          }
        }
      ]
    });
    this.previousRequiredCellAddr = currentAddr;
  }
}
