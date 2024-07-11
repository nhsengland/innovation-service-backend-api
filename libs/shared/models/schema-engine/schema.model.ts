import { requiredSectionsAndQuestions } from '../../schemas/innovation-record';
import Joi from 'joi';
import type { Question } from './question.types';
import { QuestionValidatorFactory } from './question.validator';
import { SchemaValidation } from './schema.validations';

export type IRSchemaType = {
  sections: {
    id: string;
    title: string;
    subSections: InnovationRecordSubSectionType[];
  }[];
};

export type InnovationRecordSubSectionType = {
  id: string;
  title: string;
  steps: InnovationRecordStepType[];
  calculatedFields?: Record<string, Condition[]>;
  hasFiles?: boolean;
};

export type InnovationRecordStepType = {
  questions: Question[];
  condition?: Condition;
};

type Condition = { id: string; options: string[] };

export type SchemaValidationError = {
  message: string;
  context: any;
};

export class SchemaModel {
  public schema: IRSchemaType;
  private errorList: SchemaValidationError[];

  private subSections = new Map<string, string[]>();
  private questions = new Map<string, Question>();
  private conditions = new Map<string, Record<string, Condition[]>>();
  private allowFileUploads = new Set<string>();

  constructor(schema: any) {
    this.errorList = [];
    this.schema = schema;
  }

  /**
   * Structure
   */
  addToSubSections(subSectionId: string, questionId: string): void {
    if (!this.subSections.has(subSectionId)) {
      this.subSections.set(subSectionId, []);
    }
    const questions = this.subSections.get(subSectionId) ?? [];
    if (!questions.includes(questionId)) {
      this.subSections.get(subSectionId)?.push(questionId);
    }
  }

  /**
   * Subsections
   */
  getSubsectionQuestions(subSectionId: string): Question[] {
    const questionIds = this.subSections.get(subSectionId);
    if (!questionIds) {
      return [];
    }

    return questionIds.map(id => this.questions.get(id)).filter(q => q) as Question[];
  }

  isSubsectionValid(subSectionId: string): boolean {
    return this.subSections.has(subSectionId);
  }

  canUploadFiles(subSectionId: string): boolean {
    return this.allowFileUploads.has(subSectionId);
  }

  /**
   * Calculated fields
   */
  getCalculatedFields(subSectionId: string, payload: { [key: string]: any }) {
    const out: { [key: string]: string } = {};
    const conditionalFields = this.conditions.get(subSectionId);
    if (!conditionalFields) return out;

    for (const [field, conditions] of Object.entries(conditionalFields)) {
      for (const condition of conditions) {
        const cur = payload[condition.id];
        if (cur && (condition.options.includes(cur) || !condition.options.length)) {
          out[field] = Array.isArray(cur) ? cur[0] : cur;
          break;
        }
      }
    }
    return out;
  }

  /**
   * Validations
   */
  public getSubSectionPayloadValidation(subSectionId: string, payload: { [key: string]: any }) {
    const questions = this.getSubsectionQuestions(subSectionId);

    const validation: Joi.PartialSchemaMap = {};
    for (const key of Object.keys(payload)) {
      const question = questions.find(q => q.id === key);
      if (!question) continue;

      // WARNING: big hack due to itemsFromAnswer.
      if ('items' in question && question.items[0] && 'itemsFromAnswer' in question.items[0]) {
        const referencedQuestion = this.questions.get(question.items[0].itemsFromAnswer);
        if (referencedQuestion && 'items' in referencedQuestion) {
          question.items = referencedQuestion.items;
        }
      }

      validation[key] = QuestionValidatorFactory.validate(question);
    }

    return Joi.object(validation).required();
  }

  private validateIdNotRepeated(context: any, path: string, idList: { [key: string]: any }) {
    if (idList[context.id]) {
      this.errorList.push({ message: `${path}.id is repeated`, context: context });
    } else {
      idList[context.id] = context;
    }
  }

  private validateCondition(
    step: InnovationRecordStepType | { condition: Condition },
    path: string,
    idList: { [key: string]: any }
  ) {
    const condition = step.condition;
    if (condition) {
      if (idList[condition.id]) {
        if (['radio-group', 'checkbox-array', 'autocomplete-array'].includes(idList[condition.id].dataType)) {
          const list =
            typeof idList[condition.id].items === 'string'
              ? idList[idList[condition.id].items].items
              : idList[condition.id].items;
          const options: string[] = list.map((l: { [key: string]: any }) => l['id']);

          const wrongOptions = condition.options.filter(o => !options.includes(o));
          if (wrongOptions.length > 0) {
            // the referenced list does not have the option
            this.errorList.push({
              message: `${path}.condition references a wrong option (${wrongOptions})`,
              context: step
            });
          }
        } else {
          // id must be radio-group, checkbox-array or autocomplete-array
          this.errorList.push({
            message: `${path}.condition references non-tipified dataType (${condition.id})`,
            context: step
          });
        }
      } else {
        // id must reference an previous question
        this.errorList.push({
          message: `${path}.condition must reference a previous question (${condition.id})`,
          context: step
        });
      }
    }
  }

