import { injectable } from 'inversify';
import type { Question, RadioGroup, CheckboxArray, FieldsGroup } from '../../models/schema-engine/question.types';
import type { IRSchemaType } from '../../models/schema-engine/schema.model';
import { buildQuestionMap, resolveQuestionItems } from './excel-schema-helpers';

@injectable()
export class SchemaDocGeneratorService {
    
    /**
     * Main entry point to generate the full Markdown API Specification.
     */
    public generateMarkdownSpec(schema: IRSchemaType): string {
        buildQuestionMap(schema.sections);
        
        let md = `# NHS Innovation Service - API Integration Specification\n\n`;
        md += `This document defines the JSON payload structure required to import Innovation Record.\n\n`;
        
        md += `## 1. Expected JSON Payload Structure\n\n`;
        md += `Below is a structural representation of the expected JSON payload. The data is grouped by Sub-Section IDs.\n\n`;
        md += `\`\`\`json\n`;
        md += this.generateJsonExample(schema);
        md += `\n\`\`\`\n\n`;
        
        md += `---\n\n`;
        md += `## 2. Data Dictionary\n\n`;
        md += `The following tables define the exact keys, data types, validation rules, and allowed values for every field.\n\n`;
        
        md += this.generateDataDictionary(schema);
        
        return md;
    }

    /**
     * Generates a structured JSON example block based on the schema.
     */
    private generateJsonExample(schema: IRSchemaType): string {
        const example: Record<string, any> = {};

        for (const section of schema.sections) {
            for (const subSection of section.subSections) {
                const subPayload: Record<string, any> = {};
                const allQuestions: Question[] = subSection.steps.flatMap((step: any) => step.questions);
                
                for (const q of allQuestions) {
                    this.extractQuestionExample(q, subPayload);
                }
                
                if (Object.keys(subPayload).length > 0) {
                    example[subSection.id] = subPayload;
                }
            }
        }

        return JSON.stringify(example, null, 2);
    }

    /**
     * Recursively extracts a mock value representation for the JSON example block.
     */
    private extractQuestionExample(q: Question, payload: Record<string, any>): void {
        const dt = q.dataType;
        let valRepresentation = '';

        if (dt === 'text' || dt === 'textarea') {
            const max = this.getMaxLength(q);
            valRepresentation = max ? `"string (Max ${max} chars)"` : `"string"`;
        } else if (dt === 'radio-group') {
            const options = resolveQuestionItems(q as RadioGroup).map(i => i.id || i.label).filter(Boolean);
            valRepresentation = `"${options.slice(0, 3).join(' | ')}${options.length > 3 ? ' | ...' : ''}"`;
        } else if (dt === 'autocomplete-array' || dt === 'checkbox-array') {
            valRepresentation = `["ARRAY_OF_IDS"]`;
        } else if (dt === 'fields-group') {
            const fg = q as FieldsGroup;
            valRepresentation = `[ { "${fg.field.id}": "string" } ]`;
            if (fg.addQuestion) {
                 valRepresentation = `[ { "${fg.field.id}": "string", "${fg.addQuestion.id}": "string" } ]`;
            }
        }

        payload[q.id] = valRepresentation;

        // Recurse for conditionals in radio-groups to show their keys in the JSON
        if (dt === 'radio-group' && 'items' in q) {
            const resolvedItems = resolveQuestionItems(q as RadioGroup);
            for (const item of resolvedItems) {
                if (item.conditional) {
                    this.extractQuestionExample(item.conditional, payload);
                }
            }
        }
    }

