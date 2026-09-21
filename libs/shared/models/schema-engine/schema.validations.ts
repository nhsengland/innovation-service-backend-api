import Joi from 'joi';
import type { IRSchemaType } from './schema.model';
import { JoiHelper } from '../../helpers/joi.helper';

/**
 * TODO: See if I can simplify this
 */
const StringSchema = JoiHelper.AppCustomJoi().string().max(100);
const id = JoiHelper.AppCustomJoi().string().max(250).required();
const isRequired = Joi.alternatives(Joi.boolean().valid(true), StringSchema);
const postcodeFormat = Joi.alternatives(Joi.boolean().valid(true), StringSchema);
const urlFormat = Joi.object({ message: StringSchema, maxLength: Joi.number().integer() });
const max = Joi.object({ length: Joi.number().integer().min(1), errorMessage: StringSchema });
const min = Joi.object({ length: Joi.number().integer().min(1), errorMessage: StringSchema });
const maxLength = Joi.number().integer().min(1);
const condition = Joi.object({ id: StringSchema.required(), options: Joi.array().items(StringSchema).required() });

const textLimit = JoiHelper.AppCustomJoi().string().valid('xs');
const textAreaLimit = JoiHelper.AppCustomJoi().string().valid('xs', 's', 'm', 'l', 'xl', 'xxl');

const text = Joi.object({
  id,
  dataType: JoiHelper.AppCustomJoi().string().valid('text').required(),
  label: JoiHelper.AppCustomJoi().string().min(1).required(),
  description: JoiHelper.AppCustomJoi().string().min(1).optional(),
  validations: Joi.object({ isRequired, maxLength, postcodeFormat, urlFormat }),
  lengthLimit: textLimit
});

const textArea = Joi.object({
  dataType: JoiHelper.AppCustomJoi().string().valid('textarea').required(),
  id,
  label: JoiHelper.AppCustomJoi().string().min(1).required(),
  description: JoiHelper.AppCustomJoi().string().min(1).optional(),
  validations: Joi.object({ isRequired, maxLength }),
  lengthLimit: textAreaLimit
});

const radioGroup = Joi.object({
  dataType: JoiHelper.AppCustomJoi().string().valid('radio-group').required(),
  id,
  label: JoiHelper.AppCustomJoi().string().min(1).required(),
  description: JoiHelper.AppCustomJoi().string().min(1).optional(),
  validations: Joi.object({ isRequired }),
  items: Joi.array()
    .items(
      Joi.object({ type: 'separator' }),
      Joi.object({ itemsFromAnswer: StringSchema.required() }),
      Joi.object({
        id,
        label: JoiHelper.AppCustomJoi().string().min(1),
        conditional: Joi.alternatives(text, textArea).optional()
      })
    )
    .required()
});

const autocompleteArray = Joi.object({
  dataType: JoiHelper.AppCustomJoi().string().valid('autocomplete-array').required(),
  id,
  label: JoiHelper.AppCustomJoi().string().min(1).required(),
  description: JoiHelper.AppCustomJoi().string().min(1).optional(),
  validations: Joi.object({ isRequired, max, min }),
  items: Joi.array()
    .items(
      Joi.object({
        id,
        label: JoiHelper.AppCustomJoi().string().min(1)
      })
    )
    .required()
});

const checkboxArray = Joi.object({
  dataType: JoiHelper.AppCustomJoi().string().valid('checkbox-array').required(),
  id,
  label: JoiHelper.AppCustomJoi().string().min(1).required(),
  description: JoiHelper.AppCustomJoi().string().min(1).optional(),
  validations: Joi.object({ isRequired, max, min }),
  checkboxAnswerId: id.optional(),
  items: Joi.array()
    .items(
      Joi.object({ type: 'separator' }),
      Joi.object({
        id,
        label: JoiHelper.AppCustomJoi().string().min(1),
        group: JoiHelper.AppCustomJoi().string().min(1).optional(),
        exclusive: Joi.bool().valid(true),
        conditional: Joi.alternatives(text, textArea).optional()
      })
    )
    .required(),
  addQuestion: Joi.alternatives(text, textArea, radioGroup)
});

const fieldsGroup = Joi.object({
  dataType: JoiHelper.AppCustomJoi().string().valid('fields-group').required(),
  id,
  label: JoiHelper.AppCustomJoi().string().min(1).required(),
  description: JoiHelper.AppCustomJoi().string().min(1).optional(),
  validations: Joi.object({ isRequired, max }),
  addNewLabel: JoiHelper.AppCustomJoi().string().min(1),
  field: text.required(),
  addQuestion: Joi.alternatives(text, textArea).optional()
});

const questions = Joi.array().items(text, textArea, radioGroup, autocompleteArray, checkboxArray, fieldsGroup);

const subSection = Joi.object({
  id,
  title: JoiHelper.AppCustomJoi().string().min(1).required(),
  steps: Joi.array().items(Joi.object({ questions: questions, condition: condition.optional() })),
  calculatedFields: Joi.object(),
  hasFiles: Joi.boolean()
});

const section = Joi.object({
  id,
  title: JoiHelper.AppCustomJoi().string().min(1).required(),
  subSections: Joi.array().items(subSection)
});

export const SchemaValidation = Joi.object<IRSchemaType>({
  sections: Joi.array().items(section).min(1).required()
});
