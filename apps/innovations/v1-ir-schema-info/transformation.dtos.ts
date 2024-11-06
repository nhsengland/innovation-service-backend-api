import type { IRSchemaType } from '@innovations/shared/models';
import Joi from 'joi';

export type ResponseDTO = { version: number; schema: IRSchemaType };

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  version: Joi.number().integer().required(),
  schema: Joi.object<IRSchemaType>().required()
});