    /**
     * Generates the detailed Markdown tables for each section.
     */
    private generateDataDictionary(schema: IRSchemaType): string {
        let md = '';

        for (const [sIdx, section] of schema.sections.entries()) {
            md += `### Section ${sIdx + 1}: ${section.title}\n\n`;
            
            for (const subSection of section.subSections) {
                md += `#### Sub-Section ID: \`${subSection.id}\`\n`;
                md += `*${subSection.title}*\n\n`;
                
                md += `| JSON Key (ID) | Label (Question) | Data Type | Rules & Validations | Allowed Values (ID ➔ Label) |\n`;
                md += `| :--- | :--- | :--- | :--- | :--- |\n`;

                for (const step of subSection.steps) {
                    for (const q of step.questions) {
                        md += this.renderQuestionTableRow(q);
                    }
                }
                md += `\n---\n\n`;
            }
        }

        return md;
    }

    /**
     * Recursively renders a Markdown table row for a question.
     */
    private renderQuestionTableRow(q: Question, depth = 0, conditionMsg = ''): string {
        let row = '';
        const indent = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(depth);
        const prefix = depth > 0 ? '└─ ' : '';
        
        const label = this.cleanHtmlText((q as any).label || q.id);
        const displayLabel = `${indent}${prefix}**${label}**<br/>${conditionMsg}`;

        const isRequired = !!q.validations?.isRequired;
        const max = this.getMaxLength(q);
        
        let rules = isRequired ? '**Required**' : '*Optional*';
        if (max) rules += `<br/>Max: ${max} chars`;
        if (q.validations?.urlFormat) rules += `<br/>Must be valid URL`;

        let allowedValues = '*N/A*';
        const dt = q.dataType;

        if (dt === 'radio-group' || dt === 'autocomplete-array' || dt === 'checkbox-array') {
            const items = resolveQuestionItems(q as any);
            const validItems = items.filter((i: any) => i.label || i.id);
            if (validItems.length > 0) {
                allowedValues = validItems.map((i: any) => `\`${i.id || i.label}\` ➔ ${i.label || i.id}`).join('<br/>');
            }
        } else if (dt === 'fields-group') {
             allowedValues = '*Array of Objects*';
        }

        row += `| \`${q.id}\` | ${displayLabel} | \`${dt}\` | ${rules} | ${allowedValues} |\n`;

        // Handle nested conditionals (radio groups)
        if ((dt === 'radio-group' || dt === 'autocomplete-array') && 'items' in q) {
            const items = resolveQuestionItems(q as any);
            for (const item of items) {
                if (item.conditional) {
                    const reqVal = item.label || item.id;
                    const cond = `*(Only if parent = \`${reqVal}\`)*`;
                    row += this.renderQuestionTableRow(item.conditional, depth + 1, cond);
                }
            }
        }

        // Handle sub-questions (checkbox array addQuestion)
        if (dt === 'checkbox-array' && (q as CheckboxArray).addQuestion) {
             const addQ = (q as CheckboxArray).addQuestion!;
             const cond = `*(Sub-answer for selected items)*`;
             row += this.renderQuestionTableRow(addQ, depth + 1, cond);
        }

        // Handle sub-fields (fields-group)
        if (dt === 'fields-group') {
             const fg = q as FieldsGroup;
             row += this.renderQuestionTableRow(fg.field, depth + 1, '*(Main Field)*');
             if (fg.addQuestion) {
                 row += this.renderQuestionTableRow(fg.addQuestion, depth + 1, '*(Sub Field)*');
             }
        }

        return row;
    }

    // --- Helpers (Reused from ExcelExportService logic) ---

    private getMaxLength(q: Question): number | undefined { 
        if (q.validations?.maxLength) return q.validations.maxLength; 
        const TEXTAREA_LENGTH_LIMIT: Record<string, number> = { xs: 200, s: 500, m: 1000, l: 1500, xl: 2000, xxl: 4000 };
        if ((q as any).lengthLimit) return TEXTAREA_LENGTH_LIMIT[(q as any).lengthLimit as string]; 
        return undefined; 
    }

    private cleanHtmlText(html: string): string {
        if (!html) return '';
        let text = html.replace(/<\/p>|<br\s*\/?>/gi, ' ');
        text = text.replace(/<[^>]*>?/gm, '');
        text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");
        return text.trim();
    }
}