  private validateStep(
    subSectionId: string,
    step: InnovationRecordStepType,
    path: string,
    idList: { [key: string]: any }
  ) {
    step.questions?.forEach((question: Question, i: number) => {
      this.validateQuestion(subSectionId, question, `${path}.questions[${i}]`, idList);
    });

    if ('condition' in step) {
      // conditions can only reference ids that appear before on the schema
      this.validateCondition(step, path, idList);
    }
  }

  private validateQuestion(subSectionId: string, question: Question, path: string, idList: { [key: string]: any }) {
    // Done here to make sure since we questions inside questions (e.g., conditional)
    this.addToSubSections(subSectionId, question.id);
    this.questions.set(question.id, question);

    if ('items' in question) {
      const itemIdList: { [key: string]: any } = {};

      question.items.forEach((item: { [key: string]: any }, i: number) => {
        if ('itemsFromAnswer' in item) {
          if (!idList[item['itemsFromAnswer']]) {
            // id must reference a previous question
            this.errorList.push({
              message: `${path}.items must reference a previous question`,
              context: question
            });
          }
        } else {
          // item.id cannot be repeated
          this.validateIdNotRepeated(item, `${path}.items[${i}]`, itemIdList);

          if (typeof item !== 'string' && 'conditional' in item) {
            this.validateQuestion(subSectionId, item['conditional'], `${path}.items[${i}].conditional`, idList);
          }
        }
      });
    }

    // question id cannot be repeated
    this.validateIdNotRepeated(question, path, idList);

    if ('validations' in question && Object.keys(question?.validations ?? {}).length === 0) {
      // at least 1 validation is required
      this.errorList.push({
        message: `${path}.validations if used must have at least 1 validation`,
        context: question
      });
    }

    if ('field' in question) {
      this.validateQuestion(subSectionId, question.field, `${path}.field`, idList);
    }

    if ('addQuestion' in question && question.addQuestion) {
      this.validateQuestion(subSectionId, question.addQuestion, `${path}.addQuestion`, idList);
    }
  }

  private validateRequiredFields() {
    for (const [subSectionId, questions] of requiredSectionsAndQuestions.entries()) {
      const curSchemaQuestions = this.subSections.get(subSectionId);
      if (!curSchemaQuestions) {
        this.errorList.push({ message: `subSections[${subSectionId}] is required`, context: {} });
      } else {
        for (const question of questions) {
          if (!curSchemaQuestions.includes(question)) {
            this.errorList.push({
              message: `subSections[${subSectionId}].question[${question}] is required`,
              context: {}
            });
          }
        }
      }
    }
  }

  public runRules(): { schema: IRSchemaType | null; errors: SchemaValidationError[] } {
    this.errorList = [];

    // Validate structure first with Joi.
    const { value: schema, error } = SchemaValidation.validate(this.schema, { abortEarly: false });
    if (error) {
      error.details.forEach((d: any) => {
        this.errorList.push({
          message: d.message,
          context: d.context.value
        });
      });
    }

    const sectionIdList: { [key: string]: any } = {};
    const subSectionIdList: { [key: string]: any } = {};
    const questionList: { [key: string]: any } = {};

    this.schema.sections?.forEach((section, i: number) => {
      // section id cannot be repeated
      this.validateIdNotRepeated(section, `sections[${i}]`, sectionIdList);

      section.subSections?.forEach((subSection, j: number) => {
        // subSection id cannot be repeated
        this.validateIdNotRepeated(subSection, `sections[${i}].subSections[${j}]`, subSectionIdList);

        subSection.steps?.forEach((step, k: number) => {
          this.validateStep(subSection.id, step, `sections[${i}].subSections[${j}].steps[${k}]`, questionList);
        });

        if (subSection.calculatedFields) {
          Object.entries(subSection.calculatedFields).forEach(([field, conditions]) => {
            conditions.forEach(condition => {
              this.validateCondition(
                { condition },
                `sections[${i}].subSections[${j}].calculatedFields[${field}]`,
                questionList
              );
            });
          });
          this.conditions.set(subSection.id, subSection.calculatedFields);
        }

        if(subSection.hasFiles) {
          this.allowFileUploads.add(subSection.id);
        }
      });
    });

    this.validateRequiredFields();

    // clear the structures when errors occur.
    if (this.errorList.length) {
      this.subSections.clear();
      this.questions.clear();
      this.conditions.clear();
      this.allowFileUploads.clear();
    }

    return { schema, errors: this.errorList };
  }
}
