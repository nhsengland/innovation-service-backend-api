import Joi from 'joi';
import { JoiHelper } from '../../helpers';
import { TEXTAREA_LENGTH_LIMIT } from '../../constants';
import type {
  AutocompleteArray,
  CheckboxArray,
  FieldsGroup,
  Question,
  RadioGroup,
  Textarea,
  Text
} from './question.types';

interface QuestionTypeValidator<T extends Question> {
  validate: (question: T) => Joi.Schema;
}

export class TextValidator implements QuestionTypeValidator<Text> {
  // Not validating postcode or url.
  validate(question: Text): Joi.Schema {
    let validation = Joi.string();
    if (question.validations?.maxLength) {
      validation = validation.max(question.validations.maxLength);
    }
    if (question.validations?.isRequired) {
      validation = validation.required();
    }
    return validation;
  }
}

export class TextareaValidator implements QuestionTypeValidator<Textarea> {
  validate(question: Textarea): Joi.Schema {
    let validation = Joi.string();
    if (question.lengthLimit) {
      validation = validation.max(TEXTAREA_LENGTH_LIMIT[question.lengthLimit]);
    }
    if (question.validations?.isRequired) {
      validation = validation.required();
    }
    return validation;
  }
}

export class RadioGroupValidator implements QuestionTypeValidator<RadioGroup> {
  validate(question: RadioGroup): Joi.Schema {
    let validation = Joi.string();
    const validItems = [];
    for (const item of question.items) {
      if ('id' in item) {
        validItems.push(item.id);
      }
    }
    if (validItems.length) {
      validation = validation.valid(...validItems);
    }
    if (question.validations?.isRequired) {
      validation = validation.required();
    }
    return validation;
  }
}

export class AutocompleteArrayValidator implements QuestionTypeValidator<AutocompleteArray> {
  validate(question: AutocompleteArray): Joi.Schema {
    let validation = JoiHelper.AppCustomJoi().stringArray();
    const validItems = question.items.map(i => i.id);
    if (validItems.length) {
      validation = validation.items(Joi.string().valid(...validItems));
    }
    if (question.validations?.max) {
      validation = validation.max(question.validations.max.length);
    }
    if (question.validations?.min) {
      validation = validation.min(question.validations.min.length);
    }
    if (question.validations?.isRequired) {
      validation = validation.required();
    }
    return validation;
  }
}

export class CheckboxArrayValidator implements QuestionTypeValidator<CheckboxArray> {
  validate(question: CheckboxArray): Joi.Schema {
    const validItems = [];
    for (const item of question.items) {
      if ('id' in item) {
        validItems.push(item.id);
      }
    }

    // This means its an array of objects (e.g., standards)
    if(question.addQuestion) {
      const objectTypeSchema = Joi.object({
        [question.checkboxAnswerId ?? question.id]: Joi.string().valid(...validItems),
        // "Optional" added due to the nature of this type of question and save per question. The question is just answered after the selection of the checkbox.
        [question.addQuestion.id]: QuestionValidatorFactory.validate(question.addQuestion).optional()
      });
      return Joi.array().items(objectTypeSchema).min(1);
    }

    let checkboxValidation = JoiHelper.AppCustomJoi().stringArray();
    if (validItems.length) {
      checkboxValidation = checkboxValidation.items(Joi.string().valid(...validItems));
    }
    if (question.validations?.max) {
      checkboxValidation = checkboxValidation.max(question.validations.max.length);
    }
    if (question.validations?.min) {
      checkboxValidation = checkboxValidation.min(question.validations.min.length);
    }
    if (question.validations?.isRequired) {
      checkboxValidation = checkboxValidation.required();
    }

    return checkboxValidation;
  }
}

export class FieldGroupValidator implements QuestionTypeValidator<FieldsGroup> {
  validate(question: FieldsGroup): Joi.Schema {
    // When addQuestion is not defined the payload is a string array.
    if (!question.addQuestion) {
      return JoiHelper.AppCustomJoi().stringArray().items(Joi.string()).required();
    }

    let validation = Joi.array();
    const obj: { [key: string]: any } = {};
    if (question.field) {
      obj[question.field.id] = QuestionValidatorFactory.validate(question.field);
    }
    if (question.addQuestion) {
      obj[question.addQuestion.id] = QuestionValidatorFactory.validate(question.addQuestion);
    }
    if (Object.keys(obj).length) {
      validation = validation.items(Joi.object(obj));
    }
    // Add min validation
    if (question.validations?.isRequired) {
      validation = validation.required();
    }
    return validation;
  }
}

export class QuestionValidatorFactory {
  static validate(question: Question) {
    switch (question.dataType) {
      case 'text':
        return new TextValidator().validate(question);
      case 'textarea':
        return new TextareaValidator().validate(question);
      case 'radio-group':
        return new RadioGroupValidator().validate(question);
      case 'checkbox-array':
        return new CheckboxArrayValidator().validate(question);
      case 'autocomplete-array':
        return new AutocompleteArrayValidator().validate(question);
      case 'fields-group':
        return new FieldGroupValidator().validate(question);
      default:
        throw new Error('QuestionValidator is not defined');
    }
  }
}
