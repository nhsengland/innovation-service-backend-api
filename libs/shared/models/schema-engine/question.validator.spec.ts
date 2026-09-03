import type Joi from 'joi';
import { QuestionValidatorFactory } from './question.validator';

const standardsQuestion: any = {
  id: 'standards',
  dataType: 'checkbox-array',
  label: 'Standards',
  checkboxAnswerId: 'type',
  items: [{ id: 'UK_MDR_CLASS_I', label: 'UK MDR Class I' }],
  addQuestions: [
    {
      id: 'hasMet',
      dataType: 'radio-group',
      label: 'Has certification',
      items: [
        { id: 'YES', label: 'Yes' },
        { id: 'IN_PROGRESS', label: 'In progress' },
        { id: 'NOT_YET', label: 'Not yet' }
      ]
    },
    {
      id: 'certifications',
      dataType: 'input-array',
      label: 'Certifications',
      items: [
        {
          id: 'GMDN',
          label: 'GMDN',
          validations: { equalToLength: { length: 5, errorMessage: 'Must be 5 characters long' } },
          itemConditionOptions: {
            mandatoryIf: {
              groupLogic: 'AND',
              conditions: [
                { id: 'hasMet', list: ['YES'], relation: 'sibling' },
                { id: 'standards', list: ['UK_MDR_CLASS_I'], relation: 'parent' }
              ]
            }
          }
        }
      ]
    }
  ]
};

const validate = (data: unknown): Joi.ValidationResult<unknown> =>
  QuestionValidatorFactory.validate(standardsQuestion).validate(data);

const requiredInputArrayQuestion: any = {
  id: 'certifications',
  dataType: 'input-array',
  label: 'Certifications',
  items: [{ id: 'GMDN', label: 'GMDN', validations: { isRequired: true } }]
};

const boundedInputArrayQuestion: any = {
  id: 'certifications',
  dataType: 'input-array',
  label: 'Certifications',
  items: [{ id: 'GMDN', label: 'GMDN', validations: { min: { length: 3 }, max: { length: 5 } } }]
};

describe('QuestionValidatorFactory input-array rules', () => {
  it('requires a certification when hasMet is YES', () => {
    expect(validate([{ type: 'UK_MDR_CLASS_I', hasMet: 'YES', certifications: {} }])).toMatchObject({
      error: expect.anything()
    });
  });

  it('enforces equalToLength', () => {
    expect(validate([{ type: 'UK_MDR_CLASS_I', hasMet: 'YES', certifications: { GMDN: '1234' } }])).toMatchObject({
      error: expect.anything()
    });
  });

  it('allows a missing certification when hasMet is IN_PROGRESS', () => {
    expect(validate([{ type: 'UK_MDR_CLASS_I', hasMet: 'IN_PROGRESS', certifications: {} }])).toEqual({
      value: [{ type: 'UK_MDR_CLASS_I', hasMet: 'IN_PROGRESS', certifications: {} }]
    });
  });

  it('accepts a valid GMDN value', () => {
    expect(validate([{ type: 'UK_MDR_CLASS_I', hasMet: 'YES', certifications: { GMDN: '12345' } }])).toEqual({
      value: [{ type: 'UK_MDR_CLASS_I', hasMet: 'YES', certifications: { GMDN: '12345' } }]
    });
  });

  it('rejects null for a required input-array item', () => {
    expect(QuestionValidatorFactory.validate(requiredInputArrayQuestion).validate({ GMDN: null })).toMatchObject({
      error: expect.anything()
    });
  });

  it('allows null for an optional input-array item', () => {
    expect(QuestionValidatorFactory.validate(boundedInputArrayQuestion).validate({ GMDN: null })).toEqual({
      value: { GMDN: null }
    });
  });

  it('enforces minimum and maximum lengths for input-array items', () => {
    const validateBounded = (value: string): Joi.ValidationResult<unknown> =>
      QuestionValidatorFactory.validate(boundedInputArrayQuestion).validate({ GMDN: value });

    expect(validateBounded('12')).toMatchObject({ error: expect.anything() });
    expect(validateBounded('123456')).toMatchObject({ error: expect.anything() });
    expect(validateBounded('12345')).toEqual({ value: { GMDN: '12345' } });
  });
});
