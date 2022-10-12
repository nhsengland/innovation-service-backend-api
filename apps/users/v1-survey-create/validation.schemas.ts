import * as Joi from 'joi';


// TODO: type this better!
export type BodyType = Record<string, any>;


// TODO: improve this validation!
export const BodySchema = Joi.object<BodyType>()
  .pattern(
    Joi.string().max(50),
    Joi.alternatives(
      Joi.string(),
      Joi.array().items(Joi.string()),
      Joi.number()
    ).allow(null)
  )
  .required();
