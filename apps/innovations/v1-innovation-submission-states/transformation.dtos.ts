import Joi from 'joi';

export type ResponseDTO = {
  submittedAllSections: boolean;
  submittedForNeedsAssessment: boolean;
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  submittedAllSections: Joi.boolean().required(),
  submittedForNeedsAssessment: Joi.boolean().required()
});
