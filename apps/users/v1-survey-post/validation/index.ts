import Joi = require("joi");

export const SurveyBodySchema = Joi.object()
  .pattern(
    Joi.string().max(50),
    Joi.alternatives(
      Joi.string(),
      Joi.array().items(Joi.string()),
      Joi.number()
    ).allow(null)
  )
  .required();

