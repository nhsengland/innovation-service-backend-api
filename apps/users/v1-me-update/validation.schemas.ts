import Joi from 'joi';

import { ORGANISATIONS_LENGTH_LIMITS } from '@users/shared/constants';
import { PhoneUserPreferenceEnum } from '@users/shared/enums';
import type { HowDidYouFindUsAnswersType } from '@users/shared/entities/user/user.entity';
import { JoiHelper } from '@users/shared/helpers';

export type DefaultUserBodyType = {
  displayName: string;
};

export const DefaultUserBodySchema = Joi.object<DefaultUserBodyType>({
  displayName: JoiHelper.AppCustomJoi().string().required()
}).required();

export type InnovatorBodyType = {
  displayName: string;
  contactByEmail: boolean;
  contactByPhone: boolean;
  contactDetails: string | null;
  contactByPhoneTimeframe: PhoneUserPreferenceEnum | null;
  mobilePhone?: null | string;
  organisation: {
    id: string;
    isShadow: boolean;
    name?: null | string;
    size?: null | string;
    description?: null | string;
    registrationNumber?: null | string;
  };
  howDidYouFindUsAnswers: HowDidYouFindUsAnswersType;
};

export const InnovatorBodySchema = Joi.object<InnovatorBodyType>({
  displayName: JoiHelper.AppCustomJoi().string().required(),
  mobilePhone: JoiHelper.AppCustomJoi().string().max(20).optional().allow(null),
  contactByEmail: Joi.boolean().optional(),
  contactByPhone: Joi.boolean().optional(),
  contactByPhoneTimeframe: Joi.valid(...Object.values(PhoneUserPreferenceEnum))
    .optional()
    .allow(null),
  contactDetails: JoiHelper.AppCustomJoi().string().allow(null),
  organisation: Joi.object<InnovatorBodyType['organisation']>({
    id: JoiHelper.AppCustomJoi().string().guid().required(),
    isShadow: Joi.boolean().strict().required(),
    name: Joi.alternatives().conditional('isShadow', {
      is: false,
      then: JoiHelper.AppCustomJoi().string().max(ORGANISATIONS_LENGTH_LIMITS.name).required(),
      otherwise: JoiHelper.AppCustomJoi().string().optional().allow(null)
    }),
    size: Joi.alternatives().conditional('isShadow', {
      is: false,
      then: JoiHelper.AppCustomJoi().string().max(ORGANISATIONS_LENGTH_LIMITS.size).required(),
      otherwise: JoiHelper.AppCustomJoi().string().optional().allow(null)
    }),
    description: Joi.alternatives().conditional('isShadow', {
      is: false,
      then: JoiHelper.AppCustomJoi().string().max(ORGANISATIONS_LENGTH_LIMITS.description).required(),
      otherwise: JoiHelper.AppCustomJoi().string().optional().allow(null)
    }),
    registrationNumber: JoiHelper.AppCustomJoi()
      .string()
      .max(ORGANISATIONS_LENGTH_LIMITS.registrationNumber)
      .optional()
      .allow(null)
  }).required(),
  howDidYouFindUsAnswers: Joi.object<HowDidYouFindUsAnswersType>({
    event: Joi.boolean().optional(),
    eventComment: JoiHelper.AppCustomJoi().string().optional(),
    reading: Joi.boolean().optional(),
    readingComment: JoiHelper.AppCustomJoi().string().optional(),
    recommendationColleague: Joi.boolean().optional(),
    recommendationOrg: Joi.boolean().optional(),
    recommendationOrgComment: JoiHelper.AppCustomJoi().string().optional(),
    searchEngine: Joi.boolean().optional(),
    socialMedia: Joi.boolean().optional(),
    other: Joi.boolean().optional(),
    otherComment: JoiHelper.AppCustomJoi().string().optional()
  }).required()
}).required();
