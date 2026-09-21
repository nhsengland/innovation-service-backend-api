import Joi from 'joi';

export type ResponseDTO = {
  organisation: { id: string; name: string };
  champions: { name: string; email: string }[];
  seniorSponsors: { name: string; email: string }[];
}[];

export const ResponseBodySchema = Joi.array().items(
  Joi.object({
    organisation: Joi.object({
      id: Joi.string().guid().required(),
      name: Joi.string().required()
    }).required(),
    champions: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().required(),
          email: Joi.string().email().required()
        })
      )
      .required(),
    seniorSponsors: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().required(),
          email: Joi.string().email().required()
        })
      )
      .required()
  })
);
