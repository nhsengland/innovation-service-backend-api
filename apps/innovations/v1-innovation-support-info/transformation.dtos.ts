import { InnovationSupportStatusEnum } from '@innovations/shared/enums';
import Joi from 'joi';

export type ResponseDTO = {
  id: string;
  status: InnovationSupportStatusEnum;
  engagingAccessors: { id: string; userRoleId: string; name: string }[];
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  id: Joi.string().uuid().required(),
  status: Joi.string().valid(...Object.values(InnovationSupportStatusEnum)),
  engagingAccessors: Joi.array().items(
    Joi.object({
      id: Joi.string().uuid().required(),
      userRoleId: Joi.string().uuid().required(),
      name: Joi.string().required()
    })
  )
});
