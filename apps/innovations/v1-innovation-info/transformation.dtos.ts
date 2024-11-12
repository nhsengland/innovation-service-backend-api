import {
  InnovationGroupedStatusEnum,
  InnovationStatusEnum,
  InnovationSupportStatusEnum,
  PhoneUserPreferenceEnum
} from '@innovations/shared/enums';
import { JoiHelper } from '@innovations/shared/helpers';
import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import Joi from 'joi';

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  id: JoiHelper.AppCustomJoi().string().uuid().required(),
  name: Joi.string().required(),
  description: Joi.string().allow(null).required(),
  version: Joi.string().required(),
  status: Joi.string()
    .valid(...Object.values(InnovationStatusEnum))
    .required(),
  groupedStatus: Joi.string()
    .valid(...Object.values(InnovationGroupedStatusEnum))
    .required(),
  hasBeenAssessed: Joi.boolean().required(),
  statusUpdatedAt: Joi.date().required(),
  submittedAt: Joi.date().allow(null).required(),
  countryName: Joi.string().allow(null).required(),
  postCode: Joi.string().allow(null).required(),
  categories: Joi.array()
    .items(Joi.string().valid(...Object.values(CurrentCatalogTypes.catalogCategory)))
    .required(),
  otherCategoryDescription: Joi.string().allow(null).required(),
  owner: Joi.object({
    id: Joi.string().uuid().required(),
    name: Joi.string().required(),
    isActive: Joi.boolean().required(),
    email: Joi.string().optional(),
    contactByEmail: Joi.boolean().optional(),
    contactByPhone: Joi.boolean().optional(),
    contactByPhoneTimeFrame: Joi.string()
      .valid(...Object.values(PhoneUserPreferenceEnum))
      .allow(null)
      .required(),
    mobilePhone: Joi.string().allow(null).optional(),
    lastLoginAt: Joi.date().allow(null).optional(),
    organisation: Joi.object({
      name: Joi.string().required(),
      size: Joi.string().allow(null).required(),
      registrationNumber: Joi.string().allow(null).required()
    }).optional()
  }).optional(),
  daysSinceNoActiveSupport: Joi.number(),
  assessment: Joi.object({
    id: Joi.string().uuid().required(),
    createdAt: Joi.date().required(),
    finishedAt: Joi.date().allow(null).required(),
    assignedTo: Joi.object({
      id: Joi.string().uuid().required(),
      name: Joi.string().required(),
      userRoleId: Joi.string().required()
    }).optional()
  }).optional(),
  supports: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().uuid().required(),
        status: Joi.string().valid(...Object.values(InnovationSupportStatusEnum)),
        organisationUnitId: Joi.string().required()
      })
    )
    .allow(null)
    .optional(),
  collaboratorId: Joi.string().required(),
  createdAt: Joi.date().required()
});

export type ResponseDTO = {
  id: string;
  name: string;
  description: null | string;
  version: string;
  status: InnovationStatusEnum;
  groupedStatus: InnovationGroupedStatusEnum;
  hasBeenAssessed: boolean;
  statusUpdatedAt: Date;
  submittedAt: null | Date;
  countryName: null | string;
  postCode: null | string;
  categories: CurrentCatalogTypes.catalogCategory[];
  otherCategoryDescription: null | string;
  owner?: {
    id: string;
    name: string;
    isActive: boolean;
    email?: string;
    contactByEmail?: boolean;
    contactByPhone?: boolean;
    contactByPhoneTimeframe?: PhoneUserPreferenceEnum | null;
    mobilePhone?: null | string;
    lastLoginAt?: null | Date;
    organisation?: { name: string; size: null | string; registrationNumber: null | string };
  };
  daysSinceNoActiveSupport?: number;
  assessment?: null | {
    id: string;
    createdAt: Date;
    finishedAt: null | Date;
    assignedTo?: { id: string; name: string; userRoleId: string };
  };
  supports?: null | { id: string; status: InnovationSupportStatusEnum; organisationUnitId: string }[];
  collaboratorId?: string;
  createdAt: Date;
};
