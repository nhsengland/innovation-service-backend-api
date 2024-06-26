import Joi from 'joi';
import type { IRSchemaType } from './schema.model';

/**
 * TODO: See if I can simplify this
 */
const StringSchema = Joi.string().max(100);
const id = Joi.string().regex(/^[_a-zA-Z][_a-zA-Z0-9]*$/);
const isRequired = Joi.alternatives(Joi.boolean().valid(true), StringSchema);
const postcodeFormat = Joi.alternatives(Joi.boolean().valid(true), StringSchema);
const urlFormat = Joi.alternatives(Joi.boolean().valid(true), StringSchema);
const max = Joi.object({ length: Joi.number().integer().min(1), errorMessage: StringSchema });
const min = Joi.object({ length: Joi.number().integer().min(1), errorMessage: StringSchema });
const maxLength = Joi.number().integer().min(1);
const condition = Joi.object({ id: StringSchema.required(), options: Joi.array().items(StringSchema).required() });

const textLimit = Joi.string().valid('xs');
const textAreaLimit = Joi.string().valid('xs', 's', 'm', 'l', 'xl', 'xxl');

const text = Joi.object({
  id,
  dataType: Joi.string().valid('text').required(),
  label: Joi.string().min(1).required(),
  description: Joi.string().min(1).optional(),
  validations: Joi.object({ isRequired, maxLength, postcodeFormat, urlFormat }),
  lengthLimit: textLimit
});

const textArea = Joi.object({
  dataType: Joi.string().valid('textarea').required(),
  id,
  label: Joi.string().min(1).required(),
  description: Joi.string().min(1).optional(),
  validations: Joi.object({ isRequired, maxLength }),
  lengthLimit: textAreaLimit
});

const radioGroup = Joi.object({
  dataType: Joi.string().valid('radio-group').required(),
  id,
  label: Joi.string().min(1).required(),
  description: Joi.string().min(1).optional(),
  validations: Joi.object({ isRequired }),
  items: Joi.array()
    .items(
      Joi.object({ type: 'separator' }),
      Joi.object({ itemsFromAnswer: StringSchema.required() }),
      Joi.object({
        id,
        label: Joi.string().min(1),
        conditional: Joi.alternatives(text, textArea).optional()
      })
    )
    .required()
});

const autocompleteArray = Joi.object({
  dataType: Joi.string().valid('autocomplete-array').required(),
  id,
  label: Joi.string().min(1).required(),
  description: Joi.string().min(1).optional(),
  validations: Joi.object({ isRequired, max, min }),
  items: Joi.array()
    .items(
      Joi.object({
        id,
        label: Joi.string().min(1)
      })
    )
    .required()
});

const checkboxArray = Joi.object({
  dataType: Joi.string().valid('checkbox-array').required(),
  id,
  label: Joi.string().min(1).required(),
  description: Joi.string().min(1).optional(),
  validations: Joi.object({ isRequired, max, min }),
  items: Joi.array()
    .items(
      Joi.object({ type: 'separator' }),
      Joi.object({
        id,
        label: Joi.string().min(1),
        group: Joi.string().min(1).optional(),
        exclusive: Joi.bool().valid(true),
        conditional: Joi.alternatives(text, textArea).optional()
      })
    )
    .required(),
  addQuestion: Joi.alternatives(text, textArea, radioGroup)
});

const fieldsGroup = Joi.object({
  dataType: Joi.string().valid('fields-group').required(),
  id,
  label: Joi.string().min(1).required(),
  description: Joi.string().min(1).optional(),
  validations: Joi.object({ isRequired, max }),
  addNewLabel: Joi.string().min(1),
  field: text.required(),
  addQuestion: Joi.alternatives(text, textArea).optional()
});

const questions = Joi.array().items(text, textArea, radioGroup, autocompleteArray, checkboxArray, fieldsGroup);

const subSection = Joi.object({
  id,
  title: Joi.string().min(1).required(),
  steps: Joi.array().items(Joi.object({ questions: questions, condition: condition.optional() }))
});

const section = Joi.object({
  id,
  title: Joi.string().min(1).required(),
  subSections: Joi.array().items(subSection)
});

export const SchemaValidation = Joi.object<IRSchemaType>({
  sections: Joi.array().items(section).min(1).required()
});
