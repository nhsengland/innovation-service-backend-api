import Joi from 'joi';

export type ResponseDTO = {
  id: string;
  units: string[];
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  id: Joi.string().uuid().description('The organisation id.').required(),
  units: Joi.array()
    .items(Joi.string())
    .description('Ids of the organisation units belonging to the organisation.')
    .required()
});
