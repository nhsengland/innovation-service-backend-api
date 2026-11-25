import { InnovationStatusEnum } from '@innovations/shared/enums';
import Joi from 'joi';

export type ResponseDTO = {
  id: string;
  status: InnovationStatusEnum;
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  id: Joi.string().uuid().required(),
  status: Joi.string()
    .valid(...Object.values(InnovationStatusEnum))
    .required()
});
