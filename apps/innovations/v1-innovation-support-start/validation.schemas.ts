import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { InnovationSupportStatusEnum } from '@innovations/shared/enums';
import { InnovationFileSchema, type InnovationFileType } from '../_types/innovation.types';
import { JoiHelper } from '@innovations/shared/helpers';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type BodyType = {
  status: Exclude<InnovationSupportStatusEnum, 'UNASSIGNED'>;
  message: string;
  file?: InnovationFileType;
  accessors?: { id: string; userRoleId: string }[];
};
export const BodySchema = Joi.object<BodyType>({
  status: JoiHelper.AppCustomJoi()
    .string()
    .valid(
      InnovationSupportStatusEnum.ENGAGING,
      InnovationSupportStatusEnum.WAITING,
      InnovationSupportStatusEnum.UNSUITABLE
    )
    .required(),
  message: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.xxl).required(),
  file: InnovationFileSchema,
  accessors: Joi.when('status', {
    is: [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.WAITING],
    then: Joi.array()
      .items(
        Joi.object({
          id: JoiHelper.AppCustomJoi().string().guid().required(),
          userRoleId: JoiHelper.AppCustomJoi().string().guid().required()
        })
      )
      .required(),
    otherwise: Joi.forbidden()
  })
}).required();
