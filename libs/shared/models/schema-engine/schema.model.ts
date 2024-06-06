import type { Question } from './question.types';
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
  questions: Question[];
};

export type SchemaValidationError = {
  message: string;
  context: any;
};

export class SchemaModel {
  private schema: IRSchemaType;
  private errorList: SchemaValidationError[];

  constructor(schema: any) {
    this.errorList = [];
    this.schema = schema;
  }

  private validateIdNotRepeated(context: any, path: string, idList: { [key: string]: any }) {
    if (idList[context.id]) {
      this.errorList.push({
        message: `${path}.id is repeated`,
        context: context
      });
    } else {
      idList[context.id] = context;
    }
  }

  private validateCondition(question: Question, path: string, idList: { [key: string]: any}) {
    const condition = question.condition;
    if(condition) {
        if (idList[condition.id]) {
          if (['radio-group', 'checkbox-array', 'autocomplete-array'].includes(idList[condition.id].dataType)) {
            const list = typeof idList[condition.id].items === 'string' ? idList[idList[condition.id].items].items : idList[condition.id].items;
            const options: string[] = list.map((l: { [key: string]: any }) => l['id']);

            const wrongOptions = condition.options.filter(o => !options.includes(o));
            if(wrongOptions.length > 0) {
              // the referenced list does not have the option
              this.errorList.push({
                message: `${path}.condition references a wrong option (${wrongOptions})`,
                context: question
              });
          }
          } else {
            // id must be radio-group, checkbox-array or autocomplete-array
            this.errorList.push({
              message: `${path}.condition references non-tipified dataType (${condition.id})`,
              context: question
            });
          }
        } else {
          // id must reference an previous question
          this.errorList.push({
            message: `${path}.condition must reference a previous question (${condition.id})`,
            context: question
          });
        }
    }
  }

  private validateQuestion(question: any, path: string, idList: { [key: string]: any }) {
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
            this.validateQuestion(item['conditional'], `${path}.items[${i}].conditional`, idList);
          }
        }
      });
    }

    if ('condition' in question) {
      // conditions can only reference ids that appear before on the schema
      this.validateCondition(question, path, idList);
    }

    // question id cannot be repeated
    this.validateIdNotRepeated(question, path, idList);

    if ('validations' in question && Object.keys(question.validations).length === 0) {
      // at least 1 validation is required
      this.errorList.push({
        message: `${path}.validations if used must have at least 1 validation`,
        context: question
      });
    }

    if ('field' in question) {
      this.validateQuestion(question.field, `${path}.field`, idList);
    }

    if ('addQuestion' in question) {
      this.validateQuestion(question.addQuestion, `${path}.addQuestion`, idList);
    }
  }

  public validate(): { schema: IRSchemaType | null; errors: SchemaValidationError[] } {
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

    this.schema.sections?.forEach((section: any, i: number) => {
      // section id cannot be repeated
      this.validateIdNotRepeated(section, `sections[${i}]`, sectionIdList);

      section.subSections?.forEach((subSection: any, j: number) => {
        // subSection id cannot be repeated
        this.validateIdNotRepeated(subSection, `sections[${i}].subSections[${j}]`, subSectionIdList);

        subSection.questions?.forEach((question: any, k: number) => {
          this.validateQuestion(question, `sections[${i}].subSections[${j}].questions[${k}]`, questionList);
        });
      });
    });

    return { schema, errors: this.errorList };
  }
}
