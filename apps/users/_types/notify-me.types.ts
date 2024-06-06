import { InnovationSupportStatusEnum } from '@users/shared/enums';
import type { ExcludeEnum } from '@users/shared/types';
import Joi from 'joi';

export type SupportUpdateCreatedDTO = {
  eventType: 'SUPPORT_UPDATED';
  subscriptionType: 'INSTANTLY';
  preConditions: {
    units: string[];
    status: ExcludeEnum<InnovationSupportStatusEnum, InnovationSupportStatusEnum.UNASSIGNED>[];
  };
};
const SupportUpdateCreatedSchema = Joi.object<SupportUpdateCreatedDTO>({
  eventType: Joi.string().valid('SUPPORT_UPDATED').required(),
  subscriptionType: Joi.string().valid('INSTANTLY').default('INSTANTLY'),
  preConditions: Joi.object({
    units: Joi.array().items(Joi.string().uuid()).min(1).required(),
    status: Joi.array()
      .items(
        Joi.string().valid(
          ...Object.values(InnovationSupportStatusEnum).filter(v => v !== InnovationSupportStatusEnum.UNASSIGNED)
        )
      )
      .min(1)
      .required()
  }).required()
}).required();

export type NotifyMeConfig = SupportUpdateCreatedDTO;
export const NotifyMeConfigSchema = Joi.alternatives(SupportUpdateCreatedSchema);
