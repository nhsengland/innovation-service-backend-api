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

interface QuestionTypeValidator {
  validateQuestionValue: (question: any) => Joi.Schema;
}

export class TextValidator implements QuestionTypeValidator {
  // Not validating postcode or url.
  validateQuestionValue(question: Text): Joi.Schema {
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

export class TextareaValidator implements QuestionTypeValidator {
  validateQuestionValue(question: Textarea): Joi.Schema {
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

export class RadioGroupValidator implements QuestionTypeValidator {
  validateQuestionValue(question: RadioGroup): Joi.Schema {
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

export class AutocompleteArrayValidator implements QuestionTypeValidator {
  validateQuestionValue(question: AutocompleteArray): Joi.Schema {
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

export class CheckboxArrayValidator implements QuestionTypeValidator {
  validateQuestionValue(question: CheckboxArray): Joi.Schema {
    let validation = JoiHelper.AppCustomJoi().stringArray();
    const validItems = [];
    for (const item of question.items) {
      if ('id' in item) {
        validItems.push(item.id);
      }
    }
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

export class FieldGroupValidator implements QuestionTypeValidator {
  validateQuestionValue(question: FieldsGroup): Joi.Schema {
    let validation = Joi.array();
    const obj: { [key: string]: any } = {};
    if (question.field) {
      obj[question.field.id] = QuestionValidatorFactory.create(question.field).validateQuestionValue(
        question.field as any
      );
    }
    if (question.addQuestion) {
      obj[question.addQuestion.id] = QuestionValidatorFactory.create(question.addQuestion).validateQuestionValue(
        question.addQuestion as any
      );
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
  static create(question: Question) {
    switch (question.dataType) {
      case 'text':
        return new TextValidator();
      case 'textarea':
        return new TextareaValidator();
      case 'radio-group':
        return new RadioGroupValidator();
      case 'checkbox-array':
        return new CheckboxArrayValidator();
      case 'autocomplete-array':
        return new AutocompleteArrayValidator();
      case 'fields-group':
        return new FieldGroupValidator();
      default:
        throw new Error('QuestionValidator is not defined');
    }
  }
}
